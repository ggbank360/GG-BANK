package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.BudgetRequest;
import com.ggbank.model.Budget;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.BudgetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    @Autowired
    private BudgetService budgetService;

    @PostMapping
    public ResponseEntity<ApiResponse<Budget>> setBudget(@AuthenticationPrincipal UserPrincipal principal,
                                                         @Valid @RequestBody BudgetRequest request) throws Exception {
        if (request.getUserId() == null && principal != null) {
            request.setUserId(principal.getUid());
        }
        if (request.getUserId() == null) {
            request.setUserId("usr-gowtham-101");
        }
        Budget budget = budgetService.setBudget(request);
        return ResponseEntity.ok(ApiResponse.success("Budget saved successfully", budget));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Budget>>> getBudgetsForUser(@PathVariable String userId) throws Exception {
        List<Budget> list = budgetService.getBudgetsForUser(userId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Budget>>> getCurrentUserBudgets(@AuthenticationPrincipal UserPrincipal principal) throws Exception {
        String uid = principal != null ? principal.getUid() : "usr-gowtham-101";
        List<Budget> list = budgetService.getBudgetsForUser(uid);
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
