package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.LoanActionRequest;
import com.ggbank.dto.LoanApplicationRequest;
import com.ggbank.model.Loan;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.LoanService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    @Autowired
    private LoanService loanService;

    @PostMapping
    public ResponseEntity<ApiResponse<Loan>> applyLoan(@AuthenticationPrincipal UserPrincipal principal,
                                                       @Valid @RequestBody LoanApplicationRequest request) throws Exception {
        String uid = principal != null ? principal.getUid() : "usr-gowtham-101";
        Loan loan = loanService.applyForLoan(uid, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Loan application submitted", loan));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Loan>>> getLoansForUser(@PathVariable String userId) throws Exception {
        List<Loan> loans = loanService.getLoansForUser(userId);
        return ResponseEntity.ok(ApiResponse.success(loans));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Loan>>> getAllLoans() throws Exception {
        List<Loan> loans = loanService.getAllLoans();
        return ResponseEntity.ok(ApiResponse.success(loans));
    }
}
