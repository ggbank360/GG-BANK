package com.ggbank.controller;

import com.ggbank.dto.AdminPasswordChangeRequest;
import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.CustomerUpdateRequest;
import com.ggbank.model.User;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.AdminProfileService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/profile")
public class AdminProfileController {

    @Autowired
    private AdminProfileService adminProfileService;

    @GetMapping
    public ResponseEntity<ApiResponse<User>> getProfile(@AuthenticationPrincipal UserPrincipal principal) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        User admin = adminProfileService.getAdminProfile(adminId);
        return ResponseEntity.ok(ApiResponse.success(admin));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<User>> updateProfile(@AuthenticationPrincipal UserPrincipal principal,
                                                           @RequestBody CustomerUpdateRequest request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        User admin = adminProfileService.updateAdminProfile(adminId, request);
        return ResponseEntity.ok(ApiResponse.success("Admin profile updated successfully", admin));
    }

    @PutMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@AuthenticationPrincipal UserPrincipal principal,
                                                            @Valid @RequestBody AdminPasswordChangeRequest request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        adminProfileService.changePassword(adminId, request);
        return ResponseEntity.ok(ApiResponse.success("Admin password changed successfully", null));
    }
}
