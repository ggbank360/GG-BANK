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

        try {
            ClassPathResource resource = new ClassPathResource(configPath);
            if (resource.exists()) {
                InputStream serviceAccount = resource.getInputStream();
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                log.info("GG BANK: Initializing Firebase Admin SDK with service account credentials.");
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
