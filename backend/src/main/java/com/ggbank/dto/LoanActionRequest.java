package com.ggbank.dto;

public class LoanActionRequest {

    private String remarks;

    public LoanActionRequest() {}

    public LoanActionRequest(String remarks) {
        this.remarks = remarks;
    }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
