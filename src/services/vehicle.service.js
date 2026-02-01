import { VehicleModel } from '../models/generic.model.js';

export const VehicleService = {
  getAll: (user) => {
    return VehicleModel.findAll();
  },

  getById: (id) => {
    return VehicleModel.findById(id);
  },

  create: (data, user) => {
    if (user.role !== 'admin' && user.role !== 'operator') {
      throw new Error('Insufficient permissions');
    }
    return VehicleModel.create(data);
  },

  update: (id, data, user) => {
    if (user.role !== 'admin' && user.role !== 'operator') {
      throw new Error('Insufficient permissions');
    }
    return VehicleModel.update(id, data);
  },

  delete: (id, user) => {
    if (user.role !== 'admin' && user.role !== 'operator') {
      throw new Error('Insufficient permissions');
    }
    return VehicleModel.delete(id);
  }
};
