package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.TransferRequest;
import com.ggbank.model.Transaction;
import com.ggbank.service.TransferService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transfer")
public class TransferController {

    @Autowired
    private TransferService transferService;

    @PostMapping
    public ResponseEntity<ApiResponse<Transaction>> executeTransfer(@Valid @RequestBody TransferRequest request) throws Exception {
        Transaction transaction = transferService.executeTransfer(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Transfer completed successfully", transaction));
    }
}
