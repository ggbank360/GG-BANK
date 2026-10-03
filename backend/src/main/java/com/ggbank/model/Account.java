package com.ggbank.model;

import com.google.cloud.firestore.annotation.DocumentId;
import java.math.BigDecimal;

public class Account {

    @DocumentId
    private String accountId;
    private String userId;
    private String accountNumber;
    private String accountType; // SAVINGS, CURRENT
    private BigDecimal balance;
    private String ifscCode;
    private String branch;
    private String status;      // ACTIVE, INACTIVE, BLOCKED
    private String createdAt;
    private String updatedAt;

    public Account() {
        this.balance = BigDecimal.ZERO;
    }

    public Account(String accountId, String userId, String accountNumber, String accountType, BigDecimal balance, String ifscCode, String branch, String status, String createdAt, String updatedAt) {
        this.accountId = accountId;
        this.userId = userId;
        this.accountNumber = accountNumber;
        this.accountType = accountType;
        this.balance = balance != null ? balance : BigDecimal.ZERO;
        this.ifscCode = ifscCode;
        this.branch = branch;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public String getIfscCode() { return ifscCode; }
    public void setIfscCode(String ifscCode) { this.ifscCode = ifscCode; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
