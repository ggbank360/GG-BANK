package com.ggbank.repository;

import com.ggbank.model.Transaction;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Repository
public class TransactionRepository {

    private static final String COLLECTION_NAME = "transactions";

    @Autowired(required = false)
    private Firestore firestore;

    private final List<Transaction> memoryStore = new CopyOnWriteArrayList<>();

    public TransactionRepository() {
        Transaction t1 = new Transaction("TXN-2026-908101", "EXTERNAL-DEP", "10018849201", new BigDecimal("50000.00"), "DEPOSIT", "Salary", "Monthly Salary Credit", "COMPLETED", new BigDecimal("50000.00"), new Date().toString());
        Transaction t2 = new Transaction("TXN-2026-908102", "10018849201", "10018849202", new BigDecimal("5000.00"), "TRANSFER", "Transfer", "Project Collab Payment", "COMPLETED", new BigDecimal("45000.00"), new Date().toString());
        Transaction t3 = new Transaction("TXN-2026-908103", "10018849201", "BESCOM-ELEC", new BigDecimal("1550.00"), "BILL_PAYMENT", "Bills", "Electricity Bill - BESCOM", "COMPLETED", new BigDecimal("43450.00"), new Date().toString());
        Transaction t4 = new Transaction("TXN-2026-908104", "10018849201", "ZOMATO-FOOD", new BigDecimal("850.00"), "WITHDRAWAL", "Food", "Weekend Dining & Food Order", "COMPLETED", new BigDecimal("42600.00"), new Date().toString());
        Transaction t5 = new Transaction("TXN-2026-908105", "EXTERNAL-DEP", "10018849201", new BigDecimal("22850.00"), "DEPOSIT", "Other", "Freelance Tech Consultation", "COMPLETED", new BigDecimal("65450.00"), new Date().toString());
        
        memoryStore.add(t1);
        memoryStore.add(t2);
        memoryStore.add(t3);
        memoryStore.add(t4);
        memoryStore.add(t5);
    }

    public Transaction save(Transaction txn) throws Exception {
        if (txn.getTransactionId() == null || txn.getTransactionId().isEmpty()) {
            txn.setTransactionId("TXN-2026-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }

        if (firestore != null) {
            firestore.collection(COLLECTION_NAME).document(txn.getTransactionId()).set(txn).get();
        }
        memoryStore.add(0, txn);
        return txn;
    }

    public List<Transaction> findByAccountNumber(String accountNumber) throws Exception {
        if (firestore != null) {
            QuerySnapshot senderSnap = firestore.collection(COLLECTION_NAME).whereEqualTo("senderAccount", accountNumber).get().get();
            QuerySnapshot receiverSnap = firestore.collection(COLLECTION_NAME).whereEqualTo("receiverAccount", accountNumber).get().get();

            Set<Transaction> set = new HashSet<>();
            for (QueryDocumentSnapshot doc : senderSnap) {
                set.add(doc.toObject(Transaction.class));
            }
            for (QueryDocumentSnapshot doc : receiverSnap) {
                set.add(doc.toObject(Transaction.class));
            }
            return new ArrayList<>(set);
        }

        return memoryStore.stream()
                .filter(t -> (t.getSenderAccount() != null && t.getSenderAccount().equals(accountNumber)) ||
                             (t.getReceiverAccount() != null && t.getReceiverAccount().equals(accountNumber)))
                .collect(Collectors.toList());
    }

    public List<Transaction> findAll() throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).get().get();
            List<Transaction> list = new ArrayList<>();
            for (QueryDocumentSnapshot doc : snapshot) {
                list.add(doc.toObject(Transaction.class));
            }
            return list;
        }
        return new ArrayList<>(memoryStore);
    }
}
