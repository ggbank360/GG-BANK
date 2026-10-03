package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.CustomerStatusRequest;
import com.ggbank.dto.CustomerUpdateRequest;
import com.ggbank.model.User;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.CustomerAdminService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/customers")
public class CustomerAdminController {

    @Autowired
    private CustomerAdminService customerAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllCustomers() throws Exception {
        List<Map<String, Object>> list = customerAdminService.getAllCustomersDetailed();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCustomerDetails(@PathVariable String userId) throws Exception {
        Map<String, Object> details = customerAdminService.getCustomerDetails(userId);
        return ResponseEntity.ok(ApiResponse.success(details));
    }

    @PutMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<User>> updateCustomerStatus(@AuthenticationPrincipal UserPrincipal principal,
                                                                 @PathVariable String userId,
                                                                 @Valid @RequestBody CustomerStatusRequest request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        User user = customerAdminService.updateCustomerStatus(userId, adminId, request);
        return ResponseEntity.ok(ApiResponse.success("Customer status updated successfully", user));
    }

    @PutMapping("/{userId}/activate")
    public ResponseEntity<ApiResponse<User>> activateCustomer(@AuthenticationPrincipal UserPrincipal principal,
                                                             @PathVariable String userId) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        User user = customerAdminService.updateCustomerStatus(userId, adminId, new CustomerStatusRequest("ACTIVE"));
        return ResponseEntity.ok(ApiResponse.success("Customer activated successfully", user));
    }

    @PutMapping("/{userId}/deactivate")
    public ResponseEntity<ApiResponse<User>> deactivateCustomer(@AuthenticationPrincipal UserPrincipal principal,
                                                               @PathVariable String userId) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        User user = customerAdminService.updateCustomerStatus(userId, adminId, new CustomerStatusRequest("INACTIVE"));
        return ResponseEntity.ok(ApiResponse.success("Customer deactivated successfully", user));
    }

    @PutMapping("/{userId}/block")
    public ResponseEntity<ApiResponse<User>> blockCustomer(@AuthenticationPrincipal UserPrincipal principal,
                                                          @PathVariable String userId) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        User user = customerAdminService.updateCustomerStatus(userId, adminId, new CustomerStatusRequest("BLOCKED"));
        return ResponseEntity.ok(ApiResponse.success("Customer blocked successfully", user));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<User>> createCustomer(@AuthenticationPrincipal UserPrincipal principal,
                                                           @RequestBody Map<String, Object> request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        User user = customerAdminService.createCustomerDirect(request, adminId);
        return ResponseEntity.ok(ApiResponse.success("Customer created successfully", user));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<String>> deleteCustomer(@AuthenticationPrincipal UserPrincipal principal,
                                                             @PathVariable String userId) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        customerAdminService.deleteCustomer(userId, adminId);
        return ResponseEntity.ok(ApiResponse.success("Customer deleted successfully", userId));
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<ApiResponse<String>> clearAllCustomers(@AuthenticationPrincipal UserPrincipal principal) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        customerAdminService.clearAllCustomers(adminId);
        return ResponseEntity.ok(ApiResponse.success("All customer records have been deleted", null));
    }

    @PutMapping("/{userId}/edit")
    public ResponseEntity<ApiResponse<User>> updateCustomerProfile(@AuthenticationPrincipal UserPrincipal principal,
                                                                  @PathVariable String userId,
                                                                  @RequestBody CustomerUpdateRequest request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        User user = customerAdminService.updateCustomerProfile(userId, adminId, request);
        return ResponseEntity.ok(ApiResponse.success("Customer profile updated successfully", user));
    }
}
