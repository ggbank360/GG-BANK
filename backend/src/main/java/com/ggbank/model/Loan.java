package com.ggbank.model;

import com.google.cloud.firestore.annotation.DocumentId;
import java.math.BigDecimal;

public class Loan {

    @DocumentId
    private String loanId;
    private String userId;
    private String accountNumber;
    private String loanType;         // Personal Loan, Education Loan, Home Loan, Business Loan
    private BigDecimal requestedAmount;
    private BigDecimal monthlyIncome;
    private Integer tenure;          // In months
    private Double interestRate;     // Annual rate e.g. 10.5
    private BigDecimal estimatedEMI;
    private BigDecimal totalInterest;
    private BigDecimal totalRepayment;
    private String purpose;
    private String status;           // PENDING, APPROVED, REJECTED, ACTIVE, COMPLETED
    private String adminRemarks;
    private String createdAt;
    private String updatedAt;

    public Loan() {
    }

    public Loan(String loanId, String userId, String accountNumber, String loanType, BigDecimal requestedAmount, BigDecimal monthlyIncome, Integer tenure, Double interestRate, BigDecimal estimatedEMI, BigDecimal totalInterest, BigDecimal totalRepayment, String purpose, String status, String adminRemarks, String createdAt, String updatedAt) {
        this.loanId = loanId;
        this.userId = userId;
        this.accountNumber = accountNumber;
        this.loanType = loanType;
        this.requestedAmount = requestedAmount;
        this.monthlyIncome = monthlyIncome;
        this.tenure = tenure;
        this.interestRate = interestRate;
        this.estimatedEMI = estimatedEMI;
        this.totalInterest = totalInterest;
        this.totalRepayment = totalRepayment;
        this.purpose = purpose;
        this.status = status;
        this.adminRemarks = adminRemarks;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getLoanId() { return loanId; }
    public void setLoanId(String loanId) { this.loanId = loanId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getLoanType() { return loanType; }
    public void setLoanType(String loanType) { this.loanType = loanType; }

    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }

    public BigDecimal getMonthlyIncome() { return monthlyIncome; }
    public void setMonthlyIncome(BigDecimal monthlyIncome) { this.monthlyIncome = monthlyIncome; }

    public Integer getTenure() { return tenure; }
    public void setTenure(Integer tenure) { this.tenure = tenure; }

    public Double getInterestRate() { return interestRate; }
    public void setInterestRate(Double interestRate) { this.interestRate = interestRate; }

    public BigDecimal getEstimatedEMI() { return estimatedEMI; }
    public void setEstimatedEMI(BigDecimal estimatedEMI) { this.estimatedEMI = estimatedEMI; }

    public BigDecimal getTotalInterest() { return totalInterest; }
    public void setTotalInterest(BigDecimal totalInterest) { this.totalInterest = totalInterest; }

    public BigDecimal getTotalRepayment() { return totalRepayment; }
    public void setTotalRepayment(BigDecimal totalRepayment) { this.totalRepayment = totalRepayment; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAdminRemarks() { return adminRemarks; }
    public void setAdminRemarks(String adminRemarks) { this.adminRemarks = adminRemarks; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
