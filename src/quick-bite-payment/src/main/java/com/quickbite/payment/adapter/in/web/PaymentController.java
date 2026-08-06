package com.quickbite.payment.adapter.in.web;

import com.quickbite.payment.adapter.in.web.dto.MockPaymentRequestDto;
import com.quickbite.payment.adapter.in.web.dto.PaymentResponseDto;
import com.quickbite.payment.application.port.in.CreatePaymentCommand;
import com.quickbite.payment.application.port.in.ProcessPaymentUseCase;
import com.quickbite.payment.domain.model.Payment;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for handling Payment API requests and Mock Gateway simulation.
 */
@RestController
@RequestMapping("/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment Management", description = "Endpoints for handling payment processing and mock gateway")
public class PaymentController {

    private final ProcessPaymentUseCase processPaymentUseCase;

    @PostMapping
    @Operation(summary = "Create a payment session")
    public ResponseEntity<PaymentResponseDto> createPayment(@Valid @RequestBody CreatePaymentCommand command) {
        Payment payment = processPaymentUseCase.createPayment(command);
        return ResponseEntity.ok(PaymentResponseDto.fromDomain(payment));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get payment by ID")
    public ResponseEntity<PaymentResponseDto> getPaymentById(@PathVariable UUID id) {
        Payment payment = processPaymentUseCase.getPaymentById(id);
        return ResponseEntity.ok(PaymentResponseDto.fromDomain(payment));
    }

    @GetMapping("/order/{orderId}")
    @Operation(summary = "Get payment by Order ID")
    public ResponseEntity<PaymentResponseDto> getPaymentByOrderId(@PathVariable UUID orderId) {
        Payment payment = processPaymentUseCase.getPaymentByOrderId(orderId);
        return ResponseEntity.ok(PaymentResponseDto.fromDomain(payment));
    }

    @PostMapping("/{id}/mock-process")
    @Operation(summary = "Simulate payment result (Success or Fail) from Sandbox UI")
    public ResponseEntity<PaymentResponseDto> processMockPayment(
            @PathVariable UUID id,
            @Valid @RequestBody MockPaymentRequestDto request) {
        Payment payment = processPaymentUseCase.processMockPayment(id, request.getSuccess(), request.getFailureReason());
        return ResponseEntity.ok(PaymentResponseDto.fromDomain(payment));
    }
}
