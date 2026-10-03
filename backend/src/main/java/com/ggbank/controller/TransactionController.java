package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.model.Transaction;
import com.ggbank.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @GetMapping("/account/{accountNumber}")
    public ResponseEntity<ApiResponse<List<Transaction>>> getTransactionsByAccount(@PathVariable String accountNumber) throws Exception {
        List<Transaction> list = transactionService.getTransactionsForAccount(accountNumber);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Transaction>>> getAllTransactions() throws Exception {
        List<Transaction> list = transactionService.getAllTransactions();
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
