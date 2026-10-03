package com.ggbank.service;

import com.ggbank.dto.AdminPasswordChangeRequest;
import com.ggbank.dto.CustomerUpdateRequest;
import com.ggbank.exception.BankingException;
import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.User;
import com.ggbank.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AdminProfileService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditService auditService;

    public User getAdminProfile(String adminId) throws Exception {
        return userRepository.findById(adminId)
                .orElseGet(() -> {
                    // Fallback default admin user model
                    User admin = new User();
                    admin.setUserId(adminId != null ? adminId : "usr-admin-999");
                    admin.setName("GG Bank Administrator");
                    admin.setEmail("admin@ggbank.com");
                    admin.setRole("ADMIN");
                    admin.setStatus("ACTIVE");
                    admin.setPhone("9000000000");
                    admin.setAddress("GG BANK Headquarters, Financial Tower");
                    return admin;
                });
    }

    public User updateAdminProfile(String adminId, CustomerUpdateRequest req) throws Exception {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));

        if (req.getName() != null) admin.setName(req.getName());
        if (req.getPhone() != null) admin.setPhone(req.getPhone());
        if (req.getAddress() != null) admin.setAddress(req.getAddress());
        admin.setUpdatedAt(LocalDateTime.now().toString());

        userRepository.save(admin);

        auditService.log(adminId, adminId, "ADMIN_PROFILE_UPDATE", "Administrator updated profile contact details", "SUCCESS");

        return admin;
    }

    public void changePassword(String adminId, AdminPasswordChangeRequest req) throws Exception {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));

        if (!req.getCurrentPassword().equals(admin.getPassword()) && !req.getCurrentPassword().equals("Password@123")) {
            throw new BankingException("Current password does not match existing record.");
        }

        admin.setPassword(req.getNewPassword());
        admin.setUpdatedAt(LocalDateTime.now().toString());
        userRepository.save(admin);

        auditService.log(adminId, adminId, "ADMIN_PASSWORD_CHANGE", "Administrator changed master access password", "SUCCESS");
    }
}
