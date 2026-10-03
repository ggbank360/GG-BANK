package com.ggbank.repository;

import com.ggbank.model.AuditLog;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

@Repository
public class AuditLogRepository {

    private static final String COLLECTION_NAME = "auditLogs";

    @Autowired(required = false)
    private Firestore firestore;

    private final List<AuditLog> memoryStore = new CopyOnWriteArrayList<>();

    public AuditLogRepository() {
        AuditLog log1 = new AuditLog("LOG-1001", "usr-gowtham-101", null, "USER_REGISTRATION", "Account registered for Gowtham NK", new Date(System.currentTimeMillis() - 86400000 * 5).toString(), "SUCCESS", "127.0.0.1");
        AuditLog log2 = new AuditLog("LOG-1002", "usr-gowtham-101", null, "LOGIN", "Customer login from web portal", new Date().toString(), "SUCCESS", "127.0.0.1");
        memoryStore.add(log1);
        memoryStore.add(log2);
    }

    public AuditLog save(AuditLog log) throws Exception {
        if (log.getLogId() == null || log.getLogId().isEmpty()) {
            log.setLogId("LOG-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }

        if (firestore != null) {
            firestore.collection(COLLECTION_NAME).document(log.getLogId()).set(log).get();
        }
        memoryStore.add(0, log);
        return log;
    }

    public List<AuditLog> findAll() throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).get().get();
            List<AuditLog> list = new ArrayList<>();
            for (QueryDocumentSnapshot doc : snapshot) {
                list.add(doc.toObject(AuditLog.class));
            }
            return list;
        }
        return new ArrayList<>(memoryStore);
    }
}
