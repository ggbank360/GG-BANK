package com.ggbank.repository;

import com.ggbank.model.Account;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class AccountRepository {

    private static final String COLLECTION_NAME = "accounts";

    @Autowired(required = false)
    private Firestore firestore;

    private final Map<String, Account> memoryStore = new ConcurrentHashMap<>();

    public AccountRepository() {
        Account a1 = new Account("acc-gowtham-101", "usr-gowtham-101", "10018849201", "SAVINGS", new BigDecimal("65450.00"), "GGBN0001234", "Central Tech Branch", "ACTIVE", new Date().toString(), new Date().toString());
        Account a2 = new Account("acc-sarah-102", "usr-sarah-102", "10018849202", "SAVINGS", new BigDecimal("32000.00"), "GGBN0001234", "Central Tech Branch", "ACTIVE", new Date().toString(), new Date().toString());
        memoryStore.put(a1.getAccountId(), a1);
        memoryStore.put(a2.getAccountId(), a2);
    }

    public Account save(Account account) throws Exception {
        if (account.getAccountId() == null || account.getAccountId().isEmpty()) {
            account.setAccountId("acc-" + UUID.randomUUID().toString().substring(0, 8));
        }

        if (firestore != null) {
            firestore.collection(COLLECTION_NAME).document(account.getAccountId()).set(account).get();
        }
        memoryStore.put(account.getAccountId(), account);
        return account;
    }

    public Optional<Account> findById(String accountId) throws Exception {
        if (firestore != null) {
            DocumentSnapshot doc = firestore.collection(COLLECTION_NAME).document(accountId).get().get();
            if (doc.exists()) {
                return Optional.ofNullable(doc.toObject(Account.class));
            }
        }
        return Optional.ofNullable(memoryStore.get(accountId));
    }

    public Optional<Account> findByUserId(String userId) throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).whereEqualTo("userId", userId).get().get();
            if (!snapshot.isEmpty()) {
                return Optional.ofNullable(snapshot.getDocuments().get(0).toObject(Account.class));
            }
        }
        return memoryStore.values().stream()
                .filter(a -> a.getUserId() != null && a.getUserId().equals(userId))
                .findFirst();
    }

    public Optional<Account> findByAccountNumber(String accountNumber) throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).whereEqualTo("accountNumber", accountNumber).get().get();
            if (!snapshot.isEmpty()) {
                return Optional.ofNullable(snapshot.getDocuments().get(0).toObject(Account.class));
            }
        }
        return memoryStore.values().stream()
                .filter(a -> a.getAccountNumber() != null && a.getAccountNumber().equals(accountNumber))
                .findFirst();
    }

    public List<Account> findAll() throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).get().get();
            List<Account> list = new ArrayList<>();
            for (QueryDocumentSnapshot doc : snapshot) {
                list.add(doc.toObject(Account.class));
            }
            return list;
        }
        return new ArrayList<>(memoryStore.values());
    }
}
