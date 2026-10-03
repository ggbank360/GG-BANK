package com.ggbank.service;

import com.ggbank.dto.BillPaymentRequest;
import com.ggbank.exception.InsufficientBalanceException;
import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Account;
import com.ggbank.model.BillPayment;
import com.ggbank.model.Budget;
import com.ggbank.model.Transaction;
import com.ggbank.repository.AccountRepository;
import com.ggbank.repository.BillPaymentRepository;
import com.ggbank.repository.BudgetRepository;
import com.ggbank.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class BillPaymentService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private BillPaymentRepository billPaymentRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private NotificationService notificationService;

    public synchronized Transaction payBill(String userId, BillPaymentRequest req) throws Exception {
        Account account = accountRepository.findByAccountNumber(req.getAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + req.getAccountNumber()));

        BigDecimal amount = req.getAmount();
        if (account.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException("Insufficient account balance to pay this bill.");
        }

        // Deduct balance
        account.setBalance(account.getBalance().subtract(amount));
        account.setUpdatedAt(LocalDateTime.now().toString());
        accountRepository.save(account);

        String now = LocalDateTime.now().toString();

        // Create Bill Record
        BillPayment bill = new BillPayment();
        bill.setBillId("BILL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        bill.setUserId(userId != null ? userId : account.getUserId());
        bill.setAccountNumber(account.getAccountNumber());
        bill.setCategory(req.getCategory());
        bill.setProvider(req.getProvider());
        bill.setConsumerNumber(req.getConsumerNumber());
        bill.setAmount(amount);
        bill.setStatus("SUCCESS");
        bill.setCreatedAt(now);
        billPaymentRepository.save(bill);

        // Record Transaction
        String txnId = "TXN-2026-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Transaction txn = new Transaction();
        txn.setTransactionId(txnId);
        txn.setSenderAccount(account.getAccountNumber());
        txn.setReceiverAccount(req.getProvider());
        txn.setAmount(amount);
        txn.setType("BILL_PAYMENT");
        txn.setCategory("Bills");
        txn.setDescription(String.format("%s Bill - %s (%s)", req.getCategory(), req.getProvider(), req.getConsumerNumber()));
        txn.setStatus("COMPLETED");
        txn.setBalanceAfter(account.getBalance());
        txn.setCreatedAt(now);
        transactionRepository.save(txn);

        // Update Budget Spending for "Bills"
        Optional<Budget> budgetOpt = budgetRepository.findByUserIdAndCategory(account.getUserId(), "Bills");
        if (budgetOpt.isPresent()) {
            Budget b = budgetOpt.get();
            b.setSpent(b.getSpent().add(amount));
            budgetRepository.save(b);
        }

        auditService.log(account.getUserId(), null, "BILL_PAYMENT",
                String.format("Paid ₹%s for %s (%s)", amount, req.getProvider(), req.getConsumerNumber()), "SUCCESS");

        notificationService.send(account.getUserId(), "Bill Paid Successfully",
                String.format("₹%s paid to %s for consumer ID %s.", amount, req.getProvider(), req.getConsumerNumber()), "TRANSACTION");

        return txn;
    }
}
