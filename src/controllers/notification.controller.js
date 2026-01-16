import { NotificationService } from '../services/notification.service.js';

export const NotificationController = {
  getMyNotifications: (req, res) => {
    try {
      const notifications = NotificationService.getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
       res.status(500).json({ error: error.message });
    }
  },

  markRead: (req, res) => {
    try {
      const result = NotificationService.markAsRead(req.params.id, req.user.id);
      if (!result) return res.status(404).json({ error: 'Notification not found' });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  markAllRead: (req, res) => {
    try {
      NotificationService.markAllAsRead(req.user.id);
      res.json({ message: 'All marked as read' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
