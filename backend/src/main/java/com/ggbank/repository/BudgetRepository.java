package com.ggbank.repository;

import com.ggbank.model.Budget;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class BudgetRepository {

    private static final String COLLECTION_NAME = "budgets";

    @Autowired(required = false)
    private Firestore firestore;

    private final Map<String, Budget> memoryStore = new ConcurrentHashMap<>();

    public BudgetRepository() {
        Budget b1 = new Budget("b-1", "usr-gowtham-101", "Food", new BigDecimal("5000.00"), new BigDecimal("4250.00"), "2026-09", new Date().toString(), new Date().toString());
        Budget b2 = new Budget("b-2", "usr-gowtham-101", "Shopping", new BigDecimal("10000.00"), new BigDecimal("3400.00"), "2026-09", new Date().toString(), new Date().toString());
        memoryStore.put(b1.getBudgetId(), b1);
        memoryStore.put(b2.getBudgetId(), b2);
    }

    public Budget save(Budget budget) throws Exception {
        if (budget.getBudgetId() == null || budget.getBudgetId().isEmpty()) {
            budget.setBudgetId("b-" + UUID.randomUUID().toString().substring(0, 8));
        }

        if (firestore != null) {
            firestore.collection(COLLECTION_NAME).document(budget.getBudgetId()).set(budget).get();
        }
        memoryStore.put(budget.getBudgetId(), budget);
        return budget;
    }

    public List<Budget> findByUserId(String userId) throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).whereEqualTo("userId", userId).get().get();
            List<Budget> list = new ArrayList<>();
            for (QueryDocumentSnapshot doc : snapshot) {
                list.add(doc.toObject(Budget.class));
            }
            return list;
        }
        return memoryStore.values().stream()
                .filter(b -> b.getUserId() != null && b.getUserId().equals(userId))
                .collect(Collectors.toList());
    }

    public Optional<Budget> findByUserIdAndCategory(String userId, String category) throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME)
                    .whereEqualTo("userId", userId)
                    .whereEqualTo("category", category)
                    .get().get();
            if (!snapshot.isEmpty()) {
                return Optional.ofNullable(snapshot.getDocuments().get(0).toObject(Budget.class));
            }
        }
        return memoryStore.values().stream()
                .filter(b -> b.getUserId() != null && b.getUserId().equals(userId) && b.getCategory() != null && b.getCategory().equalsIgnoreCase(category))
                .findFirst();
    }
}
