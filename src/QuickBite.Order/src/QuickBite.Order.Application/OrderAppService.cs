using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Orders.Managers;
using QuickBite.Order.Domain.Orders.Repositories;
using QuickBite.Order.Domain.Orders.ValueObjects;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Application.Services;

using OrderEntity = QuickBite.Order.Domain.Orders.AggregateRoots.Order;
namespace QuickBite.Order.Orders;

public class OrderAppService :
    ApplicationService,
    IOrderAppService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IOrderManager _orderManager;

    public OrderAppService(
        IOrderRepository orderRepository,
        IOrderManager orderManager)
    {
        _orderRepository = orderRepository;
        _orderManager = orderManager;
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
        var order = await _orderRepository.GetAsync(id, includeDetails: true);
        return ObjectMapper.Map<OrderEntity, OrderDto>(order);
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
        var orders = await _orderRepository.GetListAsync(x => x.CustomerId == customerId, includeDetails: true);
        
        return ObjectMapper.Map<List<OrderEntity>, List<OrderDto>>(orders);
    }

    public async Task CancelAsync(Guid id)
    {
        var order = await _orderRepository.GetAsync(id);
        
        await _orderManager.CancelAsync(order);
        
        await _orderRepository.UpdateAsync(order, autoSave: true);
    }

    private Task<Dictionary<Guid, (string Name, decimal Price)>> GetFoodInfosAsync(IEnumerable<Guid> foodItemIds)
    {
        // TODO: In a real application, perform a SINGLE batch query to the Catalog/Food database/service:
        // var foods = await _foodRepository.GetListAsync(x => foodItemIds.Contains(x.Id));
        // return foods.ToDictionary(x => x.Id, x => (x.Name, x.Price));
        
        var dict = new Dictionary<Guid, (string Name, decimal Price)>();
        foreach (var id in foodItemIds)
        {
            dict[id] = ($"Mock Food {id.ToString().Substring(0, 4)}", 50000m);
        }
        return Task.FromResult(dict);
    }
}