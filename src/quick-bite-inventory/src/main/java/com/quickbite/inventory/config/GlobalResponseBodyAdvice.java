package com.quickbite.inventory.config;

import com.quickbite.inventory.dto.common.ApiResponse;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@RestControllerAdvice
public class GlobalResponseBodyAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        // Intercept all controller responses
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request,
            ServerHttpResponse response) {

        String path = request.getURI().getPath();

        // Do not wrap Swagger / OpenAPI / Actuator endpoints
        if (path.startsWith("/v1/api-docs") || path.startsWith("/v3/api-docs") ||
                path.startsWith("/swagger-ui") || path.startsWith("/actuator")) {
            return body;
        }

        // If body is already wrapped in ApiResponse, return it as is
        if (body instanceof ApiResponse) {
            return body;
        }

        int statusCode = 200;
        if (response instanceof ServletServerHttpResponse servletResponse) {
            statusCode = servletResponse.getServletResponse().getStatus();
        }

        // Handle null or String response bodies gracefully
        String message = "Success.";
        if (statusCode == 201) {
            message = "Created successfully.";
        } else if (statusCode == 204) {
            message = "No content.";
        }

        return ApiResponse.success(body, message, statusCode, path);
    }
}
