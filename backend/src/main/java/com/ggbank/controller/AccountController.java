package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.model.Account;
import com.ggbank.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    @Autowired
    private AccountService accountService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<Account>> getAccountByUserId(@PathVariable String userId) throws Exception {
        Account account = accountService.getAccountByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(account));
    }

    @GetMapping("/{accountNumber}")
    public ResponseEntity<ApiResponse<Account>> getAccountByNumber(@PathVariable String accountNumber) throws Exception {
        Account account = accountService.getAccountByNumber(accountNumber);
        return ResponseEntity.ok(ApiResponse.success(account));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Account>>> getAllAccounts() throws Exception {
        List<Account> accounts = accountService.getAllAccounts();
        return ResponseEntity.ok(ApiResponse.success(accounts));
    }
}
