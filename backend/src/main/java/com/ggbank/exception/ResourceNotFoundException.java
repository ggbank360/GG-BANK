package com.ggbank.exception;

public class ResourceNotFoundException extends BankingException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
