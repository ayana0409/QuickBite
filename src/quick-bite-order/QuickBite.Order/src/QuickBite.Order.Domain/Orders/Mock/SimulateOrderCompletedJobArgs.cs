using System;
using Volo.Abp.BackgroundJobs;

namespace QuickBite.Order.Domain.Orders.Mock;

[BackgroundJobName("SimulateOrderCompletedJob")]
public class SimulateOrderCompletedJobArgs
{
    public Guid OrderId { get; set; }
}
