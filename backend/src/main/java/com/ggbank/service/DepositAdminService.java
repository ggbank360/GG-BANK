package com.ggbank.service;

import com.ggbank.dto.AdminDepositRequest;
import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Account;
import com.ggbank.model.Transaction;
import com.ggbank.repository.AccountRepository;
import com.ggbank.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class DepositAdminService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private NotificationService notificationService;

    public List<Transaction> getAllDeposits() throws Exception {
        List<Transaction> list = transactionRepository.findAll();
        return list.stream()
                .filter(t -> "DEPOSIT".equalsIgnoreCase(t.getType()))
                .sorted((a, b) -> (b.getCreatedAt() != null && a.getCreatedAt() != null) ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0)
                .toList();
    }

    public synchronized Transaction executeAdminDeposit(String adminId, AdminDepositRequest req) throws Exception {
        Account account = accountRepository.findByAccountNumber(req.getAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with number: " + req.getAccountNumber()));

        BigDecimal amount = req.getAmount();
        account.setBalance(account.getBalance().add(amount));
        account.setUpdatedAt(LocalDateTime.now().toString());
        accountRepository.save(account);

        String txnId = "TXN-2026-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Transaction txn = new Transaction();
        txn.setTransactionId(txnId);
        txn.setSenderAccount("GG-BANK-TREASURY");
        txn.setReceiverAccount(account.getAccountNumber());
        txn.setAmount(amount);
        txn.setType("DEPOSIT");
        txn.setCategory("Admin Credit");
        txn.setDescription(req.getDescription() != null ? req.getDescription() : "Admin Treasury Direct Deposit");
        txn.setStatus("COMPLETED");
        txn.setBalanceAfter(account.getBalance());
        txn.setCreatedAt(LocalDateTime.now().toString());
        transactionRepository.save(txn);

        auditService.log(account.getUserId(), adminId != null ? adminId : "ADMIN", "ADMIN_DEPOSIT",
                String.format("Direct deposit of ₹%s to account %s (Txn: %s)", amount, account.getAccountNumber(), txnId), "SUCCESS");

        notificationService.send(account.getUserId(), "Account Credited by Administration",
                String.format("₹%s has been directly credited to your account %s. New Balance: ₹%s.", amount, account.getAccountNumber(), account.getBalance()), "DEPOSIT");

        return txn;
    }
}
