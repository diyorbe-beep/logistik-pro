import { CarrierModel, ShipmentModel } from '../models/generic.model.js';

export const CarrierService = {
  getAll: (user) => {
    return CarrierModel.findAll();
  },

  getById: (id) => {
    return CarrierModel.findById(id);
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
