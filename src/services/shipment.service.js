import { ShipmentModel } from '../models/generic.model.js';
import { NotificationService } from './notification.service.js';

export const ShipmentService = {
  getAll: (user) => {
    const shipments = ShipmentModel.findAll();
    if (user.role === 'admin') return shipments;
    if (user.role === 'operator') return shipments.filter(s => String(s.operatorId) === String(user.id));
    // Carrier sees their own shipments AND unassigned ones
    if (user.role === 'carrier') return shipments.filter(s => String(s.carrierId) === String(user.id) || !s.carrierId);
    if (user.role === 'customer') return shipments.filter(s => String(s.customerId) === String(user.id));
    return [];
  },

  getById: (id, user) => {
    const shipment = ShipmentModel.findById(id);
    if (!shipment) return null;

    if (user.role === 'admin') return shipment;
    if (user.role === 'operator' && String(shipment.operatorId) === String(user.id)) return shipment;
    // Carrier access if assigned OR unassigned
    if (user.role === 'carrier' && (String(shipment.carrierId) === String(user.id) || !shipment.carrierId)) return shipment;
    if (user.role === 'customer' && shipment.customerId === user.id) return shipment;
    
    throw new Error('Unauthorized access');
  },

  create: (data, user) => {
    const historyEntry = {
      status: data.status || 'Received',
      timestamp: new Date().toISOString(),
      updatedBy: user.username,
      userId: user.id,
      role: user.role,
      note: 'Shipment created'
    };

    return ShipmentModel.create({
      ...data,
      status: data.status || 'Received',
      customerId: data.customerId || user.id,
      operatorId: user.id,
      carrierId: null,
      operatorConfirmed: false,
      history: [historyEntry] // Initialize history
    });
  },

  update: (id, data, user) => {
    const shipment = ShipmentModel.findById(id);
    if (!shipment) return null;

    // Authorization check logic for update
    if (user.role !== 'admin' && user.role !== 'operator' && shipment.operatorId !== user.id && user.role !== 'carrier') {
       throw new Error('Unauthorized update');
    }

    // Carriers rules:
    // 1. Can update if assigned to them
    // 2. Can update (claim) if currently unassigned AND they are setting themselves as carrier
    if (user.role === 'carrier') {
       const isAssignedToMe = String(shipment.carrierId) === String(user.id);
       const isUnassigned = !shipment.carrierId;
       const isClaiming = isUnassigned && String(data.carrierId) === String(user.id);

       if (!isAssignedToMe && !isClaiming) {
          throw new Error('Unauthorized update');
       }
    }

    const updates = { ...data };
    
    // Create history entry if status or important fields changed
    if (data.status && data.status !== shipment.status) {
      const historyEntry = {
        status: data.status,
        timestamp: new Date().toISOString(),
        updatedBy: user.username,
        userId: user.id,
        role: user.role,
        note: data.note || `Status updated to ${data.status}`
      };
      
      const currentHistory = shipment.history || [];
      updates.history = [...currentHistory, historyEntry];
      
      // Notify Customer if status changed
      if (shipment.customerId) {
        NotificationService.create(
           shipment.customerId,
           `Shipment Update: ${data.status}`,
           `Your shipment #${shipment.id} status has been updated to ${data.status}.`,
           'info',
           `/shipments/${id}`
        );
      }
      
      // Notify Carrier if assigned
      if (shipment.carrierId && shipment.carrierId !== user.id) {
         NotificationService.create(
           shipment.carrierId,
           `Shipment Assigned/Update`,
           `Shipment #${shipment.id} status updated to ${data.status}.`,
           'info',
           `/shipments/${id}`
        );
      }
    }

    return ShipmentModel.update(id, updates);
  },

  delete: (id, user) => {
     const shipment = ShipmentModel.findById(id);
     if (!shipment) return false;

     if (user.role !== 'admin' && user.role !== 'operator' && shipment.operatorId !== user.id) {
        throw new Error('Unauthorized delete');
     }
     
     return ShipmentModel.delete(id);
  }
};
