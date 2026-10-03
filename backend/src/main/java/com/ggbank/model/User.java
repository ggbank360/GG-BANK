package com.ggbank.model;

import com.google.cloud.firestore.annotation.DocumentId;

public class User {

    @DocumentId
    private String userId;
    private String name;
    private String email;
    private String phone;
    private String dateOfBirth;
    private String address;
    private String role;     // CUSTOMER, ADMIN
    private String status;   // ACTIVE, INACTIVE, BLOCKED
    private String createdAt;
    private String updatedAt;

    public User() {
    }

    public User(String userId, String name, String email, String phone, String dateOfBirth, String address, String role, String status, String createdAt, String updatedAt) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.dateOfBirth = dateOfBirth;
        this.address = address;
        this.role = role;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
