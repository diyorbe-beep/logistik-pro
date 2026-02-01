import { PricingModel } from '../models/generic.model.js';

export const PricingService = {
  getAll: () => {
    return PricingModel.findAll();
  },

  getById: (id) => {
    return PricingModel.findById(id);
  },

  create: (data, user) => {
    if (user.role !== 'admin' && user.role !== 'operator') {
      throw new Error('Insufficient permissions');
    }
    return PricingModel.create(data);
  },

  update: (id, data, user) => {
    if (user.role !== 'admin' && user.role !== 'operator') {
      throw new Error('Insufficient permissions');
    }
    return PricingModel.update(id, data);
  },

  delete: (id, user) => {
    if (user.role !== 'admin' && user.role !== 'operator') {
      throw new Error('Insufficient permissions');
    }
    return PricingModel.delete(id);
  }
};
