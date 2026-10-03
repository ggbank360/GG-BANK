package com.ggbank.repository;

import com.ggbank.model.BillPayment;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class BillPaymentRepository {

    private static final String COLLECTION_NAME = "billPayments";

    @Autowired(required = false)
    private Firestore firestore;

    private final Map<String, BillPayment> memoryStore = new ConcurrentHashMap<>();

    public BillPayment save(BillPayment payment) throws Exception {
        if (payment.getBillId() == null || payment.getBillId().isEmpty()) {
            payment.setBillId("BILL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }

        if (firestore != null) {
            firestore.collection(COLLECTION_NAME).document(payment.getBillId()).set(payment).get();
        }
        memoryStore.put(payment.getBillId(), payment);
        return payment;
    }

    public List<BillPayment> findByUserId(String userId) throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).whereEqualTo("userId", userId).get().get();
            List<BillPayment> list = new ArrayList<>();
            for (QueryDocumentSnapshot doc : snapshot) {
                list.add(doc.toObject(BillPayment.class));
            }
            return list;
        }
        return memoryStore.values().stream()
                .filter(b -> b.getUserId() != null && b.getUserId().equals(userId))
                .collect(Collectors.toList());
    }
}
