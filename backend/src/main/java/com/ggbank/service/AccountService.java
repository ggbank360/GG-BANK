package com.ggbank.service;

import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Account;
import com.ggbank.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AccountService {

    @Autowired
    private AccountRepository accountRepository;

    public Account getAccountByUserId(String userId) throws Exception {
        return accountRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No account found for user ID: " + userId));
    }

    public Account getAccountByNumber(String accountNumber) throws Exception {
        return accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("No account found with number: " + accountNumber));
    }

    public List<Account> getAllAccounts() throws Exception {
        return accountRepository.findAll();
    }
}
