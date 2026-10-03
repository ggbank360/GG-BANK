package com.ggbank.service;

import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Transaction;
import com.ggbank.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TransactionAdminService {

    @Autowired
    private TransactionRepository transactionRepository;

    public List<Transaction> getAllTransactions() throws Exception {
        List<Transaction> list = transactionRepository.findAll();
        list.sort((a, b) -> (b.getCreatedAt() != null && a.getCreatedAt() != null) ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0);
        return list;
    }

    public Transaction getTransactionById(String transactionId) throws Exception {
        return transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + transactionId));
    }

    public void deleteTransaction(String transactionId) throws Exception {
        transactionRepository.deleteById(transactionId);
    }

    public void clearAllTransactions() throws Exception {
        List<Transaction> list = transactionRepository.findAll();
        for (Transaction t : list) {
            transactionRepository.deleteById(t.getTransactionId());
        }
    }
}
