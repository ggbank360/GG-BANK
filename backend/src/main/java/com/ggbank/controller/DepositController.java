package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.DepositRequest;
import com.ggbank.model.Transaction;
import com.ggbank.service.DepositService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/deposit")
public class DepositController {

    @Autowired
    private DepositService depositService;

    @PostMapping
    public ResponseEntity<ApiResponse<Transaction>> deposit(@Valid @RequestBody DepositRequest request) throws Exception {
        Transaction transaction = depositService.processDeposit(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Deposit processed successfully", transaction));
    }
}
