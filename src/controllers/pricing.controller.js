import { PricingService } from '../services/pricing.service.js';

export const PricingController = {
  getAll: (req, res) => {
    try {
      const pricing = PricingService.getAll();
      res.json(pricing);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getOne: (req, res) => {
    try {
      const pricing = PricingService.getById(req.params.id);
      if (!pricing) return res.status(404).json({ error: 'Pricing not found' });
      res.json(pricing);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  create: (req, res) => {
    try {
      const pricing = PricingService.create(req.body, req.user);
      res.status(201).json(pricing);
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  update: (req, res) => {
    try {
      const pricing = PricingService.update(req.params.id, req.body, req.user);
      if (!pricing) return res.status(404).json({ error: 'Pricing not found' });
      res.json(pricing);
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  delete: (req, res) => {
    try {
      const success = PricingService.delete(req.params.id, req.user);
      if (!success) return res.status(404).json({ error: 'Pricing not found' });
      res.json({ message: 'Pricing deleted' });
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }
};
