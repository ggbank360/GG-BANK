package com.ggbank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class AdminDepositRequest {

    @NotBlank(message = "Account number is required")
    private String accountNumber;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Deposit amount must be at least ₹1.00")
    private BigDecimal amount;

    private String paymentMethod;
    private String description;

    public AdminDepositRequest() {}

    public AdminDepositRequest(String accountNumber, BigDecimal amount, String paymentMethod, String description) {
        this.accountNumber = accountNumber;
        this.amount = amount;
        this.paymentMethod = paymentMethod != null ? paymentMethod : "DIRECT_TREASURY_CREDIT";
        this.description = description != null ? description : "Admin Direct Account Deposit";
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
