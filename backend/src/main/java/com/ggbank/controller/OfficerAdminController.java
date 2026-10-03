package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.OfficerRequest;
import com.ggbank.model.Officer;
import com.ggbank.service.OfficerAdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/officers")
@CrossOrigin(origins = "*")
public class OfficerAdminController {

    private final OfficerAdminService officerService;

    public OfficerAdminController(OfficerAdminService officerService) {
        this.officerService = officerService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Officer>>> getAllOfficers() {
        return ResponseEntity.ok(ApiResponse.success("Officers retrieved successfully", officerService.getAllOfficers()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Officer>> getOfficerById(@PathVariable String id) {
        return officerService.getOfficerById(id)
                .map(o -> ResponseEntity.ok(ApiResponse.success("Officer details retrieved", o)))
                .orElse(ResponseEntity.status(404).body(ApiResponse.error("Officer not found")));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Officer>> createOfficer(@RequestBody OfficerRequest request) {
        Officer created = officerService.createOfficer(request);
        return ResponseEntity.ok(ApiResponse.success("Officer registered successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Officer>> updateOfficer(@PathVariable String id, @RequestBody OfficerRequest request) {
        return officerService.updateOfficer(id, request)
                .map(o -> ResponseEntity.ok(ApiResponse.success("Officer updated successfully", o)))
                .orElse(ResponseEntity.status(404).body(ApiResponse.error("Officer not found")));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Officer>> changeStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "ACTIVE");
        return officerService.changeOfficerStatus(id, status)
                .map(o -> ResponseEntity.ok(ApiResponse.success("Officer status updated to " + status, o)))
                .orElse(ResponseEntity.status(404).body(ApiResponse.error("Officer not found")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteOfficer(@PathVariable String id) {
        boolean removed = officerService.deleteOfficer(id);
        if (removed) {
            return ResponseEntity.ok(ApiResponse.success("Officer record removed successfully", null));
        } else {
            return ResponseEntity.status(404).body(ApiResponse.error("Officer not found"));
        }
    }
}
