package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.model.Notification;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Notification>>> getNotificationsForUser(@PathVariable String userId) throws Exception {
        List<Notification> list = notificationService.getForUser(userId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getCurrentUserNotifications(@AuthenticationPrincipal UserPrincipal principal) throws Exception {
        String uid = principal != null ? principal.getUid() : "usr-gowtham-101";
        List<Notification> list = notificationService.getForUser(uid);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable String notificationId) throws Exception {
        notificationService.markAsRead(notificationId);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", null));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(@AuthenticationPrincipal UserPrincipal principal) throws Exception {
        String uid = principal != null ? principal.getUid() : "usr-gowtham-101";
        notificationService.markAllAsReadForUser(uid);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }
}
