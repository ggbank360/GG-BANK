package com.ggbank.repository;

import com.ggbank.model.Loan;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class LoanRepository {

    private static final String COLLECTION_NAME = "loans";

    @Autowired(required = false)
    private Firestore firestore;

    private final Map<String, Loan> memoryStore = new ConcurrentHashMap<>();

    public LoanRepository() {
        Loan l1 = new Loan("LOAN-849102", "usr-gowtham-101", "10018849201", "Personal Loan", new BigDecimal("100000.00"), new BigDecimal("65000.00"), 24, 10.5, new BigDecimal("4637.00"), new BigDecimal("11288.00"), new BigDecimal("111288.00"), "Home renovation", "PENDING", "Under initial verification", new Date().toString(), new Date().toString());
        memoryStore.put(l1.getLoanId(), l1);
    }

    public Loan save(Loan loan) throws Exception {
        if (loan.getLoanId() == null || loan.getLoanId().isEmpty()) {
            loan.setLoanId("LOAN-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }

        if (firestore != null) {
            firestore.collection(COLLECTION_NAME).document(loan.getLoanId()).set(loan).get();
        }
        memoryStore.put(loan.getLoanId(), loan);
        return loan;
    }

    public Optional<Loan> findById(String loanId) throws Exception {
        if (firestore != null) {
            DocumentSnapshot doc = firestore.collection(COLLECTION_NAME).document(loanId).get().get();
            if (doc.exists()) {
                return Optional.ofNullable(doc.toObject(Loan.class));
            }
        }
        return Optional.ofNullable(memoryStore.get(loanId));
    }

    public List<Loan> findByUserId(String userId) throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).whereEqualTo("userId", userId).get().get();
            List<Loan> list = new ArrayList<>();
            for (QueryDocumentSnapshot doc : snapshot) {
                list.add(doc.toObject(Loan.class));
            }
            return list;
        }
        return memoryStore.values().stream()
                .filter(l -> l.getUserId() != null && l.getUserId().equals(userId))
                .collect(Collectors.toList());
    }

    public List<Loan> findAll() throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).get().get();
            List<Loan> list = new ArrayList<>();
            for (QueryDocumentSnapshot doc : snapshot) {
                list.add(doc.toObject(Loan.class));
            }
            return list;
        }
        return new ArrayList<>(memoryStore.values());
    }
}
