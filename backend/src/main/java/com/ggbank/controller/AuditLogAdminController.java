package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.model.AuditLog;
import com.ggbank.service.AuditLogAdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AuditLogAdminController {

    @Autowired
    private AuditLogAdminService auditLogAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs() throws Exception {
        List<AuditLog> list = auditLogAdminService.getAllAuditLogs();
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
