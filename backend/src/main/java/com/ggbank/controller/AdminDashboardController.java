package com.ggbank.controller;

import com.ggbank.dto.AdminStatsResponse;
import com.ggbank.dto.ApiResponse;
import com.ggbank.service.AdminDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    @Autowired
    private AdminDashboardService dashboardService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminStatsResponse>> getDashboardStats() throws Exception {
        AdminStatsResponse stats = dashboardService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardOverview() throws Exception {
        Map<String, Object> overview = dashboardService.getDashboardOverview();
        return ResponseEntity.ok(ApiResponse.success(overview));
    }
}
