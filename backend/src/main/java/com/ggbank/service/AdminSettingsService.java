package com.ggbank.service;

import com.ggbank.dto.AdminSettingsDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AdminSettingsService {

    @Autowired
    private AuditService auditService;

    // In-memory / configuration state (with persistent fallback)
    private AdminSettingsDto currentSettings = new AdminSettingsDto();

    public AdminSettingsDto getSettings() {
        return currentSettings;
    }

    public AdminSettingsDto updateSettings(String adminId, AdminSettingsDto newSettings) throws Exception {
        this.currentSettings = newSettings;
        auditService.log(adminId != null ? adminId : "ADMIN", adminId != null ? adminId : "ADMIN",
                "SYSTEM_SETTINGS_UPDATE", "Administrator updated system and security settings", "SUCCESS");
        return this.currentSettings;
    }
}
