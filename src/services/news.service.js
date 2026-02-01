import { NewsModel } from '../models/generic.model.js';

export const NewsService = {
  getAll: () => {
    return NewsModel.findAll();
  },

  getById: (id) => {
    return NewsModel.findById(id);
  },

  create: (data, user) => {
    if (user.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }
    return NewsModel.create(data);
  },

  update: (id, data, user) => {
    if (user.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }
    return NewsModel.update(id, data);
  },

  delete: (id, user) => {
    if (user.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }
    return NewsModel.delete(id);
  }
};
