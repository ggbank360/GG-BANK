package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.BillPaymentRequest;
import com.ggbank.model.Transaction;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.BillPaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bills")
public class BillPaymentController {

    @Autowired
    private BillPaymentService billPaymentService;

    @PostMapping("/pay")
    public ResponseEntity<ApiResponse<Transaction>> payBill(@AuthenticationPrincipal UserPrincipal principal,
                                                            @Valid @RequestBody BillPaymentRequest request) throws Exception {
        String uid = principal != null ? principal.getUid() : "usr-gowtham-101";
        Transaction txn = billPaymentService.payBill(uid, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Bill payment successful", txn));
    }
}
