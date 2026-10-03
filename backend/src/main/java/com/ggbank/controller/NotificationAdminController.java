package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.model.Notification;
import com.ggbank.service.NotificationAdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/notifications")
public class NotificationAdminController {

    @Autowired
    private NotificationAdminService notificationAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getAllNotifications() throws Exception {
        List<Notification> list = notificationAdminService.getAllNotifications();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<Notification>> markAsRead(@PathVariable String notificationId) throws Exception {
        Notification notification = notificationAdminService.markAsRead(notificationId);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", notification));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() throws Exception {
        notificationAdminService.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable String notificationId) throws Exception {
        notificationAdminService.deleteNotification(notificationId);
        return ResponseEntity.ok(ApiResponse.success("Notification deleted successfully", null));
    }
}
