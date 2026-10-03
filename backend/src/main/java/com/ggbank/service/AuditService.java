package com.ggbank.service;

import com.ggbank.model.AuditLog;
import com.ggbank.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    @Autowired
    private AuditLogRepository auditLogRepository;

    public void log(String userId, String adminId, String action, String description, String status) {
        try {
            AuditLog audit = new AuditLog();
            audit.setUserId(userId);
            audit.setAdminId(adminId);
            audit.setAction(action);
            audit.setDescription(description);
            audit.setTimestamp(LocalDateTime.now().toString());
            audit.setStatus(status);
            audit.setIpAddress("127.0.0.1");

            auditLogRepository.save(audit);
            log.info("AUDIT: [{}] User: {}, Admin: {}, Action: {}, Status: {}", action, userId, adminId, description, status);
        } catch (Exception e) {
            log.error("Failed to write audit log: {}", e.getMessage());
        }
    }

    public List<AuditLog> getAllLogs() throws Exception {
        return auditLogRepository.findAll();
    }
}
