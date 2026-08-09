using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Volo.Abp.BackgroundJobs;

namespace QuickBite.Order.HealthCheck;

public class BackgroundJobHealthCheck : IHealthCheck
{
    private readonly AbpBackgroundJobOptions _options;

    public BackgroundJobHealthCheck(IOptions<AbpBackgroundJobOptions> options)
    {
        _options = options.Value;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var data = new Dictionary<string, object>
        {
            ["is_job_execution_enabled"] = _options.IsJobExecutionEnabled
        };

        if (_options.IsJobExecutionEnabled)
        {
            return Task.FromResult(HealthCheckResult.Healthy("Background job execution is active", data));
        }

        return Task.FromResult(HealthCheckResult.Degraded("Background job execution is disabled", data: data));
    }
}
