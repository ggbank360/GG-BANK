package com.ggbank.service;

import com.ggbank.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class AccountNumberGeneratorService {

    @Autowired
    private AccountRepository accountRepository;

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Generates a unique 11-digit account number (starting with 100188).
     * Ensures strict collision resistance by querying Firestore.
     */
    public String generateUniqueAccountNumber() throws Exception {
        int maxAttempts = 100;
        for (int i = 0; i < maxAttempts; i++) {
            // Generate an 11-digit account number (100188 + 5 digits)
            long number = 10018800000L + (long)(RANDOM.nextDouble() * 99999L);
            String candidate = String.valueOf(number);

            // Verify collision in repository
            if (accountRepository.findByAccountNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        throw new IllegalStateException("Failed to generate a unique 11-digit account number after maximum attempts.");
    }
}
