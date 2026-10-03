package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.CustomerStatusRequest;
import com.ggbank.model.Account;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.AccountAdminService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/accounts")
public class AccountAdminController {

    @Autowired
    private AccountAdminService accountAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllAccounts() throws Exception {
        List<Map<String, Object>> list = accountAdminService.getAllAccountsDetailed();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{accountId}")
    public ResponseEntity<ApiResponse<Account>> getAccountById(@PathVariable String accountId) throws Exception {
        Account account = accountAdminService.getAccountById(accountId);
        return ResponseEntity.ok(ApiResponse.success(account));
    }

    @PutMapping("/{accountId}/status")
    public ResponseEntity<ApiResponse<Account>> updateAccountStatus(@AuthenticationPrincipal UserPrincipal principal,
                                                                   @PathVariable String accountId,
                                                                   @Valid @RequestBody CustomerStatusRequest request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        Account account = accountAdminService.updateAccountStatus(accountId, adminId, request);
        return ResponseEntity.ok(ApiResponse.success("Account status updated successfully", account));
    }

    @PutMapping("/{accountId}/activate")
    public ResponseEntity<ApiResponse<Account>> activateAccount(@AuthenticationPrincipal UserPrincipal principal,
                                                               @PathVariable String accountId) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        Account account = accountAdminService.updateAccountStatus(accountId, adminId, new CustomerStatusRequest("ACTIVE"));
        return ResponseEntity.ok(ApiResponse.success("Account activated successfully", account));
    }

    @PutMapping("/{accountId}/deactivate")
    public ResponseEntity<ApiResponse<Account>> deactivateAccount(@AuthenticationPrincipal UserPrincipal principal,
                                                                 @PathVariable String accountId) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        Account account = accountAdminService.updateAccountStatus(accountId, adminId, new CustomerStatusRequest("INACTIVE"));
        return ResponseEntity.ok(ApiResponse.success("Account deactivated successfully", account));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Account>> createAccount(@AuthenticationPrincipal UserPrincipal principal,
                                                             @RequestBody Map<String, Object> request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        Account account = accountAdminService.createAccountDirect(request, adminId);
        return ResponseEntity.ok(ApiResponse.success("Account created successfully", account));
    }

    @DeleteMapping("/{accountId}")
    public ResponseEntity<ApiResponse<String>> deleteAccount(@AuthenticationPrincipal UserPrincipal principal,
                                                            @PathVariable String accountId) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        accountAdminService.deleteAccount(accountId, adminId);
        return ResponseEntity.ok(ApiResponse.success("Account deleted successfully", accountId));
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<ApiResponse<String>> clearAllAccounts(@AuthenticationPrincipal UserPrincipal principal) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        accountAdminService.clearAllAccounts(adminId);
        return ResponseEntity.ok(ApiResponse.success("All account records have been deleted", null));
    }
}
