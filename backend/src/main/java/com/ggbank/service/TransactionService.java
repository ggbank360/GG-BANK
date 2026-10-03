package com.ggbank.service;

import com.ggbank.model.Transaction;
import com.ggbank.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    public List<Transaction> getTransactionsForAccount(String accountNumber) throws Exception {
        return transactionRepository.findByAccountNumber(accountNumber);
    }

    public List<Transaction> getAllTransactions() throws Exception {
        return transactionRepository.findAll();
    }
}
