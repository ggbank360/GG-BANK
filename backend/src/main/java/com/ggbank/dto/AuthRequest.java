package com.ggbank.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class AuthRequest {

    @NotBlank(message = "12-digit account number is required")
    @Pattern(regexp = "^[0-9]{12}$", message = "Account number must be exactly 12 numeric digits")
    private String accountNumber;

    @NotBlank(message = "Password is required")
    private String password;

    public AuthRequest() {}

    public AuthRequest(String accountNumber, String password) {
        this.accountNumber = accountNumber;
        this.password = password;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
