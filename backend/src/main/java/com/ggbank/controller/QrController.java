package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.QrPaymentRequest;
import com.ggbank.model.Account;
import com.ggbank.model.Transaction;
import com.ggbank.repository.AccountRepository;
import com.ggbank.repository.TransactionRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/qr")
public class QrController {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @PostMapping("/validate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateQr(@RequestBody Map<String, String> payload) {
        String qrData = payload.get("qrData");
        if (qrData == null || qrData.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("QR code payload is required", null));
        }

        // Check if QR contains 11-digit account number
        String targetAcc = null;
        if (qrData.matches(".*\\b\\d{11}\\b.*")) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\b\\d{11}\\b").matcher(qrData);
            if (m.find()) targetAcc = m.group();
        }

        if (targetAcc == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Unrecognized QR Code format", null));
        }

        Optional<Account> accountOpt = accountRepository.findByAccountNumber(targetAcc);
        if (accountOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Account associated with QR code not found in GG BANK", null));
        }

        Account acc = accountOpt.get();
        Map<String, Object> res = new HashMap<>();
        res.put("accountNumber", acc.getAccountNumber());
        res.put("accountType", acc.getAccountType());
        res.put("status", acc.getStatus());
        res.put("qrIdentifier", "QR-VERIFIED-" + acc.getAccountNumber());
        res.put("verified", true);

        return ResponseEntity.ok(ApiResponse.success("QR verified successfully", res));
    }

    @PostMapping("/pay")
    public ResponseEntity<ApiResponse<Transaction>> executeQrPayment(@Valid @RequestBody QrPaymentRequest request) throws Exception {
        Account sender = accountRepository.findByAccountNumber(request.getSenderAccount())
                .orElseThrow(() -> new IllegalArgumentException("Sender account not found"));

        Account receiver = accountRepository.findByAccountNumber(request.getReceiverAccount())
                .orElseThrow(() -> new IllegalArgumentException("Recipient account not found"));

        if (sender.getAccountNumber().equals(receiver.getAccountNumber())) {
            throw new IllegalArgumentException("Cannot execute self-transfer via QR Pay");
        }

        if (sender.getBalance().compareTo(request.getAmount()) < 0) {
            throw new IllegalArgumentException("Insufficient balance in account");
        }

        sender.setBalance(sender.getBalance().subtract(request.getAmount()));
        receiver.setBalance(receiver.getBalance().add(request.getAmount()));

        accountRepository.save(sender);
        accountRepository.save(receiver);

        Transaction txn = new Transaction();
        txn.setTransactionId("TXN-2026-" + System.currentTimeMillis() % 1000000);
        txn.setSenderAccount(sender.getAccountNumber());
        txn.setReceiverAccount(receiver.getAccountNumber());
        txn.setAmount(request.getAmount());
        txn.setType("TRANSFER");
        txn.setDescription(request.getNote() != null ? request.getNote() : "Instant QR Scan & Pay");
        txn.setStatus("COMPLETED");
        txn.setBalanceAfter(sender.getBalance());
        txn.setCreatedAt(LocalDateTime.now());

        Transaction savedTxn = transactionRepository.save(txn);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("QR Payment completed successfully", savedTxn));
    }
}
