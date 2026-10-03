package com.ggbank.service;

import com.ggbank.dto.TransferRequest;
import com.ggbank.exception.AccountInactiveException;
import com.ggbank.exception.BankingException;
import com.ggbank.exception.InsufficientBalanceException;
import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Account;
import com.ggbank.model.Transaction;
import com.ggbank.repository.AccountRepository;
import com.ggbank.repository.TransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class TransferService {

    private static final Logger log = LoggerFactory.getLogger(TransferService.class);

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private NotificationService notificationService;

    public synchronized Transaction executeTransfer(TransferRequest req) throws Exception {
        BigDecimal amount = req.getAmount();

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BankingException("Transfer amount must be strictly greater than zero.");
        }

        if (req.getSenderAccount().equals(req.getReceiverAccount())) {
            throw new BankingException("Cannot transfer funds to the same source account.");
        }

        // 1. Verify Sender
        Account sender = accountRepository.findByAccountNumber(req.getSenderAccount())
                .orElseThrow(() -> new ResourceNotFoundException("Sender account does not exist: " + req.getSenderAccount()));

        if (!"ACTIVE".equalsIgnoreCase(sender.getStatus())) {
            throw new AccountInactiveException("Sender account is inactive or blocked: " + req.getSenderAccount());
        }

        // 2. Check Sufficient Balance
        if (sender.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(String.format("Insufficient funds! Available balance: ₹%s, Transfer requested: ₹%s", sender.getBalance(), amount));
        }

        // 3. Verify Receiver (if internal account)
        Optional<Account> receiverOpt = accountRepository.findByAccountNumber(req.getReceiverAccount());

        // 4. Perform Atomic Balance Adjustments
        sender.setBalance(sender.getBalance().subtract(amount));
        sender.setUpdatedAt(LocalDateTime.now().toString());
        accountRepository.save(sender);

        if (receiverOpt.isPresent()) {
            Account receiver = receiverOpt.get();
            receiver.setBalance(receiver.getBalance().add(amount));
            receiver.setUpdatedAt(LocalDateTime.now().toString());
            accountRepository.save(receiver);

            notificationService.send(receiver.getUserId(), "Money Received",
                    String.format("₹%s received from account %s (%s).", amount, sender.getAccountNumber(), req.getDescription()), "TRANSACTION");
        }

        // 5. Create Transaction Record
        String txnId = "TXN-2026-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Transaction txn = new Transaction();
        txn.setTransactionId(txnId);
        txn.setSenderAccount(req.getSenderAccount());
        txn.setReceiverAccount(req.getReceiverAccount());
        txn.setAmount(amount);
        txn.setType("TRANSFER");
        txn.setCategory("Transfer");
        txn.setDescription(req.getDescription() != null ? req.getDescription() : "Fund Transfer to " + req.getReceiverAccount());
        txn.setStatus("COMPLETED");
        txn.setBalanceAfter(sender.getBalance());
        txn.setCreatedAt(LocalDateTime.now().toString());

        transactionRepository.save(txn);

        // 6. Audit & Notification
        auditService.log(sender.getUserId(), null, "TRANSFER",
                String.format("Transferred ₹%s from %s to %s. Txn: %s", amount, req.getSenderAccount(), req.getReceiverAccount(), txnId), "SUCCESS");

        notificationService.send(sender.getUserId(), "Transfer Completed",
                String.format("₹%s transferred successfully to %s. Reference: %s", amount, req.getReceiverAccount(), txnId), "TRANSACTION");

        log.info("Money transfer executed successfully. Ref: {}, Amount: {}", txnId, amount);
        return txn;
    }
}
