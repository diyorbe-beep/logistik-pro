import { ShipmentModel } from '../models/generic.model.js';

export const ShipmentService = {
  getAll: (user) => {
    const shipments = ShipmentModel.findAll();
    if (user.role === 'admin' || user.role === 'operator') return shipments;
    if (user.role === 'carrier') return shipments.filter(s => s.carrierId === user.id);
    if (user.role === 'customer') return shipments.filter(s => s.customerId === user.id);
    return [];
  },

  getById: (id, user) => {
    const shipment = ShipmentModel.findById(id);
    if (!shipment) return null;

    if (user.role === 'admin' || user.role === 'operator') return shipment;
    if (user.role === 'carrier' && shipment.carrierId === user.id) return shipment;
    if (user.role === 'customer' && shipment.customerId === user.id) return shipment;
    
    throw new Error('Unauthorized access');
  },

  create: (data, user) => {
    return ShipmentModel.create({
      ...data,
      status: data.status || 'Received',
      customerId: data.customerId || user.id,
      operatorId: user.id, // Assuming operator creates it, or logic needs adjustment if customer creates
      carrierId: null,
      operatorConfirmed: false
    });
  },

  update: (id, data, user) => {
    const shipment = ShipmentModel.findById(id);
    if (!shipment) return null;

    // Authorization check logic for update
    if (user.role !== 'admin' && user.role !== 'operator' && shipment.operatorId !== user.id) {
       throw new Error('Unauthorized update');
    }

    return ShipmentModel.update(id, data);
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
