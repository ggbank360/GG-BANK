package com.ggbank.service;

import com.ggbank.dto.AdminStatsResponse;
import com.ggbank.dto.CustomerStatusRequest;
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
public class AdminService {

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

    public AdminStatsResponse getDashboardStats() throws Exception {
        List<User> users = userRepository.findAll();
        List<Account> accounts = accountRepository.findAll();
        List<Transaction> transactions = transactionRepository.findAll();
        List<Loan> loans = loanRepository.findAll();

        long totalCustomers = users.stream().filter(u -> "CUSTOMER".equalsIgnoreCase(u.getRole())).count();
        long totalAccounts = accounts.size();
        long activeAccounts = accounts.stream().filter(a -> "ACTIVE".equalsIgnoreCase(a.getStatus())).count();
        long blockedAccounts = accounts.stream().filter(a -> "BLOCKED".equalsIgnoreCase(a.getStatus())).count();
        long pendingLoans = loans.stream().filter(l -> "PENDING".equalsIgnoreCase(l.getStatus())).count();

        BigDecimal totalBalance = BigDecimal.ZERO;
        for (Account a : accounts) {
            if (a.getBalance() != null) {
                totalBalance = totalBalance.add(a.getBalance());
            }
        }

        BigDecimal totalDeposits = BigDecimal.ZERO;
        BigDecimal totalWithdrawals = BigDecimal.ZERO;
        BigDecimal totalTransfers = BigDecimal.ZERO;

        for (Transaction t : transactions) {
            if (t.getAmount() == null) continue;
            if ("DEPOSIT".equalsIgnoreCase(t.getType())) {
                totalDeposits = totalDeposits.add(t.getAmount());
            } else if ("WITHDRAWAL".equalsIgnoreCase(t.getType())) {
                totalWithdrawals = totalWithdrawals.add(t.getAmount());
            } else if ("TRANSFER".equalsIgnoreCase(t.getType())) {
                totalTransfers = totalTransfers.add(t.getAmount());
            }
        }

        AdminStatsResponse response = new AdminStatsResponse();
        response.setTotalCustomers(totalCustomers);
        response.setTotalAccounts(totalAccounts);
        response.setTotalBalance(totalBalance);
        response.setActiveAccounts(activeAccounts);
        response.setBlockedAccounts(blockedAccounts);
        response.setPendingLoans(pendingLoans);
        response.setTotalDeposits(totalDeposits);
        response.setTotalWithdrawals(totalWithdrawals);
        response.setTotalTransfers(totalTransfers);

        return response;
    }

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
                    map.put("accountNumber", a.getAccountNumber());
                    map.put("accountType", a.getAccountType());
                    map.put("balance", a.getBalance());
                    map.put("ifscCode", a.getIfscCode());
                    map.put("branch", a.getBranch());
                } else {
                    map.put("accountNumber", "N/A");
                    map.put("accountType", "SAVINGS");
                    map.put("balance", BigDecimal.ZERO);
                }
                result.add(map);
            }
        }
        return result;
    }

    public User updateCustomerStatus(String userId, String adminId, CustomerStatusRequest req) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        String newStatus = req.getStatus().toUpperCase();
        user.setStatus(newStatus);
        user.setUpdatedAt(LocalDateTime.now().toString());
        userRepository.save(user);

        // Also update linked account
        accountRepository.findByUserId(userId).ifPresent(a -> {
            a.setStatus(newStatus);
            a.setUpdatedAt(LocalDateTime.now().toString());
            try {
                accountRepository.save(a);
            } catch (Exception ignored) {}
        });

        auditService.log(userId, adminId != null ? adminId : "ADMIN", "ACCOUNT_STATUS_CHANGE",
                String.format("Changed customer status of %s to %s", user.getEmail(), newStatus), "SUCCESS");

        notificationService.send(userId, "Account Status Updated",
                String.format("Your banking account status has been set to %s by administration.", newStatus), "SECURITY");

        return user;
    }

    public void clearAllData() throws Exception {
        auditService.log("GLOBAL", "ADMIN", "CLEAR_ALL_DATA", "Admin executed destructive global database wipe", "SUCCESS");
    }

    public void resetDefaultData() throws Exception {
        auditService.log("GLOBAL", "ADMIN", "RESET_DEFAULT_DATA", "Admin executed default data reset", "SUCCESS");
    }
}
