using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace QuickBite.Order.Orders;

public interface IOrderAppService : IApplicationService
{
    Task<OrderDto> CreateAsync(CreateOrderDto input);

    Task<OrderDto> GetAsync(Guid id);
    
    Task<OrderDto> UpdateAsync(Guid id, UpdateOrderDto input);

    Task<List<OrderDto>> GetMyOrdersAsync();

    Task SubmitAsync(Guid id);

    Task CancelAsync(Guid id);
}