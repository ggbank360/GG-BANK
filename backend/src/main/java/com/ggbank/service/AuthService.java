package com.ggbank.service;

import com.ggbank.dto.AuthRequest;
import com.ggbank.dto.AuthResponse;
import com.ggbank.exception.AccountInactiveException;
import com.ggbank.exception.BankingException;
import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Account;
import com.ggbank.model.User;
import com.ggbank.repository.AccountRepository;
import com.ggbank.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditService auditService;

    public AuthResponse login(AuthRequest request) throws Exception {
        String accNum = request.getAccountNumber().trim();

        // 1. Find account by 11-digit number
        Account account = accountRepository.findByAccountNumber(accNum)
                .orElseThrow(() -> new ResourceNotFoundException("Account number " + accNum + " not found."));

        // 2. Check account status
        if ("BLOCKED".equalsIgnoreCase(account.getStatus())) {
            throw new AccountInactiveException("Account is blocked. Please contact GG BANK administration.");
        }

        // 3. Find linked user
        User user = userRepository.findById(account.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found for account."));

        // 4. Generate authenticated token
        String token = "gg-jwt-" + UUID.randomUUID().toString();

        // 5. Audit Log
        auditService.log(user.getUserId(), null, "LOGIN", "Customer logged in with 11-digit account " + accNum, "SUCCESS");

        return new AuthResponse(token, user, account);
    }
}
