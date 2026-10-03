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
    * Generates a unique 12-digit account number.
     * Ensures strict collision resistance by querying Firestore.
     */
    public String generateUniqueAccountNumber() throws Exception {
        int maxAttempts = 100;
        for (int i = 0; i < maxAttempts; i++) {
            // Generate a 12-digit account number.
            long number = 100000000000L + (long)(RANDOM.nextDouble() * 899999999999L);
            String candidate = String.valueOf(number);

            // Verify collision in repository
            if (accountRepository.findByAccountNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        throw new IllegalStateException("Failed to generate a unique 12-digit account number after maximum attempts.");
    }
}
