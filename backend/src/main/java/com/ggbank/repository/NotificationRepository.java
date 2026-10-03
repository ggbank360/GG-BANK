package com.ggbank.repository;

import com.ggbank.model.Notification;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class NotificationRepository {

    private static final String COLLECTION_NAME = "notifications";

    @Autowired(required = false)
    private Firestore firestore;

    private final Map<String, Notification> memoryStore = new ConcurrentHashMap<>();

    public NotificationRepository() {
        Notification n1 = new Notification("notif-1", "usr-gowtham-101", "Deposit Received", "₹22,850.00 has been credited to your account 10018849201.", "TRANSACTION", false, new Date().toString());
        Notification n2 = new Notification("notif-2", "usr-gowtham-101", "Budget Alert", "You have used 85% of your monthly Food budget.", "BUDGET", false, new Date().toString());
        memoryStore.put(n1.getNotificationId(), n1);
        memoryStore.put(n2.getNotificationId(), n2);
    }

    public Notification save(Notification notification) throws Exception {
        if (notification.getNotificationId() == null || notification.getNotificationId().isEmpty()) {
            notification.setNotificationId("notif-" + UUID.randomUUID().toString().substring(0, 8));
        }

        if (firestore != null) {
            firestore.collection(COLLECTION_NAME).document(notification.getNotificationId()).set(notification).get();
        }
        memoryStore.put(notification.getNotificationId(), notification);
        return notification;
    }

    public List<Notification> findByUserId(String userId) throws Exception {
        if (firestore != null) {
            QuerySnapshot userSnap = firestore.collection(COLLECTION_NAME).whereEqualTo("userId", userId).get().get();
            QuerySnapshot allSnap = firestore.collection(COLLECTION_NAME).whereEqualTo("userId", "ALL").get().get();

            Set<Notification> set = new HashSet<>();
            for (QueryDocumentSnapshot doc : userSnap) set.add(doc.toObject(Notification.class));
            for (QueryDocumentSnapshot doc : allSnap) set.add(doc.toObject(Notification.class));
            return new ArrayList<>(set);
        }

        return memoryStore.values().stream()
                .filter(n -> n.getUserId() != null && (n.getUserId().equals(userId) || n.getUserId().equals("ALL")))
                .collect(Collectors.toList());
    }

    public Optional<Notification> findById(String notificationId) throws Exception {
        if (firestore != null) {
            DocumentSnapshot doc = firestore.collection(COLLECTION_NAME).document(notificationId).get().get();
            if (doc.exists()) {
                return Optional.ofNullable(doc.toObject(Notification.class));
            }
        }
        return Optional.ofNullable(memoryStore.get(notificationId));
    }
}
