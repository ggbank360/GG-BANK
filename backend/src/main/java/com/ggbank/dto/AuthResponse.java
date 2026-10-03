package com.ggbank.dto;

import com.ggbank.model.Account;
import com.ggbank.model.User;

public class AuthResponse {

    private String token;
    private User user;
    private Account account;

    public AuthResponse() {}

    public AuthResponse(String token, User user, Account account) {
        this.token = token;
        this.user = user;
        this.account = account;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Account getAccount() {
        return account;
    }

    public void setAccount(Account account) {
        this.account = account;
    }
}
