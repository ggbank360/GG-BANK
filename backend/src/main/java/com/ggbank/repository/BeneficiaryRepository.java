package com.ggbank.repository;

import com.ggbank.model.Beneficiary;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class BeneficiaryRepository {

    private static final String COLLECTION_NAME = "beneficiaries";

    @Autowired(required = false)
    private Firestore firestore;

    private final Map<String, Beneficiary> memoryStore = new ConcurrentHashMap<>();

    public BeneficiaryRepository() {
        Beneficiary b1 = new Beneficiary("ben-001", "usr-gowtham-101", "Sarah Connor", "10018849202", "GGBN0001234", "GG BANK", new Date().toString());
        memoryStore.put(b1.getBeneficiaryId(), b1);
    }

    public Beneficiary save(Beneficiary beneficiary) throws Exception {
        if (beneficiary.getBeneficiaryId() == null || beneficiary.getBeneficiaryId().isEmpty()) {
            beneficiary.setBeneficiaryId("ben-" + UUID.randomUUID().toString().substring(0, 8));
        }

        if (firestore != null) {
            firestore.collection(COLLECTION_NAME).document(beneficiary.getBeneficiaryId()).set(beneficiary).get();
        }
        memoryStore.put(beneficiary.getBeneficiaryId(), beneficiary);
        return beneficiary;
    }

    public List<Beneficiary> findByUserId(String userId) throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).whereEqualTo("userId", userId).get().get();
            List<Beneficiary> list = new ArrayList<>();
            for (QueryDocumentSnapshot doc : snapshot) {
                list.add(doc.toObject(Beneficiary.class));
            }
            return list;
        }
        return memoryStore.values().stream()
                .filter(b -> b.getUserId() != null && b.getUserId().equals(userId))
                .collect(Collectors.toList());
    }

    public void deleteById(String beneficiaryId) throws Exception {
        if (firestore != null) {
            firestore.collection(COLLECTION_NAME).document(beneficiaryId).delete().get();
        }
        memoryStore.remove(beneficiaryId);
    }
}
