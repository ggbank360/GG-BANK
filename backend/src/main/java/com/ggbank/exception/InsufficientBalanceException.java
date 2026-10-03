package com.ggbank.exception;

public class InsufficientBalanceException extends BankingException {
    public InsufficientBalanceException(String message) {
        super(message);
    }
}
