package com.ggbank.dto;

import java.math.BigDecimal;

public class AdminStatsResponse {

    private long totalCustomers;
    private long totalAccounts;
    private BigDecimal totalDeposits;
    private BigDecimal totalWithdrawals;
    private BigDecimal totalTransfers;
    private long pendingLoans;
    private long activeAccounts;
    private long blockedAccounts;

    public AdminStatsResponse() {
        this.totalDeposits = BigDecimal.ZERO;
        this.totalWithdrawals = BigDecimal.ZERO;
        this.totalTransfers = BigDecimal.ZERO;
    }

    public long getTotalCustomers() { return totalCustomers; }
    public void setTotalCustomers(long totalCustomers) { this.totalCustomers = totalCustomers; }

    public long getTotalAccounts() { return totalAccounts; }
    public void setTotalAccounts(long totalAccounts) { this.totalAccounts = totalAccounts; }

    public BigDecimal getTotalDeposits() { return totalDeposits; }
    public void setTotalDeposits(BigDecimal totalDeposits) { this.totalDeposits = totalDeposits; }

    public BigDecimal getTotalWithdrawals() { return totalWithdrawals; }
    public void setTotalWithdrawals(BigDecimal totalWithdrawals) { this.totalWithdrawals = totalWithdrawals; }

    public BigDecimal getTotalTransfers() { return totalTransfers; }
    public void setTotalTransfers(BigDecimal totalTransfers) { this.totalTransfers = totalTransfers; }

    public long getPendingLoans() { return pendingLoans; }
    public void setPendingLoans(long pendingLoans) { this.pendingLoans = pendingLoans; }

    public long getActiveAccounts() { return activeAccounts; }
    public void setActiveAccounts(long activeAccounts) { this.activeAccounts = activeAccounts; }

    public long getBlockedAccounts() { return blockedAccounts; }
    public void setBlockedAccounts(long blockedAccounts) { this.blockedAccounts = blockedAccounts; }
}
