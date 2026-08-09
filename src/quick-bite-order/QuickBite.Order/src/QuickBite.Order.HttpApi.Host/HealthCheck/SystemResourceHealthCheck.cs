using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace QuickBite.Order.HealthCheck;

public class SystemResourceHealthCheck : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var process = Process.GetCurrentProcess();
        var workingSetMb = process.WorkingSet64 / 1024 / 1024;
        var gcMemoryMb = GC.GetTotalMemory(false) / 1024 / 1024;

        var data = new Dictionary<string, object>
        {
            ["working_set_mb"] = workingSetMb,
            ["gc_heap_mb"] = gcMemoryMb,
            ["thread_count"] = process.Threads.Count
        };

        return Task.FromResult(HealthCheckResult.Healthy("System resources operational", data));
    }
}
