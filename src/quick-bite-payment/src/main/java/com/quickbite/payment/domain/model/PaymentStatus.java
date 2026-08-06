package com.quickbite.payment.domain.model;

/**
 * Enum representing the status of a payment transaction.
 */
public enum PaymentStatus {
    PENDING,
    SUCCESS,
    FAILED,
    REFUNDED
}
