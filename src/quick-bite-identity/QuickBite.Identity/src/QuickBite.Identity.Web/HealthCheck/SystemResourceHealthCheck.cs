using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace QuickBite.Identity.Web.HealthCheck;

public class SystemResourceHealthCheck : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var process = Process.GetCurrentProcess();
            var workingSetMb = Math.Round((double)process.WorkingSet64 / (1024 * 1024), 2);
            var privateMemoryMb = Math.Round((double)process.PrivateMemorySize64 / (1024 * 1024), 2);

            var data = new Dictionary<string, object>
            {
                { "working_set_mb", workingSetMb },
                { "private_memory_mb", privateMemoryMb }
            };

            return Task.FromResult(HealthCheckResult.Healthy("System resources operational.", data));
        }
        catch (Exception ex)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy("Failed to retrieve system resources.", ex));
        }
    }
}
