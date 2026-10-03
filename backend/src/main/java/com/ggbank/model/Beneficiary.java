package com.ggbank.model;

import com.google.cloud.firestore.annotation.DocumentId;

public class Beneficiary {

    @DocumentId
    private String beneficiaryId;
    private String userId;
    private String name;
    private String accountNumber;
    private String ifscCode;
    private String bankName;
    private String createdAt;

    public Beneficiary() {
    }

    public Beneficiary(String beneficiaryId, String userId, String name, String accountNumber, String ifscCode, String bankName, String createdAt) {
        this.beneficiaryId = beneficiaryId;
        this.userId = userId;
        this.name = name;
        this.accountNumber = accountNumber;
        this.ifscCode = ifscCode;
        this.bankName = bankName;
        this.createdAt = createdAt;
    }

    public String getBeneficiaryId() { return beneficiaryId; }
    public void setBeneficiaryId(String beneficiaryId) { this.beneficiaryId = beneficiaryId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getIfscCode() { return ifscCode; }
    public void setIfscCode(String ifscCode) { this.ifscCode = ifscCode; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
