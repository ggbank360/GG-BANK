package com.ggbank.service;

import com.ggbank.model.Notification;
import com.ggbank.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    @Autowired
    private NotificationRepository notificationRepository;

    public void send(String userId, String title, String message, String type) {
        try {
            Notification n = new Notification();
            n.setUserId(userId);
            n.setTitle(title);
            n.setMessage(message);
            n.setType(type);
            n.setRead(false);
            n.setCreatedAt(LocalDateTime.now().toString());

            notificationRepository.save(n);
            log.info("NOTIFICATION dispatched to [{}]: {}", userId, title);
        } catch (Exception e) {
            log.error("Failed to send notification: {}", e.getMessage());
        }
    }

    public List<Notification> getForUser(String userId) throws Exception {
        return notificationRepository.findByUserId(userId);
    }

    public void markAsRead(String notificationId) throws Exception {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            try {
                notificationRepository.save(n);
            } catch (Exception ignored) {}
        });
    }

    public void markAllAsReadForUser(String userId) throws Exception {
        List<Notification> list = notificationRepository.findByUserId(userId);
        for (Notification n : list) {
            n.setRead(true);
            notificationRepository.save(n);
        }
    }
}
