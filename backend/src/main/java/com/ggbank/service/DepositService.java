package com.ggbank.service;

import com.ggbank.dto.DepositRequest;
import com.ggbank.exception.AccountInactiveException;
import com.ggbank.exception.BankingException;
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
public class DepositService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private NotificationService notificationService;

    public synchronized Transaction processDeposit(DepositRequest req) throws Exception {
        BigDecimal amount = req.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BankingException("Deposit amount must be strictly greater than zero.");
        }

        Account account = accountRepository.findByAccountNumber(req.getAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + req.getAccountNumber()));

        if (!"ACTIVE".equalsIgnoreCase(account.getStatus())) {
            throw new AccountInactiveException("Cannot deposit to an inactive or blocked account: " + req.getAccountNumber());
        }

        account.setBalance(account.getBalance().add(amount));
        account.setUpdatedAt(LocalDateTime.now().toString());
        accountRepository.save(account);

        String txnId = "TXN-2026-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Transaction txn = new Transaction();
        txn.setTransactionId(txnId);
        txn.setSenderAccount(req.getPaymentMethod() != null ? req.getPaymentMethod() : "DEMO-DEPOSIT-GATEWAY");
        txn.setReceiverAccount(account.getAccountNumber());
        txn.setAmount(amount);
        txn.setType("DEPOSIT");
        txn.setCategory("Deposit");
        txn.setDescription(req.getDescription() != null ? req.getDescription() : "Deposit via " + req.getPaymentMethod());
        txn.setStatus("COMPLETED");
        txn.setBalanceAfter(account.getBalance());
        txn.setCreatedAt(LocalDateTime.now().toString());

        transactionRepository.save(txn);

        auditService.log(account.getUserId(), null, "DEPOSIT",
                String.format("Deposited ₹%s into account %s. Txn: %s", amount, account.getAccountNumber(), txnId), "SUCCESS");

        notificationService.send(account.getUserId(), "Deposit Successful",
                String.format("₹%s has been successfully credited to your account. Available balance: ₹%s", amount, account.getBalance()), "TRANSACTION");

        return txn;
    }
}
