package com.ggbank.controller;

import com.ggbank.dto.AdminStatsResponse;
import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.CustomerStatusRequest;
import com.ggbank.dto.LoanActionRequest;
import com.ggbank.model.Account;
import com.ggbank.model.AuditLog;
import com.ggbank.model.Loan;
import com.ggbank.model.Transaction;
import com.ggbank.model.User;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.AccountService;
import com.ggbank.service.AdminService;
import com.ggbank.service.AuditService;
import com.ggbank.service.LoanService;
import com.ggbank.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private LoanService loanService;

    @Autowired
    private AuditService auditService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStatsResponse>> getDashboardStats() throws Exception {
        AdminStatsResponse stats = adminService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
