package com.ggbank.model;

import com.google.cloud.firestore.annotation.DocumentId;
import java.math.BigDecimal;

public class Transaction {

    @DocumentId
    private String transactionId;
    private String senderAccount;
    private String receiverAccount;
    private BigDecimal amount;
    private String type;        // TRANSFER, DEPOSIT, WITHDRAWAL, LOAN_DISBURSEMENT, BILL_PAYMENT
    private String category;    // Salary, Food, Shopping, Bills, Transport, Other
    private String description;
    private String status;      // COMPLETED, PENDING, FAILED
    private BigDecimal balanceAfter;
    private String createdAt;

    public Transaction() {
    }

    public Transaction(String transactionId, String senderAccount, String receiverAccount, BigDecimal amount, String type, String category, String description, String status, BigDecimal balanceAfter, String createdAt) {
        this.transactionId = transactionId;
        this.senderAccount = senderAccount;
        this.receiverAccount = receiverAccount;
        this.amount = amount;
        this.type = type;
        this.category = category;
        this.description = description;
        this.status = status;
        this.balanceAfter = balanceAfter;
        this.createdAt = createdAt;
    }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getSenderAccount() { return senderAccount; }
    public void setSenderAccount(String senderAccount) { this.senderAccount = senderAccount; }

    public String getReceiverAccount() { return receiverAccount; }
    public void setReceiverAccount(String receiverAccount) { this.receiverAccount = receiverAccount; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(BigDecimal balanceAfter) { this.balanceAfter = balanceAfter; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
