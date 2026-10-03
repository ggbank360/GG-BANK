package com.ggbank.service;

import com.ggbank.dto.LoanActionRequest;
import com.ggbank.exception.BankingException;
import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Account;
import com.ggbank.model.Loan;
import com.ggbank.model.Transaction;
import com.ggbank.repository.AccountRepository;
import com.ggbank.repository.LoanRepository;
import com.ggbank.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class LoanAdminService {

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private NotificationService notificationService;

    public List<Loan> getAllLoans() throws Exception {
        List<Loan> list = loanRepository.findAll();
        list.sort((a, b) -> (b.getCreatedAt() != null && a.getCreatedAt() != null) ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0);
        return list;
    }

    public Loan getLoanById(String loanId) throws Exception {
        return loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with ID: " + loanId));
    }

    public synchronized Loan approveLoan(String loanId, String adminId, LoanActionRequest action) throws Exception {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with ID: " + loanId));

        if (!"PENDING".equalsIgnoreCase(loan.getStatus())) {
            throw new BankingException("Loan is already processed with status: " + loan.getStatus());
        }

        loan.setStatus("APPROVED");
        loan.setAdminRemarks(action != null && action.getRemarks() != null ? action.getRemarks() : "Approved by Loan Officer");
        loan.setUpdatedAt(LocalDateTime.now().toString());
        loanRepository.save(loan);

        // Disburse funds directly into customer's account
        Account account = accountRepository.findByAccountNumber(loan.getAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary account not found: " + loan.getAccountNumber()));

        account.setBalance(account.getBalance().add(loan.getRequestedAmount()));
        account.setUpdatedAt(LocalDateTime.now().toString());
        accountRepository.save(account);

        // Record Disbursal Transaction
        String txnId = "TXN-2026-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Transaction txn = new Transaction();
        txn.setTransactionId(txnId);
        txn.setSenderAccount("GG-BANK-LOAN-DISBURSAL");
        txn.setReceiverAccount(account.getAccountNumber());
        txn.setAmount(loan.getRequestedAmount());
        txn.setType("LOAN_DISBURSEMENT");
        txn.setCategory("Loan");
        txn.setDescription(String.format("Disbursement for %s (%s)", loan.getLoanType(), loanId));
        txn.setStatus("COMPLETED");
        txn.setBalanceAfter(account.getBalance());
        txn.setCreatedAt(LocalDateTime.now().toString());
        transactionRepository.save(txn);

        auditService.log(loan.getUserId(), adminId != null ? adminId : "ADMIN", "LOAN_APPROVED",
                String.format("Approved loan %s for ₹%s. Disbursed funds to %s", loanId, loan.getRequestedAmount(), account.getAccountNumber()), "SUCCESS");

        notificationService.send(loan.getUserId(), "Loan Approved & Disbursed!",
                String.format("Congratulations! Your %s of ₹%s has been approved and credited to your account.", loan.getLoanType(), loan.getRequestedAmount()), "LOAN");

        return loan;
    }

    public Loan rejectLoan(String loanId, String adminId, LoanActionRequest action) throws Exception {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with ID: " + loanId));

        loan.setStatus("REJECTED");
        loan.setAdminRemarks(action != null && action.getRemarks() != null ? action.getRemarks() : "Declined per policy guidelines");
        loan.setUpdatedAt(LocalDateTime.now().toString());
        loanRepository.save(loan);

        auditService.log(loan.getUserId(), adminId != null ? adminId : "ADMIN", "LOAN_REJECTED",
                String.format("Rejected loan %s: %s", loanId, loan.getAdminRemarks()), "SUCCESS");

        notificationService.send(loan.getUserId(), "Loan Application Update",
                String.format("Your %s application (%s) has been declined: %s", loan.getLoanType(), loanId, loan.getAdminRemarks()), "LOAN");

        return loan;
    }

    public void deleteLoan(String loanId, String adminId) throws Exception {
        loanRepository.deleteById(loanId);
        auditService.log(null, adminId != null ? adminId : "ADMIN", "ADMIN_DELETE_LOAN",
                String.format("Deleted loan record %s", loanId), "SUCCESS");
    }

    public void clearAllLoans(String adminId) throws Exception {
        List<Loan> list = loanRepository.findAll();
        for (Loan l : list) {
            loanRepository.deleteById(l.getLoanId());
        }
        auditService.log(null, adminId != null ? adminId : "ADMIN", "ADMIN_CLEAR_ALL_LOANS",
                "Admin cleared all loan application records", "SUCCESS");
    }
}
