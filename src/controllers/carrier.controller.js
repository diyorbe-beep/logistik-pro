import { CarrierService } from '../services/carrier.service.js';

export const CarrierController = {
  getAll: (req, res) => {
    try {
      const carriers = CarrierService.getAll(req.user);
      res.json(carriers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getOne: (req, res) => {
    try {
      const carrier = CarrierService.getById(req.params.id);
      if (!carrier) return res.status(404).json({ error: 'Carrier not found' });
      res.json(carrier);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getHistory: (req, res) => {
    try {
      const history = CarrierService.getHistory(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  create: (req, res) => {
    try {
      const carrier = CarrierService.create(req.body, req.user);
      res.status(201).json(carrier);
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  update: (req, res) => {
    try {
      const carrier = CarrierService.update(req.params.id, req.body, req.user);
      if (!carrier) return res.status(404).json({ error: 'Carrier not found' });
      res.json(carrier);
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  delete: (req, res) => {
    try {
      const success = CarrierService.delete(req.params.id, req.user);
      if (!success) return res.status(404).json({ error: 'Carrier not found' });
      res.json({ message: 'Carrier deleted' });
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }
};
