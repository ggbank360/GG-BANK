package com.ggbank.model;

import com.google.cloud.firestore.annotation.DocumentId;
import java.math.BigDecimal;

public class BillPayment {

    @DocumentId
    private String billId;
    private String userId;
    private String accountNumber;
    private String category;        // Electricity, Water, Mobile, Internet, Insurance, Education
    private String provider;
    private String consumerNumber;
    private BigDecimal amount;
    private String status;          // SUCCESS, FAILED
    private String createdAt;

    public BillPayment() {
    }

    public BillPayment(String billId, String userId, String accountNumber, String category, String provider, String consumerNumber, BigDecimal amount, String status, String createdAt) {
        this.billId = billId;
        this.userId = userId;
        this.accountNumber = accountNumber;
        this.category = category;
        this.provider = provider;
        this.consumerNumber = consumerNumber;
        this.amount = amount;
        this.status = status;
        this.createdAt = createdAt;
    }

    public String getBillId() { return billId; }
    public void setBillId(String billId) { this.billId = billId; }

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

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
