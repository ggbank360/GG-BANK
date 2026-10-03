package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.model.Transaction;
import com.ggbank.service.TransferAdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/transfers")
public class TransferAdminController {

    @Autowired
    private TransferAdminService transferAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Transaction>>> getAllTransfers() throws Exception {
        List<Transaction> list = transferAdminService.getAllTransfers();
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
