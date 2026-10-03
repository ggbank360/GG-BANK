package com.ggbank.model;

public class Officer {
    private String officerId;
    private String employeeId;
    private String name;
    private String email;
    private String phone;
    private String department; // LOAN, COMPLIANCE, TREASURY, OPERATIONS
    private String designation; // Senior Credit Officer, KYC Officer, etc.
    private String branch;
    private String status; // ACTIVE, ON_LEAVE, SUSPENDED
    private int assignedCases;
    private String createdAt;

    public Officer() {}

    public Officer(String officerId, String employeeId, String name, String email, String phone,
                   String department, String designation, String branch, String status, int assignedCases, String createdAt) {
        this.officerId = officerId;
        this.employeeId = employeeId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.department = department;
        this.designation = designation;
        this.branch = branch;
        this.status = status;
        this.assignedCases = assignedCases;
        this.createdAt = createdAt;
    }

    public String getOfficerId() { return officerId; }
    public void setOfficerId(String officerId) { this.officerId = officerId; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getAssignedCases() { return assignedCases; }
    public void setAssignedCases(int assignedCases) { this.assignedCases = assignedCases; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
