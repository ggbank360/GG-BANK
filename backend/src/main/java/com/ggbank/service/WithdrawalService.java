package com.ggbank.service;

import com.ggbank.dto.WithdrawRequest;
import com.ggbank.exception.AccountInactiveException;
import com.ggbank.exception.BankingException;
import com.ggbank.exception.InsufficientBalanceException;
import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Account;
import com.ggbank.model.Transaction;
import com.ggbank.repository.AccountRepository;
import com.ggbank.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class WithdrawalService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private NotificationService notificationService;

    public synchronized Transaction processWithdrawal(WithdrawRequest req) throws Exception {
        BigDecimal amount = req.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BankingException("Withdrawal amount must be strictly greater than zero.");
        }

        Account account = accountRepository.findByAccountNumber(req.getAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + req.getAccountNumber()));

        if (!"ACTIVE".equalsIgnoreCase(account.getStatus())) {
            throw new AccountInactiveException("Cannot withdraw from an inactive or blocked account: " + req.getAccountNumber());
        }

        if (account.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(String.format("Insufficient balance! Available: ₹%s, Withdrawal requested: ₹%s", account.getBalance(), amount));
        }

        account.setBalance(account.getBalance().subtract(amount));
        account.setUpdatedAt(LocalDateTime.now().toString());
        accountRepository.save(account);

        String txnId = "TXN-2026-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Transaction txn = new Transaction();
        txn.setTransactionId(txnId);
        txn.setSenderAccount(account.getAccountNumber());
        txn.setReceiverAccount("SELF-CASH-WITHDRAWAL");
        txn.setAmount(amount);
        txn.setType("WITHDRAWAL");
        txn.setCategory("Cash");
        txn.setDescription(req.getDescription() != null ? req.getDescription() : "Cash Withdrawal");
        txn.setStatus("COMPLETED");
        txn.setBalanceAfter(account.getBalance());
        txn.setCreatedAt(LocalDateTime.now().toString());

        transactionRepository.save(txn);

        auditService.log(account.getUserId(), null, "WITHDRAWAL",
                String.format("Withdrew ₹%s from account %s. Txn: %s", amount, account.getAccountNumber(), txnId), "SUCCESS");

        notificationService.send(account.getUserId(), "Withdrawal Processed",
                String.format("₹%s debited for withdrawal. Remaining balance: ₹%s", amount, account.getBalance()), "TRANSACTION");

        return txn;
    }
}
