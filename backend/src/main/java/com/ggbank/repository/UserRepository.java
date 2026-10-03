package com.ggbank.repository;

import com.ggbank.model.User;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class UserRepository {

    private static final String COLLECTION_NAME = "users";

    @Autowired(required = false)
    private Firestore firestore;

    // Concurrent in-memory fallback cache
    private final Map<String, User> memoryStore = new ConcurrentHashMap<>();

    public UserRepository() {
        // Seed default demo users
        User u1 = new User("usr-gowtham-101", "Gowtham NK", "gowtham@ggbank.com", "9876543210", "2003-05-14", "42 Cyber City, Tech Park, Bangalore", "CUSTOMER", "ACTIVE", new Date().toString(), new Date().toString());
        User u2 = new User("usr-admin-999", "GG Bank Administrator", "admin@ggbank.com", "9000000000", "1995-01-01", "GG BANK Headquarters, Financial Tower", "ADMIN", "ACTIVE", new Date().toString(), new Date().toString());
        memoryStore.put(u1.getUserId(), u1);
        memoryStore.put(u2.getUserId(), u2);
    }

    public User save(User user) throws Exception {
        if (user.getUserId() == null || user.getUserId().isEmpty()) {
            user.setUserId("usr-" + UUID.randomUUID().toString().substring(0, 8));
        }

        if (firestore != null) {
            firestore.collection(COLLECTION_NAME).document(user.getUserId()).set(user).get();
        }
        memoryStore.put(user.getUserId(), user);
        return user;
    }

    public Optional<User> findById(String userId) throws Exception {
        if (firestore != null) {
            DocumentSnapshot doc = firestore.collection(COLLECTION_NAME).document(userId).get().get();
            if (doc.exists()) {
                return Optional.ofNullable(doc.toObject(User.class));
            }
        }
        return Optional.ofNullable(memoryStore.get(userId));
    }

    public Optional<User> findByEmail(String email) throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).whereEqualTo("email", email).get().get();
            if (!snapshot.isEmpty()) {
                return Optional.ofNullable(snapshot.getDocuments().get(0).toObject(User.class));
            }
        }
        return memoryStore.values().stream()
                .filter(u -> u.getEmail() != null && u.getEmail().equalsIgnoreCase(email))
                .findFirst();
    }

    public List<User> findAll() throws Exception {
        if (firestore != null) {
            QuerySnapshot snapshot = firestore.collection(COLLECTION_NAME).get().get();
            List<User> list = new ArrayList<>();
            for (QueryDocumentSnapshot doc : snapshot) {
                list.add(doc.toObject(User.class));
            }
            return list;
        }
        return new ArrayList<>(memoryStore.values());
    }
}
