package com.ggbank.service;

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
public class ReportAdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LoanRepository loanRepository;

    public Map<String, Object> generateReportsData(String period, String reportType) throws Exception {
        List<User> users = userRepository.findAll();
        List<Account> accounts = accountRepository.findAll();
        List<Transaction> transactions = transactionRepository.findAll();
        List<Loan> loans = loanRepository.findAll();

        Map<String, Object> reports = new HashMap<>();

        // 1. Customer Report
        long totalCustomers = users.stream().filter(u -> "CUSTOMER".equalsIgnoreCase(u.getRole())).count();
        long activeCustomers = users.stream().filter(u -> "CUSTOMER".equalsIgnoreCase(u.getRole()) && "ACTIVE".equalsIgnoreCase(u.getStatus())).count();
        long blockedCustomers = users.stream().filter(u -> "CUSTOMER".equalsIgnoreCase(u.getRole()) && "BLOCKED".equalsIgnoreCase(u.getStatus())).count();
        Map<String, Object> customerReport = new HashMap<>();
        customerReport.put("totalCustomers", totalCustomers);
        customerReport.put("activeCustomers", activeCustomers);
        customerReport.put("blockedCustomers", blockedCustomers);
        customerReport.put("customersList", users.stream().filter(u -> "CUSTOMER".equalsIgnoreCase(u.getRole())).toList());
        reports.put("customerReport", customerReport);

        // 2. Transaction Report
        reports.put("transactionReport", transactions);

        // 3. Deposit Report
        List<Transaction> deposits = transactions.stream().filter(t -> "DEPOSIT".equalsIgnoreCase(t.getType())).toList();
        BigDecimal totalDeposits = deposits.stream().map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> depositReport = new HashMap<>();
        depositReport.put("totalDepositsAmount", totalDeposits);
        depositReport.put("count", deposits.size());
        depositReport.put("items", deposits);
        reports.put("depositReport", depositReport);

        // 4. Withdrawal Report
        List<Transaction> withdrawals = transactions.stream().filter(t -> "WITHDRAWAL".equalsIgnoreCase(t.getType())).toList();
        BigDecimal totalWithdrawals = withdrawals.stream().map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> withdrawalReport = new HashMap<>();
        withdrawalReport.put("totalWithdrawalsAmount", totalWithdrawals);
        withdrawalReport.put("count", withdrawals.size());
        withdrawalReport.put("items", withdrawals);
        reports.put("withdrawalReport", withdrawalReport);

        // 5. Transfer Report
        List<Transaction> transfers = transactions.stream().filter(t -> "TRANSFER".equalsIgnoreCase(t.getType())).toList();
        BigDecimal totalTransfers = transfers.stream().map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> transferReport = new HashMap<>();
        transferReport.put("totalTransfersAmount", totalTransfers);
        transferReport.put("count", transfers.size());
        transferReport.put("items", transfers);
        reports.put("transferReport", transferReport);

        // 6. Loan Report
        BigDecimal totalLoansRequested = loans.stream().map(Loan::getRequestedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalLoansApproved = loans.stream().filter(l -> "APPROVED".equalsIgnoreCase(l.getStatus())).map(Loan::getRequestedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> loanReport = new HashMap<>();
        loanReport.put("totalLoansRequested", totalLoansRequested);
        loanReport.put("totalLoansApproved", totalLoansApproved);
        loanReport.put("pendingCount", loans.stream().filter(l -> "PENDING".equalsIgnoreCase(l.getStatus())).count());
        loanReport.put("approvedCount", loans.stream().filter(l -> "APPROVED".equalsIgnoreCase(l.getStatus())).count());
        loanReport.put("rejectedCount", loans.stream().filter(l -> "REJECTED".equalsIgnoreCase(l.getStatus())).count());
        loanReport.put("items", loans);
        reports.put("loanReport", loanReport);

        // 7. Financial Summary
        BigDecimal totalAccountBalances = accounts.stream().map(Account::getBalance).filter(b -> b != null).reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> financialSummary = new HashMap<>();
        financialSummary.put("totalVaultBalance", totalAccountBalances);
        financialSummary.put("totalDeposits", totalDeposits);
        financialSummary.put("totalWithdrawals", totalWithdrawals);
        financialSummary.put("totalTransfers", totalTransfers);
        financialSummary.put("netDisbursedLoans", totalLoansApproved);
        reports.put("financialSummary", financialSummary);

        return reports;
    }
}
