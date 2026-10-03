package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.LoanActionRequest;
import com.ggbank.model.Loan;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.LoanAdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/loans")
public class LoanAdminController {

    @Autowired
    private LoanAdminService loanAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Loan>>> getAllLoans() throws Exception {
        List<Loan> list = loanAdminService.getAllLoans();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{loanId}")
    public ResponseEntity<ApiResponse<Loan>> getLoanById(@PathVariable String loanId) throws Exception {
        Loan loan = loanAdminService.getLoanById(loanId);
        return ResponseEntity.ok(ApiResponse.success(loan));
    }

    @PutMapping("/{loanId}/approve")
    public ResponseEntity<ApiResponse<Loan>> approveLoan(@AuthenticationPrincipal UserPrincipal principal,
                                                         @PathVariable String loanId,
                                                         @RequestBody(required = false) LoanActionRequest request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        LoanActionRequest action = request != null ? request : new LoanActionRequest("Approved by Loan Officer");
        Loan loan = loanAdminService.approveLoan(loanId, adminId, action);
        return ResponseEntity.ok(ApiResponse.success("Loan approved and funds credited successfully", loan));
    }

    @PutMapping("/{loanId}/reject")
    public ResponseEntity<ApiResponse<Loan>> rejectLoan(@AuthenticationPrincipal UserPrincipal principal,
                                                        @PathVariable String loanId,
                                                        @RequestBody(required = false) LoanActionRequest request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        LoanActionRequest action = request != null ? request : new LoanActionRequest("Declined per policy");
        Loan loan = loanAdminService.rejectLoan(loanId, adminId, action);
        return ResponseEntity.ok(ApiResponse.success("Loan application rejected", loan));
    }

    @DeleteMapping("/{loanId}")
    public ResponseEntity<ApiResponse<String>> deleteLoan(@AuthenticationPrincipal UserPrincipal principal,
                                                          @PathVariable String loanId) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        loanAdminService.deleteLoan(loanId, adminId);
        return ResponseEntity.ok(ApiResponse.success("Loan record deleted successfully", loanId));
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<ApiResponse<String>> clearAllLoans(@AuthenticationPrincipal UserPrincipal principal) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        loanAdminService.clearAllLoans(adminId);
        return ResponseEntity.ok(ApiResponse.success("All loan application records deleted", null));
    }
}
