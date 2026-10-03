package com.ggbank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class LoanApplicationRequest {

    @NotBlank(message = "Account number is required")
    private String accountNumber;

    @NotBlank(message = "Loan type is required")
    private String loanType;

    @NotNull(message = "Requested amount is required")
    @DecimalMin(value = "1000.00", message = "Minimum loan amount is 1000.00")
    private BigDecimal requestedAmount;

    @NotNull(message = "Monthly income is required")
    private BigDecimal monthlyIncome;

    @NotNull(message = "Loan tenure is required")
    private Integer tenure;

    private Double interestRate;
    private BigDecimal estimatedEMI;
    private BigDecimal totalInterest;
    private BigDecimal totalRepayment;
    private String purpose;

    public LoanApplicationRequest() {}

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
}
