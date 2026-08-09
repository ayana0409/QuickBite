using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;

namespace QuickBite.Identity.Web.Middleware;

public class DatabaseUnavailableMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<DatabaseUnavailableMiddleware> _logger;

    public DatabaseUnavailableMiddleware(RequestDelegate next, ILogger<DatabaseUnavailableMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex) when (IsDbUnavailableException(ex))
        {
            _logger.LogError(ex, "Database is unavailable after retry attempts.");

            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            context.Response.ContentType = "application/json";

            var response = new
            {
                code = 503,
                error = "Service Temporarily Unavailable",
                message = "The database is currently unreachable. Please try again later."
            };

            await context.Response.WriteAsJsonAsync(response);
        }
    }

    private static bool IsDbUnavailableException(Exception ex)
    {
        if (ex is RetryLimitExceededException)
        {
            return true;
        }

        var currentEx = ex;
        while (currentEx != null)
        {
            var typeName = currentEx.GetType().Name;
            if (typeName.Contains("NpgsqlException", StringComparison.OrdinalIgnoreCase) ||
                typeName.Contains("PostgresException", StringComparison.OrdinalIgnoreCase) ||
                typeName.Contains("DbUpdateException", StringComparison.OrdinalIgnoreCase) ||
                typeName.Contains("SocketException", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
            currentEx = currentEx.InnerException;
        }

        return false;
    }
}
