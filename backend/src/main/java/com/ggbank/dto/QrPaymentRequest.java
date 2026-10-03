package com.ggbank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

public class QrPaymentRequest {

    @NotBlank(message = "Sender 11-digit account number is required")
    @Pattern(regexp = "^\\d{11}$", message = "Sender account number must be exactly 11 digits")
    private String senderAccount;

    @NotBlank(message = "Receiver 11-digit account number is required")
    @Pattern(regexp = "^\\d{11}$", message = "Receiver account number must be exactly 11 digits")
    private String receiverAccount;

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "1.00", message = "Amount must be at least 1.00")
    private BigDecimal amount;

    private String qrIdentifier;
    private String note;
    private String pin;

    public QrPaymentRequest() {}

    public String getSenderAccount() { return senderAccount; }
    public void setSenderAccount(String senderAccount) { this.senderAccount = senderAccount; }

    public String getReceiverAccount() { return receiverAccount; }
    public void setReceiverAccount(String receiverAccount) { this.receiverAccount = receiverAccount; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getQrIdentifier() { return qrIdentifier; }
    public void setQrIdentifier(String qrIdentifier) { this.qrIdentifier = qrIdentifier; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getPin() { return pin; }
    public void setPin(String pin) { this.pin = pin; }
}
