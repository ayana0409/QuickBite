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
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.EventBus.Distributed;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using QuickBite.Order.Permissions;
using OrderEntity = QuickBite.Order.Domain.Orders.AggregateRoots.Order;
namespace QuickBite.Order.Orders;

// [Authorize]
public class OrderAppService :
    ApplicationService,
    IOrderAppService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IOrderManager _orderManager;
    private readonly IRepository<FoodItem, Guid> _foodItemRepository;
    private readonly IDistributedEventBus _distributedEventBus;

    public OrderAppService(
        IOrderRepository orderRepository,
        IOrderManager orderManager,
        IRepository<FoodItem, Guid> foodItemRepository,
        IDistributedEventBus distributedEventBus)
    {
        _orderRepository = orderRepository;
        _orderManager = orderManager;
        _foodItemRepository = foodItemRepository;
        _distributedEventBus = distributedEventBus;
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
                item.FoodItemId,
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

        // 5. Insert the order aggregate root into database (in Draft state).
        await _orderRepository.InsertAsync(order, autoSave: true);

        // Submit order for demo only
        await SubmitAsync(order.Id);

        // 6. Map the domain aggregate root to the response DTO.
        return ObjectMapper.Map<OrderEntity, OrderDto>(order);
    }

    /// <summary>
    /// Submits a draft order, transitioning its status to Pending and publishing OrderSubmittedEto to start the Saga.
    /// </summary>
    public async Task SubmitAsync(Guid id)
    {
        var order = await _orderRepository.GetAsync(id, includeDetails: true);

        order.Submit();

        var orderSubmittedEto = new OrderSubmittedEto
        {
            EventId = GuidGenerator.Create(),
            OrderId = order.Id,
            OrderCode = order.OrderCode,
            CustomerId = order.CustomerId,
            RestaurantId = order.RestaurantId,
            TotalAmount = order.TotalAmount,
            Currency = order.Currency,
            CorrelationId = order.CorrelationId,
            OccurredAt = DateTime.UtcNow,
            Items = order.OrderItems.Select(x => new OrderItemEto
            {
                FoodItemId = x.Sku,
                ItemName = x.ItemName,
                Quantity = x.Quantity,
                UnitPrice = x.UnitPrice,
                SelectedVariantName = x.SelectedVariantName ?? string.Empty,
                SelectedToppings = x.SelectedToppings
            }).ToList()
        };

        await _distributedEventBus.PublishAsync(orderSubmittedEto);
        await _orderRepository.UpdateAsync(order, autoSave: true);
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
                                        join fi in foodQuery on oi.Sku equals fi.Id into fiJoin
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
                FoodItemId = x.OrderItem.Sku,
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
    /// Updates an existing order's address and order items. Only permitted when order is in Draft status.
    /// </summary>
    public async Task<OrderDto> UpdateAsync(Guid id, UpdateOrderDto input)
    {
        // 1. Fetch the existing order including details. Will throw EntityNotFoundException if missing.
        var order = await _orderRepository.GetAsync(id, includeDetails: true);

        // 2. Validate and build the new delivery address value object.
        var deliveryAddress = new DeliveryAddress(
            input.DeliveryAddress.ReceiverName,
            input.DeliveryAddress.PhoneNumber,
            input.DeliveryAddress.AddressLine,
            input.DeliveryAddress.Ward,
            input.DeliveryAddress.District,
            input.DeliveryAddress.Province,
            input.DeliveryAddress.Note ?? string.Empty
        );

        // 3. Fetch latest food item definitions for the updated items.
        var foodIds = input.Items.Select(x => x.FoodItemId).Distinct().ToList();
        var foodInfoDict = await GetFoodInfosAsync(foodIds);

        // 4. Validate and re-calculate pricing for updated order items.
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
                item.FoodItemId,
                foodInfo.Name,
                item.Quantity,
                finalPrice,
                item.SelectedVariantName,
                selectedToppingsJson));
        }

        // 5. Delegate address and items update to the aggregate root (which enforces Draft-only invariant).
        order.UpdateDetails(deliveryAddress, orderItems);

        // 6. Save the updated aggregate root.
        await _orderRepository.UpdateAsync(order, autoSave: true);

        // 7. Return the mapped DTO.
        return ObjectMapper.Map<OrderEntity, OrderDto>(order);
    }

    /// <summary>
    /// Updates only the delivery address of an order before delivery.
    /// </summary>
    public async Task<OrderDto> UpdateAddressAsync(Guid id, UpdateDeliveryAddressDto input)
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
        await _orderRepository.UpdateAsync(order, autoSave: true);

        return ObjectMapper.Map<OrderEntity, OrderDto>(order);
    }

    /// <summary>
    /// Updates an existing order's status (for processing orders).
    /// </summary>
    public async Task<OrderDto> UpdateStatusAsync(Guid id, UpdateOrderStatusDto input)
    {
        var order = await _orderRepository.GetAsync(id, includeDetails: true);

        order.UpdateStatus(input.Status);

        await _orderRepository.UpdateAsync(order, autoSave: true);

        return ObjectMapper.Map<OrderEntity, OrderDto>(order);
    }

    /// <summary>
    /// Retrieves all orders belonging to the currently authenticated user.
    /// </summary>
    public async Task<List<OrderDto>> GetMyOrdersAsync(Guid? customerId = null)
    {
        // 1. Resolve customer ID with multiple fallback mechanisms
        var targetCustomerId = customerId ?? CurrentUser.Id;

        if (targetCustomerId == null)
        {
            var httpContext = LazyServiceProvider.LazyGetService<IHttpContextAccessor>()?.HttpContext;
            if (httpContext != null)
            {
                // Try X-Customer-Id header
                if (httpContext.Request.Headers.TryGetValue("X-Customer-Id", out var customIdStr) &&
                    Guid.TryParse(customIdStr, out var parsedCustomId))
                {
                    targetCustomerId = parsedCustomId;
                }
                // Try customerId query param
                else if (httpContext.Request.Query.TryGetValue("customerId", out var queryCustId) &&
                         Guid.TryParse(queryCustId, out var parsedQueryId))
                {
                    targetCustomerId = parsedQueryId;
                }
                // Try decoding sub claim from Bearer JWT token in Authorization header
                else if (httpContext.Request.Headers.TryGetValue("Authorization", out var authHeader))
                {
                    var authStr = authHeader.ToString();
                    if (authStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    {
                        try
                        {
                            var token = authStr.Substring(7).Trim();
                            var parts = token.Split('.');
                            if (parts.Length >= 2)
                            {
                                var base64 = parts[1].Replace('-', '+').Replace('_', '/');
                                switch (base64.Length % 4)
                                {
                                    case 2: base64 += "=="; break;
                                    case 3: base64 += "="; break;
                                }
                                var jsonBytes = Convert.FromBase64String(base64);
                                using var doc = JsonDocument.Parse(jsonBytes);
                                if (doc.RootElement.TryGetProperty("sub", out var subProp) &&
                                    Guid.TryParse(subProp.GetString(), out var subGuid))
                                {
                                    targetCustomerId = subGuid;
                                }
                            }
                        }
                        catch
                        {
                            // ignore token parse error
                        }
                    }
                }
            }
        }

        if (targetCustomerId == null)
        {
            return new List<OrderDto>();
        }

        var orderQuery = await _orderRepository.GetQueryableAsync();
        var foodQuery = await _foodItemRepository.GetQueryableAsync();

        // 2. Perform DB joins to load matching orders along with their items and food metadata.
        var query = from o in orderQuery
                    where o.CustomerId == targetCustomerId
                    select new
                    {
                        Order = o,
                        ItemsWithFood = from oi in o.OrderItems
                                        join fi in foodQuery on oi.Sku equals fi.Id into fiJoin
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
                    FoodItemId = x.OrderItem.Sku,
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
    /// Retrieves a paged list of orders belonging to a specific restaurant with optional status and search filtering.
    /// Filtering, sorting, and pagination are executed directly on PostgreSQL database server via IQueryable.
    /// </summary>
    public async Task<PagedResultDto<OrderDto>> GetListByRestaurantAsync(GetOrdersByRestaurantInput input)
    {
        var query = await _orderRepository.WithDetailsAsync();

        // 1. Mandatory filter by RestaurantId at DB level
        query = query.Where(x => x.RestaurantId == input.RestaurantId);

        // 2. Optional filter by OrderStatus enum at DB level
        if (!string.IsNullOrWhiteSpace(input.Status))
        {
            if (Enum.TryParse<OrderStatus>(input.Status, ignoreCase: true, out var statusEnum))
            {
                query = query.Where(x => x.Status == statusEnum);
            }
        }

        // 3. Optional filter by OrderCode search at DB level
        if (!string.IsNullOrWhiteSpace(input.Search))
        {
            query = query.Where(x => x.OrderCode.Contains(input.Search));
        }

        // 4. Count total matching items in DB
        var totalCount = await AsyncExecuter.CountAsync(query);

        // 5. Apply sorting (newest orders first) and pagination in DB
        query = query.OrderByDescending(x => x.CreationTime)
                     .PageBy(input.SkipCount, input.MaxResultCount);

        // 6. Fetch only paged orders from DB
        var orders = await AsyncExecuter.ToListAsync(query);

        // 7. Map to DTOs
        var orderDtos = ObjectMapper.Map<List<OrderEntity>, List<OrderDto>>(orders);

        return new PagedResultDto<OrderDto>(totalCount, orderDtos);
    }

    /// <summary>
    /// Gets all orders in the system for Admin supervision with search, status, and date range filters.
    /// </summary>
    [Authorize(OrderPermissions.Orders.AdminView)]
    public async Task<PagedResultDto<OrderDto>> GetAdminListAsync(GetAdminOrdersInput input)
    {
        var query = await _orderRepository.WithDetailsAsync();

        // 1. Filter by OrderStatus enum if provided
        if (!string.IsNullOrWhiteSpace(input.Status))
        {
            if (Enum.TryParse<OrderStatus>(input.Status, ignoreCase: true, out var statusEnum))
            {
                query = query.Where(x => x.Status == statusEnum);
            }
        }

        // 2. Filter by search term (OrderCode, ReceiverName, PhoneNumber)
        if (!string.IsNullOrWhiteSpace(input.Search))
        {
            var search = input.Search.Trim();
            query = query.Where(x => x.OrderCode.Contains(search) ||
                                     x.DeliveryAddress.FullName.Contains(search) ||
                                     x.DeliveryAddress.PhoneNumber.Contains(search));
        }

        // 3. Filter by date range
        if (input.StartDate.HasValue)
        {
            var startUtc = input.StartDate.Value.Date;
            query = query.Where(x => x.CreationTime >= startUtc);
        }

        if (input.EndDate.HasValue)
        {
            var endUtc = input.EndDate.Value.Date.AddDays(1);
            query = query.Where(x => x.CreationTime < endUtc);
        }

        // 4. Count total matching items
        var totalCount = await AsyncExecuter.CountAsync(query);

        // 5. Apply sorting and pagination
        query = query.OrderByDescending(x => x.CreationTime)
                     .PageBy(input.SkipCount, input.MaxResultCount);

        // 6. Fetch paged orders
        var orders = await AsyncExecuter.ToListAsync(query);

        // 7. Map to DTOs
        var orderDtos = ObjectMapper.Map<List<OrderEntity>, List<OrderDto>>(orders);

        return new PagedResultDto<OrderDto>(totalCount, orderDtos);
    }

    /// <summary>
    /// Cancels a specific order.
    /// </summary>
    public async Task CancelAsync(Guid id)
    {
        // 1. Fetch the order from the database. Will throw EntityNotFoundException if missing.
        var order = await _orderRepository.GetAsync(id, includeDetails: true);

        // 2. Save the status before cancellation to decide if we should notify Inventory.
        var statusBeforeCancel = order.Status;

        // 3. Delegate the cancellation business logic to the Domain Manager.
        order.Cancel();

        // 4. Only publish OrderCancelledEto if the order was in a processing state that may have reserved stock.
        // Draft orders have never submitted to the Saga, so Inventory has no stock to release.
        var statusesWithReservedStock = new[]
        {
            OrderStatus.Pending,
            OrderStatus.WaitingInventory,
            OrderStatus.WaitingStock,
            OrderStatus.WaitingPayment,
            OrderStatus.Confirmed,
            OrderStatus.Preparing,
        };

        if (Array.Exists(statusesWithReservedStock, s => s == statusBeforeCancel))
        {
            var orderCancelledEto = new OrderCancelledEto
            {
                EventId = GuidGenerator.Create(),
                OrderId = order.Id,
                Reason = "User cancelled",
                CorrelationId = order.CorrelationId,
                OccurredAt = DateTime.UtcNow,
                Items = order.OrderItems.Select(x => new OrderItemEto
                {
                    FoodItemId = x.Sku,
                    ItemName = x.ItemName,
                    Quantity = x.Quantity,
                    UnitPrice = x.UnitPrice,
                    SelectedVariantName = x.SelectedVariantName ?? string.Empty,
                    SelectedToppings = x.SelectedToppings
                }).ToList()
            };

            await _distributedEventBus.PublishAsync(orderCancelledEto);
        }

        // 5. Persist changes.
        await _orderRepository.UpdateAsync(order, autoSave: true);
    }

    /// <summary>
    /// Admin emergency force cancellation.
    /// </summary>
    [Authorize(OrderPermissions.Orders.ForceCancel)]
    public async Task ForceCancelAsync(Guid id, ForceCancelOrderDto input)
    {
        // 1. Fetch the order from the database.
        var order = await _orderRepository.GetAsync(id, includeDetails: true);

        // 2. Save status before cancel
        var statusBeforeCancel = order.Status;

        // 3. Delegate force cancel to entity
        order.ForceCancel(input.Reason);

        // 4. Publish cancellation event for saga rollback (release stock, refund payment)
        var statusesWithReservedStock = new[]
        {
            OrderStatus.Pending,
            OrderStatus.WaitingInventory,
            OrderStatus.WaitingStock,
            OrderStatus.WaitingPayment,
            OrderStatus.Confirmed,
            OrderStatus.Preparing,
            OrderStatus.Delivering
        };

        if (Array.Exists(statusesWithReservedStock, s => s == statusBeforeCancel))
        {
            var orderCancelledEto = new OrderCancelledEto
            {
                EventId = GuidGenerator.Create(),
                OrderId = order.Id,
                Reason = $"Admin force cancelled: {input.Reason}",
                CorrelationId = order.CorrelationId,
                OccurredAt = DateTime.UtcNow,
                Items = order.OrderItems.Select(x => new OrderItemEto
                {
                    FoodItemId = x.Sku,
                    ItemName = x.ItemName,
                    Quantity = x.Quantity,
                    UnitPrice = x.UnitPrice,
                    SelectedVariantName = x.SelectedVariantName ?? string.Empty,
                    SelectedToppings = x.SelectedToppings
                }).ToList()
            };

            await _distributedEventBus.PublishAsync(orderCancelledEto);
        }

        // 5. Persist changes
        await _orderRepository.UpdateAsync(order, autoSave: true);
    }

    /// <summary>
    /// Refunds a specific order.
    /// </summary>
    public async Task RefundAsync(Guid id, RefundOrderDto input = null)
    {
        var order = await _orderRepository.GetAsync(id, includeDetails: true);

        string reason = (input != null && !string.IsNullOrWhiteSpace(input.Reason))
            ? input.Reason
            : "Hoàn tiền cho khách hàng";

        order.Refund(reason);

        var orderRefundedEto = new OrderRefundedEto
        {
            EventId = GuidGenerator.Create(),
            OrderId = order.Id,
            Reason = reason,
            CorrelationId = order.CorrelationId,
            OccurredAt = DateTime.UtcNow,
            Items = order.OrderItems.Select(x => new OrderItemEto
            {
                FoodItemId = x.Sku,
                ItemName = x.ItemName,
                Quantity = x.Quantity,
                UnitPrice = x.UnitPrice,
                SelectedVariantName = x.SelectedVariantName ?? string.Empty,
                SelectedToppings = x.SelectedToppings
            }).ToList()
        };

        await _distributedEventBus.PublishAsync(orderRefundedEto);
        await _orderRepository.UpdateAsync(order, autoSave: true);
    }

    /// <summary>
    /// Aggregates and returns real-time order and revenue statistics for a specific restaurant.
    /// </summary>
    public async Task<RestaurantOrderStatisticsDto> GetStatisticsAsync(GetOrderStatisticsInput input)
    {
        var now = DateTime.UtcNow;
        var todayStart = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);
        var yesterdayStart = todayStart.AddDays(-1);
        var sevenDaysAgoStart = todayStart.AddDays(-6);

        var orderQuery = await _orderRepository.GetQueryableAsync();

        // Filter orders for the current restaurant within the 7-day window
        var recentOrdersQuery = orderQuery
            .Where(x => x.RestaurantId == input.RestaurantId && x.CreationTime >= sevenDaysAgoStart)
            .OrderByDescending(x => x.CreationTime);

        var orders7Days = await AsyncExecuter.ToListAsync(recentOrdersQuery);

        // 1. KPI Calculations (Today vs Yesterday)
        var todayOrders = orders7Days.Where(x => x.CreationTime >= todayStart && x.Status != OrderStatus.Draft).ToList();
        var yesterdayOrders = orders7Days.Where(x => x.CreationTime >= yesterdayStart && x.CreationTime < todayStart && x.Status != OrderStatus.Draft).ToList();

        decimal revenueToday = todayOrders.Where(x => x.Status != OrderStatus.Cancelled).Sum(x => x.TotalAmount);
        decimal revenueYesterday = yesterdayOrders.Where(x => x.Status != OrderStatus.Cancelled).Sum(x => x.TotalAmount);

        string revenueChange = "+0%";
        bool isRevenuePositive = true;
        if (revenueYesterday > 0)
        {
            var revPercent = ((revenueToday - revenueYesterday) / revenueYesterday) * 100;
            revenueChange = (revPercent >= 0 ? "+" : "") + revPercent.ToString("0.0") + "%";
            isRevenuePositive = revPercent >= 0;
        }
        else if (revenueToday > 0)
        {
            revenueChange = "+100%";
            isRevenuePositive = true;
        }

        int ordersCountToday = todayOrders.Count;
        int ordersCountYesterday = yesterdayOrders.Count;
        string ordersChange = "+0%";
        bool isOrdersPositive = true;
        if (ordersCountYesterday > 0)
        {
            var ordPercent = ((double)(ordersCountToday - ordersCountYesterday) / ordersCountYesterday) * 100;
            ordersChange = (ordPercent >= 0 ? "+" : "") + ordPercent.ToString("0.0") + "%";
            isOrdersPositive = ordPercent >= 0;
        }
        else if (ordersCountToday > 0)
        {
            ordersChange = "+100%";
            isOrdersPositive = true;
        }

        int cancelledToday = todayOrders.Count(x => x.Status == OrderStatus.Cancelled);
        int cancelledYesterday = yesterdayOrders.Count(x => x.Status == OrderStatus.Cancelled);

        double cancelRateToday = ordersCountToday > 0 ? ((double)cancelledToday / ordersCountToday) * 100 : 0.0;
        double cancelRateYesterday = ordersCountYesterday > 0 ? ((double)cancelledYesterday / ordersCountYesterday) * 100 : 0.0;

        double cancelDiff = cancelRateToday - cancelRateYesterday;
        string cancelRateChange = (cancelDiff >= 0 ? "+" : "") + cancelDiff.ToString("0.0") + "%";
        bool isCancelRatePositive = cancelDiff <= 0; // Lower cancellation is good

        var kpiSummary = new OrderKpiSummaryDto
        {
            RevenueToday = revenueToday,
            RevenueYesterday = revenueYesterday,
            RevenueChange = revenueChange,
            IsRevenuePositive = isRevenuePositive,

            OrdersToday = ordersCountToday,
            OrdersYesterday = ordersCountYesterday,
            OrdersChange = ordersChange,
            IsOrdersPositive = isOrdersPositive,

            CancelRateToday = Math.Round(cancelRateToday, 1),
            CancelRateYesterday = Math.Round(cancelRateYesterday, 1),
            CancelRateChange = cancelRateChange,
            IsCancelRatePositive = isCancelRatePositive,

            AverageRating = 4.9, // Default fallback, will be augmented by Gateway from Catalog
            RatingChange = "+0.1",
            TotalReviews = 45,
        };

        // 2. 7-Day Revenue Data
        var revenueData = new List<RevenueDataPointDto>();
        var cultureVi = new System.Globalization.CultureInfo("vi-VN");

        for (int i = 0; i < 7; i++)
        {
            var currentDay = sevenDaysAgoStart.AddDays(i);
            var nextDay = currentDay.AddDays(1);

            var dayOrders = orders7Days.Where(x => x.CreationTime >= currentDay && x.CreationTime < nextDay && x.Status != OrderStatus.Draft).ToList();
            var dayRevenue = dayOrders.Where(x => x.Status != OrderStatus.Cancelled).Sum(x => x.TotalAmount);

            string dayName = currentDay.DayOfWeek switch
            {
                DayOfWeek.Monday => "T2",
                DayOfWeek.Tuesday => "T3",
                DayOfWeek.Wednesday => "T4",
                DayOfWeek.Thursday => "T5",
                DayOfWeek.Friday => "T6",
                DayOfWeek.Saturday => "T7",
                DayOfWeek.Sunday => "CN",
                _ => currentDay.ToString("ddd", cultureVi)
            };

            revenueData.Add(new RevenueDataPointDto
            {
                Date = currentDay.ToString("dd/MM"),
                DayName = dayName,
                Revenue = dayRevenue,
                OrdersCount = dayOrders.Count,
            });
        }

        // 3. Cancel Reasons Breakdown
        var cancelledOrders = orders7Days.Where(x => x.Status == OrderStatus.Cancelled).ToList();
        var cancelReasonData = new List<CancelReasonDataPointDto>();

        if (cancelledOrders.Any())
        {
            int totalCancelled = cancelledOrders.Count;
            // Group by common note patterns or standard reasons
            var reasonGroups = cancelledOrders
                .GroupBy(x =>
                {
                    var lastHistory = x.StatusHistories?.LastOrDefault(h => h.ToStatus == OrderStatus.Cancelled);
                    var note = lastHistory?.Reason?.Trim() ?? string.Empty;
                    if (note.Contains("hết món", StringComparison.OrdinalIgnoreCase) || note.Contains("out of stock", StringComparison.OrdinalIgnoreCase))
                        return "Hết món ăn";
                    if (note.Contains("đổi ý", StringComparison.OrdinalIgnoreCase) || note.Contains("customer", StringComparison.OrdinalIgnoreCase))
                        return "Khách đổi ý";
                    if (note.Contains("đóng cửa", StringComparison.OrdinalIgnoreCase) || note.Contains("busy", StringComparison.OrdinalIgnoreCase))
                        return "Quán đóng cửa";
                    return "Lý do khác";
                })
                .ToList();

            var colors = new Dictionary<string, string>
            {
                { "Khách đổi ý", "#f97316" },
                { "Hết món ăn", "#ef4444" },
                { "Quán đóng cửa", "#eab308" },
                { "Lý do khác", "#64748b" }
            };

            foreach (var group in reasonGroups)
            {
                int count = group.Count();
                double percent = Math.Round(((double)count / totalCancelled) * 100, 1);
                string color = colors.TryGetValue(group.Key, out var col) ? col : "#64748b";

                cancelReasonData.Add(new CancelReasonDataPointDto
                {
                    Name = group.Key,
                    Value = percent,
                    Count = count,
                    Color = color,
                });
            }
        }
        else
        {
            // Default empty/baseline reasons
            cancelReasonData = new List<CancelReasonDataPointDto>
            {
                new() { Name = "Khách đổi ý", Value = 40, Count = 0, Color = "#f97316" },
                new() { Name = "Hết món ăn", Value = 30, Count = 0, Color = "#ef4444" },
                new() { Name = "Quán đóng cửa", Value = 20, Count = 0, Color = "#eab308" },
                new() { Name = "Lý do khác", Value = 10, Count = 0, Color = "#64748b" }
            };
        }

        // 4. Recent 5 Orders
        var recent5 = orders7Days
            .OrderByDescending(x => x.CreationTime)
            .Take(5)
            .ToList();

        var recentOrderDtos = recent5.Select(x =>
        {
            var timeDiff = now - x.CreationTime;
            string timeStr = timeDiff.TotalMinutes < 60
                ? $"{Math.Max(1, (int)timeDiff.TotalMinutes)} phút trước"
                : timeDiff.TotalHours < 24
                    ? $"{(int)timeDiff.TotalHours} giờ trước"
                    : x.CreationTime.ToString("dd/MM HH:mm");

            var itemsSummary = x.OrderItems != null && x.OrderItems.Any()
                ? string.Join(", ", x.OrderItems.Take(2).Select(i => $"{i.Quantity}x {i.ItemName}")) + (x.OrderItems.Count > 2 ? $" (+{x.OrderItems.Count - 2} món)" : "")
                : "Đơn hàng món ăn";

            int totalItems = x.OrderItems?.Sum(i => i.Quantity) ?? 1;

            return new RecentOrderSummaryDto
            {
                Id = x.Id,
                OrderCode = x.OrderCode ?? x.Id.ToString().Substring(0, 8).ToUpper(),
                CustomerName = x.DeliveryAddress?.FullName ?? "Khách hàng",
                ItemsSummary = itemsSummary,
                ItemsCount = totalItems,
                Time = timeStr,
                Total = x.TotalAmount,
                Status = x.Status.ToString().ToUpperInvariant(),
            };
        }).ToList();

        return new RestaurantOrderStatisticsDto
        {
            KpiSummary = kpiSummary,
            RevenueData = revenueData,
            CancelReasonData = cancelReasonData,
            RecentOrders = recentOrderDtos,
        };
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


