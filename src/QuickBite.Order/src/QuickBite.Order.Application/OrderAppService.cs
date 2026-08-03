using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Enums;
using Volo.Abp;
using Volo.Abp.Authorization;
using Volo.Abp.Domain.Entities;
using QuickBite.Order.Domain.Orders.Managers;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Orders.ValueObjects;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using QuickBite.Order.Extensions;
using QuickBite.Order.Domain.Shared.Event;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

using OrderEntity = QuickBite.Order.Domain.Orders.AggregateRoots.Order;
namespace QuickBite.Order.Orders;

public class OrderAppService :
    ApplicationService,
    IOrderAppService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IOrderManager _orderManager;
    private readonly IRepository<FoodItem, Guid> _foodItemRepository;

    public OrderAppService(
        IOrderRepository orderRepository,
        IOrderManager orderManager,
        IRepository<FoodItem, Guid> foodItemRepository)
    {
        _orderRepository = orderRepository;
        _orderManager = orderManager;
        _foodItemRepository = foodItemRepository;
    }

    /// <summary>
    /// Creates a new order.
    /// </summary>
    public async Task<OrderDto> CreateAsync(CreateOrderDto input)
    {
        // 1. Initialize the delivery address value object.
        var deliveryAddress = new DeliveryAddress(
            input.DeliveryAddress.ReceiverName,
            input.DeliveryAddress.PhoneNumber,
            input.DeliveryAddress.AddressLine,
            input.DeliveryAddress.Ward,
            input.DeliveryAddress.District,
            input.DeliveryAddress.Province,
            input.DeliveryAddress.Note ?? string.Empty
        );

        // 2. Fetch food item details from the replica repository.
        var foodIds = input.Items.Select(x => x.FoodItemId).Distinct().ToList();
        var foodInfoDict = await GetFoodInfosAsync(foodIds);

        // 3. Process each selected order item, validating options and calculating prices.
        var orderItems = new List<OrderItem>();
        foreach (var item in input.Items)
        {
            if (!foodInfoDict.TryGetValue(item.FoodItemId, out var foodInfo))
            {
                // Throw EntityNotFoundException if the food item replica does not exist.
                throw new EntityNotFoundException(typeof(FoodItem), item.FoodItemId);
            }

            decimal finalPrice = foodInfo.CalculatePrice(item.SelectedVariantName, item.SelectedToppings);
            var selectedToppingsJson = JsonSerializer.Serialize(item.SelectedToppings ?? new List<string>());

            orderItems.Add(new OrderItem(
                GuidGenerator.Create(),
                item.FoodItemId.ToString(),
                foodInfo.Name,
                item.Quantity,
                finalPrice,
                item.SelectedVariantName,
                selectedToppingsJson));
        }

        // 4. Delegate the order creation process to the Domain Manager.
        var order = await _orderManager.CreateAsync(
            input.CustomerId,
            input.RestaurantId,
            deliveryAddress,
            orderItems);

        // 5. Insert the order aggregate root into database and save.
        await _orderRepository.InsertAsync(order, autoSave: true);

        // 6. Map the domain aggregate root to the response DTO.
        return ObjectMapper.Map<OrderEntity, OrderDto>(order);
    }

    /// <summary>
    /// Retrieves a specific order by ID, dynamically computing pricing if the order is still pending.
    /// </summary>
    public async Task<OrderDto> GetAsync(Guid id)
    {
        var orderQuery = await _orderRepository.GetQueryableAsync();
        var foodQuery = await _foodItemRepository.GetQueryableAsync();

        // Perform EF Core LEFT JOIN to fetch OrderItems along with FoodItems in a single query database call.
        var query = from o in orderQuery
                    where o.Id == id
                    select new
                    {
                        Order = o,
                        ItemsWithFood = from oi in o.OrderItems
                                        join fi in foodQuery on oi.Sku equals fi.Id.ToString() into fiJoin
                                        from fi in fiJoin.DefaultIfEmpty() // LEFT JOIN
                                        select new { OrderItem = oi, FoodItem = fi }
                    };

        var result = await AsyncExecuter.FirstOrDefaultAsync(query);
        if (result == null)
        {
            // Throw EntityNotFoundException if the order doesn't exist.
            throw new EntityNotFoundException(typeof(OrderEntity), id);
        }

        // Map the main order properties.
        var orderDto = ObjectMapper.Map<OrderEntity, OrderDto>(result.Order);
        
        // Populate and calculate final values for the DTO items.
        orderDto.Items = result.ItemsWithFood.Select(x => 
        {
            // Only update prices with the latest catalog values if the order status is still Pending.
            bool useLatestData = result.Order.Status == OrderStatus.Pending;
            
            decimal finalUnitPrice = x.OrderItem.UnitPrice;
            
            if (useLatestData && x.FoodItem != null)
            {
                var selectedToppingsList = string.IsNullOrEmpty(x.OrderItem.SelectedToppings) 
                    ? new List<string>() 
                    : JsonSerializer.Deserialize<List<string>>(x.OrderItem.SelectedToppings) ?? new List<string>();
                finalUnitPrice = x.FoodItem.CalculatePrice(x.OrderItem.SelectedVariantName, selectedToppingsList);
            }

            return new OrderItemDto
            {
                FoodItemId = Guid.Parse(x.OrderItem.Sku),
                FoodName = (useLatestData && x.FoodItem != null) ? x.FoodItem.Name : x.OrderItem.ItemName,
                Quantity = x.OrderItem.Quantity,
                UnitPrice = finalUnitPrice,
                TotalPrice = finalUnitPrice * x.OrderItem.Quantity,
                SelectedVariantName = x.OrderItem.SelectedVariantName,
                SelectedToppings = string.IsNullOrEmpty(x.OrderItem.SelectedToppings) 
                    ? [] 
                    : JsonSerializer.Deserialize<List<string>>(x.OrderItem.SelectedToppings) ?? []
            };
        }).ToList();
        
        orderDto.TotalAmount = orderDto.Items.Sum(i => i.TotalPrice);

        return orderDto;
    }

    /// <summary>
    /// Updates an existing order's address and order items.
    /// </summary>
    public async Task<OrderDto> UpdateAsync(Guid id, UpdateOrderDto input)
    {
        // 1. Fetch the existing order including details. Will throw EntityNotFoundException if missing.
        var order = await _orderRepository.GetAsync(id, includeDetails: true);

        // 2. Validate and set the new delivery address value object.
        var deliveryAddress = new DeliveryAddress(
            input.DeliveryAddress.ReceiverName,
            input.DeliveryAddress.PhoneNumber,
            input.DeliveryAddress.AddressLine,
            input.DeliveryAddress.Ward,
            input.DeliveryAddress.District,
            input.DeliveryAddress.Province,
            input.DeliveryAddress.Note ?? string.Empty
        );

        order.SetDeliveryAddress(deliveryAddress);
        order.ClearItems();

        // 3. Fetch latest food item definitions for the updated items.
        var foodIds = input.Items.Select(x => x.FoodItemId).Distinct().ToList();
        var foodInfoDict = await GetFoodInfosAsync(foodIds);

        // 4. Validate and re-calculate pricing for updated order items.
        foreach (var item in input.Items)
        {
            if (!foodInfoDict.TryGetValue(item.FoodItemId, out var foodInfo))
            {
                // Throw EntityNotFoundException if the food item replica does not exist.
                throw new EntityNotFoundException(typeof(FoodItem), item.FoodItemId);
            }

            decimal finalPrice = foodInfo.CalculatePrice(item.SelectedVariantName, item.SelectedToppings);
            var selectedToppingsJson = JsonSerializer.Serialize(item.SelectedToppings ?? new List<string>());

            var orderItem = new OrderItem(
                GuidGenerator.Create(),
                item.FoodItemId.ToString(),
                foodInfo.Name,
                item.Quantity,
                finalPrice,
                item.SelectedVariantName,
                selectedToppingsJson);

            order.AddItem(orderItem);
        }

        // 5. Save the updated aggregate root.
        await _orderRepository.UpdateAsync(order, autoSave: true);

        // 6. Return the mapped DTO.
        return ObjectMapper.Map<OrderEntity, OrderDto>(order);
    }

    /// <summary>
    /// Retrieves all orders belonging to the currently authenticated user.
    /// </summary>
    public async Task<List<OrderDto>> GetMyOrdersAsync()
    {
        // 1. Ensure the user is authenticated.
        var customerId = CurrentUser.Id;
        if (customerId == null)
        {
            // Throw AbpAuthorizationException if the user is unauthenticated.
            throw new AbpAuthorizationException("User must be logged in to view their orders.");
        }
        
        var orderQuery = await _orderRepository.GetQueryableAsync();
        var foodQuery = await _foodItemRepository.GetQueryableAsync();

        // 2. Perform DB joins to load matching orders along with their items and food metadata.
        var query = from o in orderQuery
                    where o.CustomerId == customerId
                    select new
                    {
                        Order = o,
                        ItemsWithFood = from oi in o.OrderItems
                                        join fi in foodQuery on oi.Sku equals fi.Id.ToString() into fiJoin
                                        from fi in fiJoin.DefaultIfEmpty() // LEFT JOIN
                                        select new { OrderItem = oi, FoodItem = fi }
                    };

        var queryResult = await AsyncExecuter.ToListAsync(query);
        var orderDtos = new List<OrderDto>();

        // 3. Construct response DTOs, dynamically recalculating pricing for pending orders.
        foreach (var result in queryResult)
        {
            var orderDto = ObjectMapper.Map<OrderEntity, OrderDto>(result.Order);
            
            orderDto.Items = result.ItemsWithFood.Select(x => 
            {
                bool useLatestData = result.Order.Status == OrderStatus.Pending;
                
                decimal finalUnitPrice = x.OrderItem.UnitPrice;
                
                if (useLatestData && x.FoodItem != null)
                {
                    var selectedToppingsList = string.IsNullOrEmpty(x.OrderItem.SelectedToppings) 
                        ? new List<string>() 
                        : JsonSerializer.Deserialize<List<string>>(x.OrderItem.SelectedToppings) ?? new List<string>();
                    finalUnitPrice = x.FoodItem.CalculatePrice(x.OrderItem.SelectedVariantName, selectedToppingsList);
                }

                return new OrderItemDto
                {
                    FoodItemId = Guid.Parse(x.OrderItem.Sku),
                    FoodName = (useLatestData && x.FoodItem != null) ? x.FoodItem.Name : x.OrderItem.ItemName,
                    Quantity = x.OrderItem.Quantity,
                    UnitPrice = finalUnitPrice,
                    TotalPrice = finalUnitPrice * x.OrderItem.Quantity,
                    SelectedVariantName = x.OrderItem.SelectedVariantName,
                    SelectedToppings = string.IsNullOrEmpty(x.OrderItem.SelectedToppings) 
                        ? new List<string>() 
                        : JsonSerializer.Deserialize<List<string>>(x.OrderItem.SelectedToppings)
                };
            }).ToList();
            
            orderDto.TotalAmount = orderDto.Items.Sum(i => i.TotalPrice);
            orderDtos.Add(orderDto);
        }

        return orderDtos;
    }

    /// <summary>
    /// Cancels a specific order.
    /// </summary>
    public async Task CancelAsync(Guid id)
    {
        // 1. Fetch the order from the database. Will throw EntityNotFoundException if missing.
        var order = await _orderRepository.GetAsync(id);
        
        // 2. Delegate the cancellation business logic to the Domain Manager.
        await _orderManager.CancelAsync(order);
        
        // 3. Persist changes.
        await _orderRepository.UpdateAsync(order, autoSave: true);
    }

    /// <summary>
    /// Helper method to fetch FoodItem replicas.
    /// </summary>
    private async Task<Dictionary<Guid, FoodItem>> GetFoodInfosAsync(IEnumerable<Guid> foodItemIds)
    {
        var foodItems = await _foodItemRepository.GetListByIdsAsync(foodItemIds);
        return foodItems.ToDictionary(x => x.Id, x => x);
    }
}

