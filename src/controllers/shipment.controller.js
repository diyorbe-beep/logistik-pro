import { ShipmentService } from '../services/shipment.service.js';

export const ShipmentController = {
  getAll: (req, res) => {
    try {
      const shipments = ShipmentService.getAll(req.user);
      res.json(shipments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getOne: (req, res) => {
    try {
      const shipment = ShipmentService.getById(req.params.id, req.user);
      if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
      res.json(shipment);
    } catch (error) {
       if (error.message === 'Unauthorized access') return res.status(403).json({ error: error.message });
       res.status(500).json({ error: error.message });
    }
  },

  create: (req, res) => {
    try {
      const shipment = ShipmentService.create(req.body, req.user);
      res.status(201).json(shipment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  update: (req, res) => {
    try {
      const shipment = ShipmentService.update(req.params.id, req.body, req.user);
      if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
      res.json(shipment);
    } catch (error) {
      if (error.message === 'Unauthorized update') return res.status(403).json({ error: error.message });
      res.status(500).json({ error: error.message });
    }
  },

  delete: (req, res) => {
    try {
      const success = ShipmentService.delete(req.params.id, req.user);
      if (!success) return res.status(404).json({ error: 'Shipment not found' });
      res.json({ message: 'Shipment deleted' });
     } catch (error) {
       if (error.message === 'Unauthorized delete') return res.status(403).json({ error: error.message });
       res.status(500).json({ error: error.message });
     }
  },

  completeDelivery: (req, res) => {
    try {
      const shipment = ShipmentService.completeDelivery(req.params.id, req.body, req.user);
      if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
      res.json(shipment);
    } catch (error) {
      if (error.message === 'Unauthorized complete delivery') return res.status(403).json({ error: error.message });
      res.status(500).json({ error: error.message });
    }
  }
};
