using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Enums;
using Volo.Abp.Domain.Entities;
using QuickBite.Order.Domain.Orders.Managers;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Orders.ValueObjects;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using QuickBite.Order.Extensions;
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

    public async Task<OrderDto> CreateAsync(CreateOrderDto input)
    {
        var deliveryAddress = new DeliveryAddress(
            input.DeliveryAddress.ReceiverName,
            input.DeliveryAddress.PhoneNumber,
            input.DeliveryAddress.AddressLine,
            input.DeliveryAddress.Ward,
            input.DeliveryAddress.District,
            input.DeliveryAddress.Province,
            input.DeliveryAddress.Note ?? string.Empty
        );

        var foodIds = input.Items.Select(x => x.FoodItemId).Distinct().ToList();
        var foodInfoDict = await GetFoodInfosAsync(foodIds);

        var orderItems = new List<OrderItem>();
        foreach (var item in input.Items)
        {
            if (!foodInfoDict.TryGetValue(item.FoodItemId, out var foodInfo))
            {
                throw new Exception($"Food item with ID {item.FoodItemId} not found.");
            }

            orderItems.Add(new OrderItem(
                GuidGenerator.Create(),
                item.FoodItemId.ToString(),
                foodInfo.Name,
                item.Quantity,
                foodInfo.Price));
        }

        var order = await _orderManager.CreateAsync(
            input.CustomerId,
            input.RestaurantId,
            deliveryAddress,
            orderItems);

        await _orderRepository.InsertAsync(order, autoSave: true);

        return ObjectMapper.Map<OrderEntity, OrderDto>(order);
    }

    public async Task<OrderDto> GetAsync(Guid id)
    {
        var orderQuery = await _orderRepository.GetQueryableAsync();
        var foodQuery = await _foodItemRepository.GetQueryableAsync();

        // Sử dụng IQueryable để JOIN dữ liệu ngay ở tầng Database (EF Core SQL)
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
            throw new EntityNotFoundException(typeof(OrderEntity), id);
        }

        var orderDto = ObjectMapper.Map<OrderEntity, OrderDto>(result.Order);
        
        orderDto.Items = result.ItemsWithFood.Select(x => 
        {
            bool useLatestData = result.Order.Status == OrderStatus.Pending;

            return new OrderItemDto
            {
                FoodItemId = Guid.Parse(x.OrderItem.Sku),
                FoodName = (useLatestData && x.FoodItem != null) ? x.FoodItem.Name : x.OrderItem.ItemName,
                Quantity = x.OrderItem.Quantity,
                UnitPrice = (useLatestData && x.FoodItem != null) ? x.FoodItem.Price : x.OrderItem.UnitPrice,
                TotalPrice = ((useLatestData && x.FoodItem != null) ? x.FoodItem.Price : x.OrderItem.UnitPrice) * x.OrderItem.Quantity
            };
        }).ToList();
        
        orderDto.TotalAmount = orderDto.Items.Sum(i => i.TotalPrice);

        return orderDto;
    }

    public async Task<OrderDto> UpdateAsync(Guid id, UpdateOrderDto input)
    {
        var order = await _orderRepository.GetAsync(id, includeDetails: true);

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

        var foodIds = input.Items.Select(x => x.FoodItemId).Distinct().ToList();
        var foodInfoDict = await GetFoodInfosAsync(foodIds);

        foreach (var item in input.Items)
        {
            if (!foodInfoDict.TryGetValue(item.FoodItemId, out var foodInfo))
            {
                throw new Exception($"Food item with ID {item.FoodItemId} not found.");
            }

            var orderItem = new OrderItem(
                GuidGenerator.Create(),
                item.FoodItemId.ToString(),
                foodInfo.Name,
                item.Quantity,
                foodInfo.Price);
            
            order.AddItem(orderItem);
        }

        await _orderRepository.UpdateAsync(order, autoSave: true);

        return ObjectMapper.Map<OrderEntity, OrderDto>(order);
    }

    public async Task<List<OrderDto>> GetMyOrdersAsync()
    {
        var customerId = CurrentUser.Id ?? throw new UnauthorizedAccessException("User is not logged in");
        
        var orderQuery = await _orderRepository.GetQueryableAsync();
        var foodQuery = await _foodItemRepository.GetQueryableAsync();

        // Sử dụng IQueryable để JOIN dữ liệu ngay ở tầng Database (EF Core SQL)
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

        foreach (var result in queryResult)
        {
            var orderDto = ObjectMapper.Map<OrderEntity, OrderDto>(result.Order);
            
            orderDto.Items = result.ItemsWithFood.Select(x => 
            {
                bool useLatestData = result.Order.Status == OrderStatus.Pending;

                return new OrderItemDto
                {
                    FoodItemId = Guid.Parse(x.OrderItem.Sku),
                    FoodName = (useLatestData && x.FoodItem != null) ? x.FoodItem.Name : x.OrderItem.ItemName,
                    Quantity = x.OrderItem.Quantity,
                    UnitPrice = (useLatestData && x.FoodItem != null) ? x.FoodItem.Price : x.OrderItem.UnitPrice,
                    TotalPrice = ((useLatestData && x.FoodItem != null) ? x.FoodItem.Price : x.OrderItem.UnitPrice) * x.OrderItem.Quantity
                };
            }).ToList();
            
            orderDto.TotalAmount = orderDto.Items.Sum(i => i.TotalPrice);
            orderDtos.Add(orderDto);
        }

        return orderDtos;
    }

    public async Task CancelAsync(Guid id)
    {
        var order = await _orderRepository.GetAsync(id);
        
        await _orderManager.CancelAsync(order);
        
        await _orderRepository.UpdateAsync(order, autoSave: true);
    }

    private async Task<Dictionary<Guid, (string Name, decimal Price)>> GetFoodInfosAsync(IEnumerable<Guid> foodItemIds)
    {
        var foodItems = await _foodItemRepository.GetListByIdsAsync(foodItemIds);
        return foodItems.ToDictionary(x => x.Id, x => (x.Name, x.Price));
    }
}
