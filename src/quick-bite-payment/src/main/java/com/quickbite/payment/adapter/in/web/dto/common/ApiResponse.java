package com.quickbite.payment.adapter.in.web.dto.common;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class ApiResponse<T> {

    private boolean success;
    private int statusCode;
    private String message;
    private T data;
    private Object errors;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    @Builder.Default
    private Instant timestamp = Instant.now();

    private String path;

    public static <T> ApiResponse<T> success(T data, String message, int statusCode, String path) {
        return ApiResponse.<T>builder()
                .success(true)
                .statusCode(statusCode)
                .message(message != null ? message : "Success.")
                .data(data)
                .errors(null)
                .timestamp(Instant.now())
                .path(path)
                .build();
    }

    public static <T> ApiResponse<T> success(T data, String path) {
        return success(data, "Success.", 200, path);
    }

    public static <T> ApiResponse<T> error(String message, int statusCode, Object errors, String path) {
        return ApiResponse.<T>builder()
                .success(false)
                .statusCode(statusCode)
                .message(message)
                .data(null)
                .errors(errors)
                .timestamp(Instant.now())
                .path(path)
                .build();
    }
}
