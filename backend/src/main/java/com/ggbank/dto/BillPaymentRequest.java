package com.ggbank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class BillPaymentRequest {

    private String userId;

    @NotBlank(message = "Account number is required")
    private String accountNumber;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Provider is required")
    private String provider;

    @NotBlank(message = "Consumer number is required")
    private String consumerNumber;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Bill amount must be at least 1.00")
    private BigDecimal amount;

    public BillPaymentRequest() {}

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getConsumerNumber() { return consumerNumber; }
    public void setConsumerNumber(String consumerNumber) { this.consumerNumber = consumerNumber; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
