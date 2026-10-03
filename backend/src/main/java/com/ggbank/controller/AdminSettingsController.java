package com.ggbank.controller;

import com.ggbank.dto.AdminSettingsDto;
import com.ggbank.dto.ApiResponse;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.AdminSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingsController {

    @Autowired
    private AdminSettingsService adminSettingsService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminSettingsDto>> getSettings() {
        AdminSettingsDto settings = adminSettingsService.getSettings();
        return ResponseEntity.ok(ApiResponse.success(settings));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<AdminSettingsDto>> updateSettings(@AuthenticationPrincipal UserPrincipal principal,
                                                                        @RequestBody AdminSettingsDto request) throws Exception {
        String adminId = principal != null ? principal.getUid() : "usr-admin-999";
        AdminSettingsDto updated = adminSettingsService.updateSettings(adminId, request);
        return ResponseEntity.ok(ApiResponse.success("System settings updated successfully", updated));
    }
}
