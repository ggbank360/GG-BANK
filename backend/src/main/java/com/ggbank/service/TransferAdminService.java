package com.ggbank.service;

import com.ggbank.model.Transaction;
import com.ggbank.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TransferAdminService {

    @Autowired
    private TransactionRepository transactionRepository;

    public List<Transaction> getAllTransfers() throws Exception {
        List<Transaction> list = transactionRepository.findAll();
        return list.stream()
                .filter(t -> "TRANSFER".equalsIgnoreCase(t.getType()))
                .sorted((a, b) -> (b.getCreatedAt() != null && a.getCreatedAt() != null) ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0)
                .toList();
    }
}
