package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.model.Transaction;
import com.ggbank.service.WithdrawalAdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/withdrawals")
public class WithdrawalAdminController {

    @Autowired
    private WithdrawalAdminService withdrawalAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Transaction>>> getAllWithdrawals() throws Exception {
        List<Transaction> list = withdrawalAdminService.getAllWithdrawals();
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
