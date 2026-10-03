package com.ggbank.service;

import com.ggbank.dto.AdminStatsResponse;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminDashboardService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LoanRepository loanRepository;

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
        response.setActiveAccounts(activeAccounts);
        response.setBlockedAccounts(blockedAccounts);
        response.setPendingLoans(pendingLoans);
        response.setTotalDeposits(totalDeposits);
        response.setTotalWithdrawals(totalWithdrawals);
        response.setTotalTransfers(totalTransfers);

        return response;
    }

    public Map<String, Object> getDashboardOverview() throws Exception {
        AdminStatsResponse stats = getDashboardStats();
        List<Transaction> transactions = transactionRepository.findAll();
        List<Loan> loans = loanRepository.findAll();

        // Recent 5 transactions
        transactions.sort((a, b) -> (b.getCreatedAt() != null && a.getCreatedAt() != null) ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0);
        List<Transaction> recentTransactions = transactions.stream().limit(5).toList();

        // Recent 5 pending loans
        List<Loan> pendingLoansList = loans.stream()
                .filter(l -> "PENDING".equalsIgnoreCase(l.getStatus()))
                .limit(5)
                .toList();

        Map<String, Object> overview = new HashMap<>();
        overview.put("stats", stats);
        overview.put("recentTransactions", recentTransactions);
        overview.put("pendingLoans", pendingLoansList);

        return overview;
    }
}
