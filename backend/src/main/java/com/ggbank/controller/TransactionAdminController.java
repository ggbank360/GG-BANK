package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.model.Transaction;
import com.ggbank.service.TransactionAdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/transactions")
public class TransactionAdminController {

    @Autowired
    private TransactionAdminService transactionAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Transaction>>> getAllTransactions() throws Exception {
        List<Transaction> list = transactionAdminService.getAllTransactions();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{transactionId}")
    public ResponseEntity<ApiResponse<Transaction>> getTransactionById(@PathVariable String transactionId) throws Exception {
        Transaction transaction = transactionAdminService.getTransactionById(transactionId);
        return ResponseEntity.ok(ApiResponse.success(transaction));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{transactionId}")
    public ResponseEntity<ApiResponse<String>> deleteTransaction(@PathVariable String transactionId) throws Exception {
        transactionAdminService.deleteTransaction(transactionId);
        return ResponseEntity.ok(ApiResponse.success("Transaction deleted successfully", transactionId));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/clear-all")
    public ResponseEntity<ApiResponse<String>> clearAllTransactions() throws Exception {
        transactionAdminService.clearAllTransactions();
        return ResponseEntity.ok(ApiResponse.success("All transaction records deleted", null));
    }
}
