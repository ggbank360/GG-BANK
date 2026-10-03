package com.ggbank.model;

import com.google.cloud.firestore.annotation.DocumentId;

public class Notification {

    @DocumentId
    private String notificationId;
    private String userId;      // Specific userId or "ALL"
    private String title;
    private String message;
    private String type;        // TRANSACTION, LOAN, BUDGET, SECURITY, SYSTEM
    private Boolean read;
    private String createdAt;

    public Notification() {
        this.read = false;
    }

    public Notification(String notificationId, String userId, String title, String message, String type, Boolean read, String createdAt) {
        this.notificationId = notificationId;
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.type = type;
        this.read = read != null ? read : false;
        this.createdAt = createdAt;
    }

    public String getNotificationId() { return notificationId; }
    public void setNotificationId(String notificationId) { this.notificationId = notificationId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Boolean getRead() { return read; }
    public void setRead(Boolean read) { this.read = read; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
