package com.ggbank.service;

import com.ggbank.dto.CustomerStatusRequest;
import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Account;
import com.ggbank.model.User;
import com.ggbank.repository.AccountRepository;
import com.ggbank.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AccountAdminService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private NotificationService notificationService;

    public List<Map<String, Object>> getAllAccountsDetailed() throws Exception {
        List<Account> accounts = accountRepository.findAll();
        List<User> users = userRepository.findAll();

        Map<String, User> userMap = new HashMap<>();
        for (User u : users) {
            userMap.put(u.getUserId(), u);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Account a : accounts) {
            Map<String, Object> map = new HashMap<>();
            map.put("accountId", a.getAccountId());
            map.put("userId", a.getUserId());
            map.put("accountNumber", a.getAccountNumber());
            map.put("accountType", a.getAccountType());
            map.put("balance", a.getBalance());
            map.put("ifscCode", a.getIfscCode());
            map.put("branch", a.getBranch());
            map.put("status", a.getStatus());
            map.put("createdAt", a.getCreatedAt());

            User u = userMap.get(a.getUserId());
            if (u != null) {
                map.put("customerName", u.getName());
                map.put("customerEmail", u.getEmail());
                map.put("customerPhone", u.getPhone());
            } else {
                map.put("customerName", "Unknown");
                map.put("customerEmail", "N/A");
                map.put("customerPhone", "N/A");
            }
            result.add(map);
        }
        return result;
    }

    public Account getAccountById(String accountId) throws Exception {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + accountId));
    }

    public Account updateAccountStatus(String accountId, String adminId, CustomerStatusRequest req) throws Exception {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + accountId));

        String newStatus = req.getStatus().toUpperCase();
        account.setStatus(newStatus);
        auditService.log(account.getUserId(), adminId != null ? adminId : "ADMIN", "ACCOUNT_STATUS_CHANGE",
                String.format("Changed account status for %s to %s", account.getAccountNumber(), newStatus), "SUCCESS");

        notificationService.send(account.getUserId(), "Account Status Notice",
                String.format("Your bank account (%s) status has been updated to %s.", account.getAccountNumber(), newStatus), "SECURITY");

        return account;
    }

    public Account createAccountDirect(Map<String, Object> req, String adminId) throws Exception {
        String userId = (String) req.get("userId");
        if (userId == null || userId.trim().isEmpty()) {
            userId = "usr-" + UUID.randomUUID().toString().substring(0, 8);
            User newUser = new User();
            newUser.setUserId(userId);
            newUser.setName((String) req.getOrDefault("customerName", "New Customer"));
            newUser.setEmail((String) req.getOrDefault("customerEmail", "customer." + userId + "@ggbank.com"));
            newUser.setPhone((String) req.getOrDefault("customerPhone", "+91 9876543210"));
            newUser.setRole("CUSTOMER");
            newUser.setStatus("ACTIVE");
            newUser.setCreatedAt(LocalDateTime.now().toString());
            newUser.setUpdatedAt(LocalDateTime.now().toString());
            userRepository.save(newUser);
        }

        String accountNumber = (String) req.get("accountNumber");
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            long number = 10000000000L + (long)(new Random().nextDouble() * 90000000000L);
            accountNumber = String.valueOf(number);
        }

        java.math.BigDecimal balance = java.math.BigDecimal.ZERO;
        if (req.get("balance") != null) {
            balance = new java.math.BigDecimal(req.get("balance").toString());
        }

        Account account = new Account();
        account.setAccountId("acc-" + UUID.randomUUID().toString().substring(0, 8));
        account.setUserId(userId);
        account.setAccountNumber(accountNumber);
        account.setAccountType((String) req.getOrDefault("accountType", "SAVINGS"));
        account.setBalance(balance);
        account.setIfscCode((String) req.getOrDefault("ifscCode", "GGBN0001234"));
        account.setBranch((String) req.getOrDefault("branch", "Central Tech Branch"));
        account.setStatus((String) req.getOrDefault("status", "ACTIVE"));
        account.setCreatedAt(LocalDateTime.now().toString());
        account.setUpdatedAt(LocalDateTime.now().toString());

        accountRepository.save(account);

        auditService.log(userId, adminId != null ? adminId : "ADMIN", "ADMIN_ACCOUNT_CREATED",
                String.format("Admin created 11-digit account %s for user %s", accountNumber, userId), "SUCCESS");

        return account;
    }

    public void deleteAccount(String accountId, String adminId) throws Exception {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + accountId));

        accountRepository.deleteById(accountId);

        auditService.log(account.getUserId(), adminId != null ? adminId : "ADMIN", "ADMIN_ACCOUNT_DELETED",
                String.format("Admin deleted account %s", account.getAccountNumber()), "SUCCESS");
    }

    public void clearAllAccounts(String adminId) throws Exception {
        List<Account> accounts = accountRepository.findAll();
        for (Account a : accounts) {
            accountRepository.deleteById(a.getAccountId());
        }
        auditService.log(null, adminId != null ? adminId : "ADMIN", "ADMIN_CLEAR_ALL_ACCOUNTS",
                String.format("Admin cleared all %d account records", accounts.size()), "SUCCESS");
    }
}
