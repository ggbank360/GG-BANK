package com.ggbank.service;

import com.ggbank.dto.BudgetRequest;
import com.ggbank.model.Budget;
import com.ggbank.repository.BudgetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class BudgetService {

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private NotificationService notificationService;

    public Budget setBudget(BudgetRequest req) throws Exception {
        Optional<Budget> existingOpt = budgetRepository.findByUserIdAndCategory(req.getUserId(), req.getCategory());
        String now = LocalDateTime.now().toString();

        Budget budget;
        if (existingOpt.isPresent()) {
            budget = existingOpt.get();
            budget.setLimitAmount(req.getLimitAmount());
            budget.setUpdatedAt(now);
        } else {
            budget = new Budget();
            budget.setUserId(req.getUserId());
            budget.setCategory(req.getCategory());
            budget.setLimitAmount(req.getLimitAmount());
            budget.setSpent(BigDecimal.ZERO);
            budget.setMonth(req.getMonth() != null ? req.getMonth() : "2026-09");
            budget.setCreatedAt(now);
            budget.setUpdatedAt(now);
        }

        budgetRepository.save(budget);
        return budget;
    }

    public List<Budget> getBudgetsForUser(String userId) throws Exception {
        return budgetRepository.findByUserId(userId);
    }
}
