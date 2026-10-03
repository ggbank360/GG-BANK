package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.model.Beneficiary;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.BeneficiaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/beneficiaries")
public class BeneficiaryController {

    @Autowired
    private BeneficiaryService beneficiaryService;

    @PostMapping
    public ResponseEntity<ApiResponse<Beneficiary>> addBeneficiary(@AuthenticationPrincipal UserPrincipal principal,
                                                                   @RequestBody Beneficiary beneficiary) throws Exception {
        String uid = principal != null ? principal.getUid() : "usr-gowtham-101";
        Beneficiary saved = beneficiaryService.addBeneficiary(uid, beneficiary);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Beneficiary added successfully", saved));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Beneficiary>>> getBeneficiariesForUser(@PathVariable String userId) throws Exception {
        List<Beneficiary> list = beneficiaryService.getBeneficiariesForUser(userId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Beneficiary>>> getCurrentUserBeneficiaries(@AuthenticationPrincipal UserPrincipal principal) throws Exception {
        String uid = principal != null ? principal.getUid() : "usr-gowtham-101";
        List<Beneficiary> list = beneficiaryService.getBeneficiariesForUser(uid);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @DeleteMapping("/{beneficiaryId}")
    public ResponseEntity<ApiResponse<Void>> removeBeneficiary(@PathVariable String beneficiaryId) throws Exception {
        beneficiaryService.removeBeneficiary(beneficiaryId);
        return ResponseEntity.ok(ApiResponse.success("Beneficiary removed successfully", null));
    }
}
