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

    @GetMapping("/customers")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllCustomers() throws Exception {
        List<Map<String, Object>> list = adminService.getAllCustomersDetailed();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PutMapping("/customers/{userId}/status")
    public ResponseEntity<ApiResponse<User>> updateCustomerStatus(@AuthenticationPrincipal UserPrincipal principal,
                                                                 @PathVariable String userId,
                                                                 @Valid @RequestBody CustomerStatusRequest request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        User user = adminService.updateCustomerStatus(userId, adminId, request);
        return ResponseEntity.ok(ApiResponse.success("Customer status updated successfully", user));
    }

    @GetMapping("/accounts")
    public ResponseEntity<ApiResponse<List<Account>>> getAllAccounts() throws Exception {
        List<Account> accounts = accountService.getAllAccounts();
        return ResponseEntity.ok(ApiResponse.success(accounts));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<Transaction>>> getAllTransactions() throws Exception {
        List<Transaction> list = transactionService.getAllTransactions();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/loans")
    public ResponseEntity<ApiResponse<List<Loan>>> getAllLoans() throws Exception {
        List<Loan> list = loanService.getAllLoans();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PutMapping("/loans/{loanId}/approve")
    public ResponseEntity<ApiResponse<Loan>> approveLoan(@AuthenticationPrincipal UserPrincipal principal,
                                                         @PathVariable String loanId,
                                                         @RequestBody(required = false) LoanActionRequest request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        LoanActionRequest action = request != null ? request : new LoanActionRequest("Approved by Loan Officer");
        Loan loan = loanService.approveLoan(loanId, adminId, action);
        return ResponseEntity.ok(ApiResponse.success("Loan approved and funds credited successfully", loan));
    }

    @PutMapping("/loans/{loanId}/reject")
    public ResponseEntity<ApiResponse<Loan>> rejectLoan(@AuthenticationPrincipal UserPrincipal principal,
                                                        @PathVariable String loanId,
                                                        @RequestBody(required = false) LoanActionRequest request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        LoanActionRequest action = request != null ? request : new LoanActionRequest("Declined per policy");
        Loan loan = loanService.rejectLoan(loanId, adminId, action);
        return ResponseEntity.ok(ApiResponse.success("Loan application rejected", loan));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs() throws Exception {
        List<AuditLog> list = auditService.getAllLogs();
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
