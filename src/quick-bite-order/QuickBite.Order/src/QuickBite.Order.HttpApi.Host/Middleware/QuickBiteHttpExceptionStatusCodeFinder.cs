using System;
using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Volo.Abp;
using Volo.Abp.AspNetCore.ExceptionHandling;
using Volo.Abp.DependencyInjection;

namespace QuickBite.Order.Middleware;

/// <summary>
/// Custom HTTP Exception Status Code Finder that overrides ABP's default behavior.
/// By default, ABP maps IBusinessException to HTTP 403 Forbidden.
/// This finder ensures all business exceptions and user-friendly exceptions are mapped to HTTP 400 Bad Request.
/// </summary>
[Dependency(ReplaceServices = true)]
public class QuickBiteHttpExceptionStatusCodeFinder : DefaultHttpExceptionStatusCodeFinder
{
    public QuickBiteHttpExceptionStatusCodeFinder(IOptions<AbpExceptionHttpStatusCodeOptions> options)
        : base(options)
    {
    }

    public override HttpStatusCode GetStatusCode(HttpContext httpContext, Exception exception)
    {
        // Business logic violations and user-friendly exceptions should be 400 Bad Request, not 403 Forbidden
        if (exception is IBusinessException || exception is IUserFriendlyException)
        {
            return HttpStatusCode.BadRequest;
        }

        return base.GetStatusCode(httpContext, exception);
    }
}
