package com.ggbank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class BudgetRequest {

    private String userId;

    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Limit amount is required")
    @DecimalMin(value = "1.00", message = "Budget limit must be at least 1.00")
    private BigDecimal limitAmount;

    private String month;

    public BudgetRequest() {}

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getLimitAmount() { return limitAmount; }
    public void setLimitAmount(BigDecimal limitAmount) { this.limitAmount = limitAmount; }

    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }
}
