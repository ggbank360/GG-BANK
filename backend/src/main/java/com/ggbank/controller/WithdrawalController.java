package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.WithdrawRequest;
import com.ggbank.model.Transaction;
import com.ggbank.service.WithdrawalService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/withdraw")
public class WithdrawalController {

    @Autowired
    private WithdrawalService withdrawalService;

    @PostMapping
    public ResponseEntity<ApiResponse<Transaction>> withdraw(@Valid @RequestBody WithdrawRequest request) throws Exception {
        Transaction transaction = withdrawalService.processWithdrawal(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Withdrawal processed successfully", transaction));
    }
}
