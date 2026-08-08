using System;
using Volo.Abp.BackgroundJobs;

namespace QuickBite.Order.Domain.Orders.Mock;

[BackgroundJobName("SimulateOrderDeliveryJob")]
public class SimulateOrderDeliveryJobArgs
{
    public Guid OrderId { get; set; }
}
