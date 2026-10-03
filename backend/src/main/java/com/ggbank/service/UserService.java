package com.ggbank.service;

import com.ggbank.dto.UserRegistrationRequest;
import com.ggbank.exception.BankingException;
import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Account;
import com.ggbank.model.User;
import com.ggbank.repository.AccountRepository;
import com.ggbank.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private AccountNumberGeneratorService accountNumberGeneratorService;

    public Map<String, Object> registerUser(UserRegistrationRequest req) throws Exception {
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new BankingException("A user with this email address already exists.");
        }

        String userId = "usr-" + UUID.randomUUID().toString().substring(0, 8);
        String now = LocalDateTime.now().toString();

        User user = new User();
        user.setUserId(userId);
        user.setName(req.getName());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());
        user.setDateOfBirth(req.getDateOfBirth());
        user.setAddress(req.getAddress());
        user.setRole("CUSTOMER");
        user.setStatus("ACTIVE");
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        userRepository.save(user);

        // Generate unique 11-digit account number
        String accountNumber = accountNumberGeneratorService.generateUniqueAccountNumber();

        Account account = new Account();
        account.setAccountId("acc-" + UUID.randomUUID().toString().substring(0, 8));
        account.setUserId(userId);
        account.setAccountNumber(accountNumber);
        account.setAccountType(req.getAccountType() != null ? req.getAccountType() : "SAVINGS");
        account.setBalance(BigDecimal.ZERO);
        account.setIfscCode("GGBN0001234");
        account.setBranch("Central Tech Branch");
        account.setStatus("ACTIVE");
        account.setCreatedAt(now);
        account.setUpdatedAt(now);
        accountRepository.save(account);

        auditService.log(userId, null, "ACCOUNT_CREATED", "Registered new account: " + accountNumber, "SUCCESS");
        notificationService.send(userId, "Welcome to GG BANK!", "Your 11-digit account number " + accountNumber + " has been successfully created.", "SYSTEM");

        Map<String, Object> result = new HashMap<>();
        result.put("user", user);
        result.put("account", account);
        return result;
    }

    public User getUserById(String userId) throws Exception {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));
    }

    public List<User> getAllUsers() throws Exception {
        return userRepository.findAll();
    }
}
