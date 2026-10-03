package com.ggbank.dto;

import jakarta.validation.constraints.NotBlank;

public class CustomerStatusRequest {

    @NotBlank(message = "Status is required (ACTIVE, INACTIVE, BLOCKED)")
    private String status;

    public CustomerStatusRequest() {}

    public CustomerStatusRequest(String status) {
        this.status = status;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
