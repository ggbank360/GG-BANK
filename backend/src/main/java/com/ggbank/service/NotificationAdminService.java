package com.ggbank.service;

import com.ggbank.exception.ResourceNotFoundException;
import com.ggbank.model.Notification;
import com.ggbank.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationAdminService {

    @Autowired
    private NotificationRepository notificationRepository;

    public List<Notification> getAllNotifications() throws Exception {
        List<Notification> list = notificationRepository.findAll();
        list.sort((a, b) -> (b.getCreatedAt() != null && a.getCreatedAt() != null) ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0);
        return list;
    }

    public Notification markAsRead(String notificationId) throws Exception {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));
        n.setRead(true);
        return notificationRepository.save(n);
    }

    public void markAllAsRead() throws Exception {
        List<Notification> list = notificationRepository.findAll();
        for (Notification n : list) {
            n.setRead(true);
            notificationRepository.save(n);
        }
    }

    public void deleteNotification(String notificationId) throws Exception {
        notificationRepository.deleteById(notificationId);
    }
}
