package com.ggbank.dto;

public class AdminSettingsDto {
    private String bankName;
    private String bankBranch;
    private String ifscCode;
    private String currency;
    private boolean emailNotifications;
    private boolean smsAlerts;
    private boolean twoFactorAuth;
    private int maxLoginAttempts;
    private int sessionTimeoutMinutes;

    public AdminSettingsDto() {
        this.bankName = "GG BANK";
        this.bankBranch = "Central Tech Branch";
        this.ifscCode = "GGBN0001234";
        this.currency = "INR (₹)";
        this.emailNotifications = true;
        this.smsAlerts = true;
        this.twoFactorAuth = true;
        this.maxLoginAttempts = 5;
        this.sessionTimeoutMinutes = 15;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getBankBranch() {
        return bankBranch;
    }

    public void setBankBranch(String bankBranch) {
        this.bankBranch = bankBranch;
    }

    public String getIfscCode() {
        return ifscCode;
    }

    public void setIfscCode(String ifscCode) {
        this.ifscCode = ifscCode;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public boolean isEmailNotifications() {
        return emailNotifications;
    }

    public void setEmailNotifications(boolean emailNotifications) {
        this.emailNotifications = emailNotifications;
    }

    public boolean isSmsAlerts() {
        return smsAlerts;
    }

    public void setSmsAlerts(boolean smsAlerts) {
        this.smsAlerts = smsAlerts;
    }

    public boolean isTwoFactorAuth() {
        return twoFactorAuth;
    }

    public void setTwoFactorAuth(boolean twoFactorAuth) {
        this.twoFactorAuth = twoFactorAuth;
    }

    public int getMaxLoginAttempts() {
        return maxLoginAttempts;
    }

    public void setMaxLoginAttempts(int maxLoginAttempts) {
        this.maxLoginAttempts = maxLoginAttempts;
    }

    public int getSessionTimeoutMinutes() {
        return sessionTimeoutMinutes;
    }

    public void setSessionTimeoutMinutes(int sessionTimeoutMinutes) {
        this.sessionTimeoutMinutes = sessionTimeoutMinutes;
    }
}
