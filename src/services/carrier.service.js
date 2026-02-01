import { CarrierModel, ShipmentModel, UserModel } from '../models/generic.model.js';

export const CarrierService = {
  getAll: (user) => {
    const users = UserModel.findAll();
    const carriers = users.filter(u => u.role === 'carrier');
    
    // Add statistics for each carrier
    const shipments = ShipmentModel.findAll();
    return carriers.map(carrier => {
      const carrierShipments = shipments.filter(s => String(s.carrierId) === String(carrier.id));
      return {
        ...carrier,
        password: undefined, // Don't send passwords
        totalShipments: carrierShipments.length,
        completedShipments: carrierShipments.filter(s => s.status === 'Delivered').length,
        activeShipments: carrierShipments.filter(s => s.status === 'In Transit').length
      };
    });
  },

  getById: (id) => {
    const user = UserModel.findById(id);
    if (!user || user.role !== 'carrier') return null;
    return { ...user, password: undefined };
  },

  getHistory: (carrierId) => {
    const shipments = ShipmentModel.findAll();
    return shipments.filter(s => String(s.carrierId) === String(carrierId));
  },

  create: (data, user) => {
    if (user.role !== 'admin' && user.role !== 'operator') {
      throw new Error('Insufficient permissions');
    }
    return CarrierModel.create(data);
  },

  update: (id, data, user) => {
    if (user.role !== 'admin' && user.role !== 'operator' && String(id) !== String(user.id)) {
      throw new Error('Insufficient permissions');
    }
    return CarrierModel.update(id, data);
  },

  delete: (id, user) => {
    if (user.role !== 'admin' && user.role !== 'operator') {
      throw new Error('Insufficient permissions');
    }
    return CarrierModel.delete(id);
  }
};
