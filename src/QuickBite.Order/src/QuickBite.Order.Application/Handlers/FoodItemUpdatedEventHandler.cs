using System;
using System.Text.Json;
using System.Threading.Tasks;
using QuickBite.Order.Domain.Orders.Entities;
using QuickBite.Order.Domain.Shared.Event;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.EventBus.Distributed;

namespace QuickBite.Order.Handlers;

/// <summary>
/// Kafka consumer: lắng nghe event "food.item.synced" từ topic "catalog-events".
/// ABP Inbox Pattern đảm bảo handler này KHÔNG bao giờ bị gọi 2 lần cho cùng một message,
/// ngay cả khi Kafka gửi lại do at-least-once delivery.
/// </summary>
public class FoodItemUpdatedEventHandler
    : IDistributedEventHandler<FoodItemUpdatedEto>, ITransientDependency
{
    private readonly IRepository<FoodItem, Guid> _foodItemRepository;

    public FoodItemUpdatedEventHandler(IRepository<FoodItem, Guid> foodItemRepository)
    {
        _foodItemRepository = foodItemRepository;
    }

    public async Task HandleEventAsync(FoodItemUpdatedEto eventData)
    {
        var variantsJson = JsonSerializer.Serialize(eventData.Variants ?? new());
        var toppingsJson = JsonSerializer.Serialize(eventData.Toppings ?? new());

        // Kiểm tra FoodItem đã tồn tại trong DB local của Order service chưa
        var food = await _foodItemRepository.FindAsync(eventData.Id);

        if (food == null)
        {
            // Chưa có → Insert (đồng bộ món mới từ Catalog)
            food = new FoodItem(eventData.Id, eventData.Name, eventData.Price, variantsJson, toppingsJson);
            await _foodItemRepository.InsertAsync(food);
        }
        else
        {
            // Đã có → Update (đồng bộ thay đổi tên/giá từ Catalog)
            food.UpdateInfo(eventData.Name, eventData.Price, variantsJson, toppingsJson);
            await _foodItemRepository.UpdateAsync(food);
        }
    }
}
