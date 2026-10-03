package com.ggbank.service;

import com.ggbank.dto.LoanActionRequest;
import com.ggbank.dto.LoanApplicationRequest;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class LoanService {

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

    public Loan applyForLoan(String userId, LoanApplicationRequest req) throws Exception {
        Account account = accountRepository.findByAccountNumber(req.getAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + req.getAccountNumber()));

        double annualRate = req.getInterestRate() != null ? req.getInterestRate() : 10.5;
        int tenure = req.getTenure() != null ? req.getTenure() : 24;
        BigDecimal principal = req.getRequestedAmount();

        // Standard EMI Formula: [P x R x (1+R)^N] / [(1+R)^N - 1]
        double monthlyRate = (annualRate / 12) / 100;
        double factor = Math.pow(1 + monthlyRate, tenure);
        double emiVal = (principal.doubleValue() * monthlyRate * factor) / (factor - 1);
        BigDecimal estimatedEMI = BigDecimal.valueOf(emiVal).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalRepayment = estimatedEMI.multiply(BigDecimal.valueOf(tenure)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalInterest = totalRepayment.subtract(principal).setScale(2, RoundingMode.HALF_UP);

        String loanId = "LOAN-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String now = LocalDateTime.now().toString();

        Loan loan = new Loan();
        loan.setLoanId(loanId);
        loan.setUserId(userId != null ? userId : account.getUserId());
        loan.setAccountNumber(account.getAccountNumber());
        loan.setLoanType(req.getLoanType());
        loan.setRequestedAmount(principal);
        loan.setMonthlyIncome(req.getMonthlyIncome());
        loan.setTenure(tenure);
        loan.setInterestRate(annualRate);
        loan.setEstimatedEMI(estimatedEMI);
        loan.setTotalInterest(totalInterest);
        loan.setTotalRepayment(totalRepayment);
        loan.setPurpose(req.getPurpose());
        loan.setStatus("PENDING");
        loan.setAdminRemarks("Application received, pending officer review.");
        loan.setCreatedAt(now);
        loan.setUpdatedAt(now);

        loanRepository.save(loan);

        auditService.log(loan.getUserId(), null, "LOAN_APPLICATION",
                String.format("Applied for %s of ₹%s. Loan ID: %s", req.getLoanType(), principal, loanId), "SUCCESS");

        notificationService.send(loan.getUserId(), "Loan Application Submitted",
                String.format("Your %s application for ₹%s (Ref: %s) has been submitted for review.", req.getLoanType(), principal, loanId), "LOAN");

        return loan;
    }

    public synchronized Loan approveLoan(String loanId, String adminId, LoanActionRequest action) throws Exception {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with ID: " + loanId));

        if (!"PENDING".equalsIgnoreCase(loan.getStatus())) {
            throw new BankingException("Loan is already processed with status: " + loan.getStatus());
        }

        loan.setStatus("APPROVED");
        loan.setAdminRemarks(action.getRemarks() != null ? action.getRemarks() : "Approved by Loan Officer");
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

        auditService.log(loan.getUserId(), adminId != null ? adminId : "ADMIN", "LOAN_APPROVAL",
                String.format("Approved loan %s for ₹%s. Disbursed funds to %s", loanId, loan.getRequestedAmount(), account.getAccountNumber()), "SUCCESS");

        notificationService.send(loan.getUserId(), "Loan Approved & Disbursed!",
                String.format("Congratulations! Your %s of ₹%s has been approved and credited to your account.", loan.getLoanType(), loan.getRequestedAmount()), "LOAN");

        return loan;
    }

    public Loan rejectLoan(String loanId, String adminId, LoanActionRequest action) throws Exception {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found with ID: " + loanId));

        loan.setStatus("REJECTED");
        loan.setAdminRemarks(action.getRemarks() != null ? action.getRemarks() : "Declined due to policy guidelines");
        loan.setUpdatedAt(LocalDateTime.now().toString());
        loanRepository.save(loan);

        auditService.log(loan.getUserId(), adminId != null ? adminId : "ADMIN", "LOAN_REJECTION",
                String.format("Rejected loan %s: %s", loanId, loan.getAdminRemarks()), "SUCCESS");

        notificationService.send(loan.getUserId(), "Loan Application Update",
                String.format("Your %s application (%s) has been declined: %s", loan.getLoanType(), loanId, loan.getAdminRemarks()), "LOAN");

        return loan;
    }

    public List<Loan> getLoansForUser(String userId) throws Exception {
        return loanRepository.findByUserId(userId);
    }

    public List<Loan> getAllLoans() throws Exception {
        return loanRepository.findAll();
    }
}
