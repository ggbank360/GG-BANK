package com.ggbank.service;

import com.ggbank.model.AuditLog;
import com.ggbank.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditLogAdminService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    public List<AuditLog> getAllAuditLogs() throws Exception {
        List<AuditLog> list = auditLogRepository.findAll();
        list.sort((a, b) -> (b.getTimestamp() != null && a.getTimestamp() != null) ? b.getTimestamp().compareTo(a.getTimestamp()) : 0);
        return list;
    }
}
