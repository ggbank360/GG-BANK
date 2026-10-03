package com.ggbank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class WithdrawRequest {

    @NotBlank(message = "Account number is required")
    private String accountNumber;

    @NotNull(message = "Withdrawal amount is required")
    @DecimalMin(value = "1.00", message = "Withdrawal amount must be at least 1.00")
    private BigDecimal amount;

    private String description;

    public WithdrawRequest() {}

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
