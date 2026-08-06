package com.quickbite.payment.adapter.in.web.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Data Transfer Object for simulating payment results from the Mock Sandbox UI.
 */
@Data
public class MockPaymentRequestDto {
    @NotNull(message = "Success flag is required")
    private Boolean success;

    private String failureReason;
}
