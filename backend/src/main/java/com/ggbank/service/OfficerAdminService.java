package com.ggbank.service;

import com.ggbank.dto.OfficerRequest;
import com.ggbank.model.Officer;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OfficerAdminService {

    private final Map<String, Officer> officerStore = new ConcurrentHashMap<>();

    public OfficerAdminService() {
        seedInitialOfficers();
    }

    private void seedInitialOfficers() {
        officerStore.put("off-001", new Officer("off-001", "EMP-1001", "Vikram Sharma", "vikram.sharma@ggbank.com", "+91 98765 43210",
                "LOAN", "Chief Credit Officer", "Central Tech Branch", "ACTIVE", 12, "2026-01-10T09:00:00Z"));

        officerStore.put("off-002", new Officer("off-002", "EMP-1002", "Anita Roy", "anita.roy@ggbank.com", "+91 98765 43211",
                "LOAN", "Senior Personal Loan Underwriter", "Central Tech Branch", "ACTIVE", 8, "2026-01-15T09:00:00Z"));

        officerStore.put("off-003", new Officer("off-003", "EMP-1003", "Priya Patel", "priya.patel@ggbank.com", "+91 98765 43212",
                "COMPLIANCE", "Lead KYC & AML Compliance Officer", "Financial Tower Branch", "ACTIVE", 19, "2026-02-01T09:00:00Z"));

        officerStore.put("off-004", new Officer("off-004", "EMP-1004", "Karthik Rao", "karthik.rao@ggbank.com", "+91 98765 43213",
                "TREASURY", "Treasury & Vault Operations Manager", "Central Tech Branch", "ACTIVE", 5, "2026-02-10T09:00:00Z"));

        officerStore.put("off-005", new Officer("off-005", "EMP-1005", "Rajesh Kumar", "rajesh.kumar@ggbank.com", "+91 98765 43214",
                "OPERATIONS", "Branch Operations Supervisor", "North Metro Branch", "ON_LEAVE", 2, "2026-02-20T09:00:00Z"));
    }

    public List<Officer> getAllOfficers() {
        return new ArrayList<>(officerStore.values());
    }

    public Optional<Officer> getOfficerById(String id) {
        return Optional.ofNullable(officerStore.get(id));
    }

    public Officer createOfficer(OfficerRequest req) {
        String newId = "off-" + UUID.randomUUID().toString().substring(0, 6);
        String empId = "EMP-" + (1000 + officerStore.size() + 1);
        Officer officer = new Officer(
                newId,
                empId,
                req.getName(),
                req.getEmail(),
                req.getPhone(),
                req.getDepartment() != null ? req.getDepartment() : "LOAN",
                req.getDesignation() != null ? req.getDesignation() : "Banking Officer",
                req.getBranch() != null ? req.getBranch() : "Central Tech Branch",
                req.getStatus() != null ? req.getStatus() : "ACTIVE",
                0,
                new Date().toInstant().toString()
        );
        officerStore.put(newId, officer);
        return officer;
    }

    public Optional<Officer> updateOfficer(String id, OfficerRequest req) {
        Officer existing = officerStore.get(id);
        if (existing == null) return Optional.empty();

        if (req.getName() != null) existing.setName(req.getName());
        if (req.getEmail() != null) existing.setEmail(req.getEmail());
        if (req.getPhone() != null) existing.setPhone(req.getPhone());
        if (req.getDepartment() != null) existing.setDepartment(req.getDepartment());
        if (req.getDesignation() != null) existing.setDesignation(req.getDesignation());
        if (req.getBranch() != null) existing.setBranch(req.getBranch());
        if (req.getStatus() != null) existing.setStatus(req.getStatus());

        return Optional.of(existing);
    }

    public Optional<Officer> changeOfficerStatus(String id, String status) {
        Officer existing = officerStore.get(id);
        if (existing == null) return Optional.empty();
        existing.setStatus(status);
        return Optional.of(existing);
    }

    public boolean deleteOfficer(String id) {
        return officerStore.remove(id) != null;
    }
}
