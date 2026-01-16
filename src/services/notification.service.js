import { NotificationModel } from '../models/notification.model.js';

export const NotificationService = {
  // Create a notification for a specific user
  create: (userId, title, message, type = 'info', link = null) => {
    return NotificationModel.create({
      userId,
      title,
      message,
      type, // info, success, warning, error
      link,
      read: false,
      createdAt: new Date().toISOString()
    });
  },

  // Get all notifications for a user
  getUserNotifications: (userId) => {
    const notifications = NotificationModel.findAll();
    return notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // Mark a notification as read
  markAsRead: (id, userId) => {
    const notification = NotificationModel.findById(id);
    if (!notification || notification.userId !== userId) {
      return null;
    }
    return NotificationModel.update(id, { read: true });
  },

  // Mark all as read
  markAllAsRead: (userId) => {
    const notifications = NotificationModel.findAll();
    const userNotes = notifications.filter(n => n.userId === userId && !n.read);
    
    userNotes.forEach(note => {
      NotificationModel.update(note.id, { read: true });
    });
    
    return true;
  },
  
  // System-wide notification (helper for broadcasting)
  notifyAdmins: (title, message, link = null) => {
     // This would require fetching all admins -> looping -> creating.
     // Skipping for now to keep it simple, or we can import UserModel later.
  }
};
