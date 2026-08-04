using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace QuickBite.Order.Middleware
{
    public class ResponseWrapperMiddleware
    {
        private readonly RequestDelegate _next;

        public ResponseWrapperMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Only wrap responses for /api/ paths
            if (!context.Request.Path.StartsWithSegments("/api"))
            {
                await _next(context);
                return;
            }

            var originalBodyStream = context.Response.Body;
            using var responseBodyMemoryStream = new MemoryStream();
            context.Response.Body = responseBodyMemoryStream;

            try
            {
                await _next(context);

                var contentType = context.Response.ContentType ?? "";
                bool isJsonOrText = contentType.Contains("application/json") || contentType.Contains("text/plain");

                // If it's a success response but not JSON/plain text (e.g. file download), don't wrap it.
                if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 300 && !isJsonOrText)
                {
                    context.Response.Body = originalBodyStream;
                    responseBodyMemoryStream.Position = 0;
                    await responseBodyMemoryStream.CopyToAsync(originalBodyStream);
                    return;
                }

                context.Response.Body = originalBodyStream;
                responseBodyMemoryStream.Position = 0;
                
                var responseBodyText = await new StreamReader(responseBodyMemoryStream).ReadToEndAsync();
                
                if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)
                {
                    // Success response
                    object? data = null;
                    if (!string.IsNullOrWhiteSpace(responseBodyText))
                    {
                        try
                        {
                            data = JsonSerializer.Deserialize<object>(responseBodyText);
                        }
                        catch
                        {
                            data = responseBodyText; // fallback if it is not valid JSON
                        }
                    }

                    var wrappedResponse = new
                    {
                        success = true,
                        statusCode = context.Response.StatusCode,
                        message = "Success.",
                        data = data,
                        timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        path = context.Request.Path.Value
                    };

                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(wrappedResponse, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    }));
                }
                else
                {
                    // Error response (e.g. 400, 401, 403, 404, 409, 500)
                    string message = GetDefaultMessageForStatusCode(context.Response.StatusCode);
                    object? errors = null;

                    if (!string.IsNullOrWhiteSpace(responseBodyText) && isJsonOrText)
                    {
                        try
                        {
                            using var doc = JsonDocument.Parse(responseBodyText);
                            var root = doc.RootElement;
                            if (root.TryGetProperty("error", out var errorProp))
                            {
                                if (errorProp.TryGetProperty("message", out var msgProp))
                                {
                                    message = msgProp.GetString() ?? message;
                                }
                                if (errorProp.TryGetProperty("validationErrors", out var valErrorsProp) && valErrorsProp.ValueKind != JsonValueKind.Null)
                                {
                                    errors = JsonSerializer.Deserialize<object>(valErrorsProp.GetRawText());
                                }
                                else if (errorProp.TryGetProperty("details", out var detailsProp) && detailsProp.ValueKind != JsonValueKind.Null)
                                {
                                    errors = detailsProp.GetString();
                                }
                            }
                            else
                            {
                                message = responseBodyText;
                            }
                        }
                        catch
                        {
                            message = responseBodyText;
                        }
                    }

                    var wrappedResponse = new
                    {
                        success = false,
                        statusCode = context.Response.StatusCode,
                        message = message,
                        errors = errors,
                        timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        path = context.Request.Path.Value
                    };

                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(wrappedResponse, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    }));
                }
            }
            catch (Exception ex)
            {
                context.Response.Body = originalBodyStream;

                int statusCode = 500;
                string message = ex.Message;
                object? errors = ex.StackTrace;

                if (ex is Volo.Abp.Authorization.AbpAuthorizationException)
                {
                    statusCode = context.User?.Identity?.IsAuthenticated == true ? 403 : 401;
                    message = statusCode == 401
                        ? "Unauthorized. Authentication is required."
                        : "Forbidden. You do not have permission for this action.";
                    errors = null;
                }
                else if (ex is UnauthorizedAccessException)
                {
                    statusCode = 401;
                    message = "Unauthorized. Authentication is required.";
                    errors = null;
                }
                else if (ex is Volo.Abp.Domain.Entities.EntityNotFoundException)
                {
                    statusCode = 404;
                    message = ex.Message;
                    errors = null;
                }
                else if (ex is Volo.Abp.BusinessException || ex is Volo.Abp.UserFriendlyException)
                {
                    statusCode = 400;
                    message = ex.Message;
                    errors = null;
                }
                else if (ex is Volo.Abp.ExceptionHandling.IHasHttpStatusCode httpStatusEx)
                {
                    statusCode = (int)httpStatusEx.HttpStatusCode;
                    errors = null;
                }

                context.Response.StatusCode = statusCode;
                var wrappedResponse = new
                {
                    success = false,
                    statusCode = statusCode,
                    message = message,
                    errors = errors,
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    path = context.Request.Path.Value
                };

                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(wrappedResponse, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
            }
        }

        private string GetDefaultMessageForStatusCode(int statusCode)
        {
            return statusCode switch
            {
                400 => "Bad request.",
                401 => "Unauthorized.",
                403 => "Forbidden.",
                404 => "Resource not found.",
                409 => "Conflict.",
                _ => "An error occurred."
            };
        }
    }
}
