package com.ggbank.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.config.path:serviceAccountKey.json}")
    private String configPath;

    @Bean
    public FirebaseApp firebaseApp() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        // 1. Try FIREBASE_CONFIG_JSON environment variable directly (for Cloud Deployments)
        String envJson = System.getenv("FIREBASE_CONFIG_JSON");
        if (envJson != null && !envJson.trim().isEmpty()) {
            try {
                InputStream serviceAccount = new java.io.ByteArrayInputStream(envJson.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                log.info("GG BANK: Initializing Firebase Admin SDK from FIREBASE_CONFIG_JSON environment variable.");
                return FirebaseApp.initializeApp(options);
            } catch (Exception e) {
                log.warn("GG BANK: Failed initializing Firebase from FIREBASE_CONFIG_JSON: {}", e.getMessage());
            }
        }

        // 2. Try file system path or Classpath resource
        try {
            InputStream serviceAccount = null;
            java.io.File file = new java.io.File(configPath);
            if (file.exists() && file.isFile()) {
                serviceAccount = new java.io.FileInputStream(file);
            } else {
                ClassPathResource resource = new ClassPathResource(configPath);
                if (resource.exists()) {
                    serviceAccount = resource.getInputStream();
                }
            }

            if (serviceAccount != null) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                log.info("GG BANK: Initializing Firebase Admin SDK with service account credentials from {}.", configPath);
                return FirebaseApp.initializeApp(options);
            }
        } catch (Exception e) {
            log.warn("GG BANK: Firebase Service Account could not be loaded ({}), initializing in Academic Demo Mode.", e.getMessage());
        }

        // Fallback demo initialization for offline academic evaluation
        try {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.newBuilder().build())
                    .setProjectId("gg-bank-academic")
                    .build();
            return FirebaseApp.initializeApp(options);
        } catch (Exception e) {
            log.warn("GG BANK: Safe fallback mode active.");
            return null;
        }
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        if (firebaseApp != null) {
            try {
                return FirebaseAuth.getInstance(firebaseApp);
            } catch (Exception e) {
                log.warn("FirebaseAuth not bound to live project: {}", e.getMessage());
            }
        }
        return null;
    }

    @Bean
    public Firestore firestore(FirebaseApp firebaseApp) {
        if (firebaseApp != null) {
            try {
                return FirestoreClient.getFirestore(firebaseApp);
            } catch (Exception e) {
                log.warn("Firestore not bound to live project: {}", e.getMessage());
            }
        }
        return null;
    }
}
