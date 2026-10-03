package com.ggbank.service;

import com.ggbank.dto.CustomerStatusRequest;
import com.ggbank.dto.CustomerUpdateRequest;
import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Account;
import com.ggbank.model.Loan;
import com.ggbank.model.Transaction;
import com.ggbank.model.User;
import com.ggbank.repository.AccountRepository;
import com.ggbank.repository.LoanRepository;
import com.ggbank.repository.TransactionRepository;
import com.ggbank.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CustomerAdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private NotificationService notificationService;

    public List<Map<String, Object>> getAllCustomersDetailed() throws Exception {
        List<User> users = userRepository.findAll();
        List<Account> accounts = accountRepository.findAll();

        List<Map<String, Object>> result = new ArrayList<>();
        for (User u : users) {
            if ("CUSTOMER".equalsIgnoreCase(u.getRole())) {
                Map<String, Object> map = new HashMap<>();
                map.put("userId", u.getUserId());
                map.put("name", u.getName());
                map.put("email", u.getEmail());
                map.put("phone", u.getPhone());
                map.put("dateOfBirth", u.getDateOfBirth());
                map.put("address", u.getAddress());
                map.put("role", u.getRole());
                map.put("status", u.getStatus());
                map.put("createdAt", u.getCreatedAt());

                Optional<Account> accOpt = accounts.stream().filter(a -> a.getUserId().equals(u.getUserId())).findFirst();
                if (accOpt.isPresent()) {
                    Account a = accOpt.get();
                    map.put("accountId", a.getAccountId());
                    map.put("accountNumber", a.getAccountNumber());
                    map.put("accountType", a.getAccountType());
                    map.put("balance", a.getBalance());
                    map.put("ifscCode", a.getIfscCode());
                    map.put("branch", a.getBranch());
                    map.put("accountStatus", a.getStatus());
                } else {
                    map.put("accountNumber", "N/A");
                    map.put("accountType", "SAVINGS");
                    map.put("balance", BigDecimal.ZERO);
                    map.put("accountStatus", u.getStatus());
                }
                result.add(map);
            }
        }
        return result;
    }

    public Map<String, Object> getCustomerDetails(String userId) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + userId));

        Optional<Account> accOpt = accountRepository.findByUserId(userId);
        Account account = accOpt.orElse(null);

        List<Transaction> userTransactions = new ArrayList<>();
        if (account != null) {
            userTransactions = transactionRepository.findByAccountNumber(account.getAccountNumber());
        }

        List<Loan> userLoans = loanRepository.findByUserId(userId);

        BigDecimal totalDeposits = BigDecimal.ZERO;
        BigDecimal totalWithdrawals = BigDecimal.ZERO;
        BigDecimal totalTransfers = BigDecimal.ZERO;

        for (Transaction t : userTransactions) {
            if (t.getAmount() == null) continue;
            if ("DEPOSIT".equalsIgnoreCase(t.getType())) totalDeposits = totalDeposits.add(t.getAmount());
            else if ("WITHDRAWAL".equalsIgnoreCase(t.getType())) totalWithdrawals = totalWithdrawals.add(t.getAmount());
            else if ("TRANSFER".equalsIgnoreCase(t.getType())) totalTransfers = totalTransfers.add(t.getAmount());
        }

        Map<String, Object> details = new HashMap<>();
        details.put("user", user);
        details.put("account", account);
        details.put("totalTransactionsCount", userTransactions.size());
        details.put("totalDeposits", totalDeposits);
        details.put("totalWithdrawals", totalWithdrawals);
        details.put("totalTransfers", totalTransfers);
        details.put("activeLoansCount", userLoans.stream().filter(l -> "APPROVED".equalsIgnoreCase(l.getStatus())).count());
        details.put("recentTransactions", userTransactions.stream().limit(10).toList());
        details.put("loans", userLoans);

        return details;
    }

    public User updateCustomerStatus(String userId, String adminId, CustomerStatusRequest req) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        String newStatus = req.getStatus().toUpperCase();
        user.setStatus(newStatus);
        user.setUpdatedAt(LocalDateTime.now().toString());
        userRepository.save(user);

        // Also sync linked account status
        accountRepository.findByUserId(userId).ifPresent(a -> {
            a.setStatus(newStatus);
            a.setUpdatedAt(LocalDateTime.now().toString());
            try {
                accountRepository.save(a);
            } catch (Exception ignored) {}
        });

        auditService.log(userId, adminId != null ? adminId : "ADMIN", "CUSTOMER_STATUS_CHANGE",
                String.format("Changed customer status of %s to %s", user.getEmail(), newStatus), "SUCCESS");

        notificationService.send(userId, "Account Status Updated",
                String.format("Your banking account status has been updated to %s by administration.", newStatus), "SECURITY");

        return user;
    }

    public User updateCustomerProfile(String userId, String adminId, CustomerUpdateRequest req) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (req.getName() != null) user.setName(req.getName());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getAddress() != null) user.setAddress(req.getAddress());
        if (req.getDateOfBirth() != null) user.setDateOfBirth(req.getDateOfBirth());
        if (req.getStatus() != null) user.setStatus(req.getStatus().toUpperCase());
        user.setUpdatedAt(LocalDateTime.now().toString());

        userRepository.save(user);

        auditService.log(userId, adminId != null ? adminId : "ADMIN", "CUSTOMER_PROFILE_UPDATE",
                String.format("Admin updated profile for %s", user.getEmail()), "SUCCESS");

        return user;
    }

    public User createCustomerDirect(Map<String, Object> req, String adminId) throws Exception {
        String userId = "usr-" + UUID.randomUUID().toString().substring(0, 8);
        User user = new User();
        user.setUserId(userId);
        user.setName((String) req.getOrDefault("name", "New Customer"));
        user.setEmail((String) req.getOrDefault("email", "customer." + userId + "@ggbank.com"));
        user.setPhone((String) req.getOrDefault("phone", "+91 9876543210"));
        user.setDateOfBirth((String) req.getOrDefault("dateOfBirth", "1998-01-01"));
        user.setAddress((String) req.getOrDefault("address", "GG City"));
        user.setRole("CUSTOMER");
        user.setStatus((String) req.getOrDefault("status", "ACTIVE"));
        user.setCreatedAt(LocalDateTime.now().toString());
        user.setUpdatedAt(LocalDateTime.now().toString());

        userRepository.save(user);

        // Also create 11-digit linked account if requested
        long number = 10000000000L + (long)(new Random().nextDouble() * 90000000000L);
        Account account = new Account();
        account.setAccountId("acc-" + UUID.randomUUID().toString().substring(0, 8));
        account.setUserId(userId);
        account.setAccountNumber(String.valueOf(number));
        account.setAccountType((String) req.getOrDefault("accountType", "SAVINGS"));
        account.setBalance(req.get("balance") != null ? new BigDecimal(req.get("balance").toString()) : BigDecimal.ZERO);
        account.setIfscCode("GGBN0001234");
        account.setBranch("Central Tech Branch");
        account.setStatus("ACTIVE");
        account.setCreatedAt(LocalDateTime.now().toString());
        account.setUpdatedAt(LocalDateTime.now().toString());
        accountRepository.save(account);

        auditService.log(userId, adminId != null ? adminId : "ADMIN", "ADMIN_CUSTOMER_CREATED",
                String.format("Admin created customer %s and 11-digit account %s", user.getEmail(), account.getAccountNumber()), "SUCCESS");

        return user;
    }

    public void deleteCustomer(String userId, String adminId) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + userId));

        // Delete associated accounts
        accountRepository.findByUserId(userId).ifPresent(a -> {
            try {
                accountRepository.deleteById(a.getAccountId());
            } catch (Exception ignored) {}
        });

        userRepository.deleteById(userId);

        auditService.log(userId, adminId != null ? adminId : "ADMIN", "ADMIN_CUSTOMER_DELETED",
                String.format("Admin deleted customer %s (%s)", user.getName(), user.getEmail()), "SUCCESS");
    }

    public void clearAllCustomers(String adminId) throws Exception {
        List<User> users = userRepository.findAll();
        for (User u : users) {
            if ("CUSTOMER".equalsIgnoreCase(u.getRole())) {
                accountRepository.findByUserId(u.getUserId()).ifPresent(a -> {
                    try {
                        accountRepository.deleteById(a.getAccountId());
                    } catch (Exception ignored) {}
                });
                userRepository.deleteById(u.getUserId());
            }
        }
        auditService.log(null, adminId != null ? adminId : "ADMIN", "ADMIN_CLEAR_ALL_CUSTOMERS",
                "Admin cleared all customer records", "SUCCESS");
    }
}
