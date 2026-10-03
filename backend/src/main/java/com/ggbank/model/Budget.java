package com.ggbank.model;

import com.google.cloud.firestore.annotation.DocumentId;
import java.math.BigDecimal;

public class Budget {

    @DocumentId
    private String budgetId;
    private String userId;
    private String category;    // Food, Transport, Shopping, Bills, Entertainment, Healthcare, Other
    private BigDecimal limitAmount;
    private BigDecimal spent;
    private String month;       // e.g. "2026-09"
    private String createdAt;
    private String updatedAt;

    public Budget() {
        this.limitAmount = BigDecimal.ZERO;
        this.spent = BigDecimal.ZERO;
    }

    public Budget(String budgetId, String userId, String category, BigDecimal limitAmount, BigDecimal spent, String month, String createdAt, String updatedAt) {
        this.budgetId = budgetId;
        this.userId = userId;
        this.category = category;
        this.limitAmount = limitAmount;
        this.spent = spent != null ? spent : BigDecimal.ZERO;
        this.month = month;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getBudgetId() { return budgetId; }
    public void setBudgetId(String budgetId) { this.budgetId = budgetId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getLimitAmount() { return limitAmount; }
    public void setLimitAmount(BigDecimal limitAmount) { this.limitAmount = limitAmount; }

    public BigDecimal getSpent() { return spent; }
    public void setSpent(BigDecimal spent) { this.spent = spent; }

    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
