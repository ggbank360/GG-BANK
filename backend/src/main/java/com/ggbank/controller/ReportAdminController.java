package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.service.ReportAdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/reports")
public class ReportAdminController {

    @Autowired
    private ReportAdminService reportAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReportsData(
            @RequestParam(required = false, defaultValue = "MONTHLY") String period,
            @RequestParam(required = false, defaultValue = "ALL") String reportType) throws Exception {
        Map<String, Object> data = reportAdminService.generateReportsData(period, reportType);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
