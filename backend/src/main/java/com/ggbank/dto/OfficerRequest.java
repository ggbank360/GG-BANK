package com.ggbank.dto;

public class OfficerRequest {
    private String name;
    private String email;
    private String phone;
    private String department;
    private String designation;
    private String branch;
    private String status;

    public OfficerRequest() {}

    public OfficerRequest(String name, String email, String phone, String department, String designation, String branch, String status) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.department = department;
        this.designation = designation;
        this.branch = branch;
        this.status = status;
    }

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
}
