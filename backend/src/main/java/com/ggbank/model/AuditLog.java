package com.ggbank.model;

import com.google.cloud.firestore.annotation.DocumentId;

public class AuditLog {

    @DocumentId
    private String logId;
    private String userId;
    private String adminId;
    private String action;        // USER_REGISTRATION, LOGIN, LOGOUT, DEPOSIT, WITHDRAWAL, TRANSFER, LOAN_APPLICATION, LOAN_APPROVAL, LOAN_REJECTION, ACCOUNT_BLOCK, ACCOUNT_ACTIVATION, PROFILE_UPDATE, PASSWORD_CHANGE
    private String description;
    private String timestamp;
    private String status;        // SUCCESS, FAILURE
    private String ipAddress;

    public AuditLog() {
    }

    public AuditLog(String logId, String userId, String adminId, String action, String description, String timestamp, String status, String ipAddress) {
        this.logId = logId;
        this.userId = userId;
        this.adminId = adminId;
        this.action = action;
        this.description = description;
        this.timestamp = timestamp;
        this.status = status;
        this.ipAddress = ipAddress;
    }

    public String getLogId() { return logId; }
    public void setLogId(String logId) { this.logId = logId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getAdminId() { return adminId; }
    public void setAdminId(String adminId) { this.adminId = adminId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}
