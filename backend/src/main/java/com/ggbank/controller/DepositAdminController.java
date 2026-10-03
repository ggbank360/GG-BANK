package com.ggbank.controller;

import com.ggbank.dto.AdminDepositRequest;
import com.ggbank.dto.ApiResponse;
import com.ggbank.model.Transaction;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.DepositAdminService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/deposits")
public class DepositAdminController {

    @Autowired
    private DepositAdminService depositAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Transaction>>> getAllDeposits() throws Exception {
        List<Transaction> list = depositAdminService.getAllDeposits();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/credit")
    public ResponseEntity<ApiResponse<Transaction>> executeAdminDeposit(@AuthenticationPrincipal UserPrincipal principal,
                                                                       @Valid @RequestBody AdminDepositRequest request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        Transaction txn = depositAdminService.executeAdminDeposit(adminId, request);
        return ResponseEntity.ok(ApiResponse.success("Deposit executed and account credited successfully", txn));
    }
}
