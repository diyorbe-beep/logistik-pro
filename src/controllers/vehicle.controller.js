import { VehicleService } from '../services/vehicle.service.js';

export const VehicleController = {
  getAll: (req, res) => {
    try {
      const vehicles = VehicleService.getAll(req.user);
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getOne: (req, res) => {
    try {
      const vehicle = VehicleService.getById(req.params.id);
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  create: (req, res) => {
    try {
      const vehicle = VehicleService.create(req.body, req.user);
      res.status(201).json(vehicle);
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  update: (req, res) => {
    try {
      const vehicle = VehicleService.update(req.params.id, req.body, req.user);
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
      res.json(vehicle);
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  delete: (req, res) => {
    try {
      const success = VehicleService.delete(req.params.id, req.user);
      if (!success) return res.status(404).json({ error: 'Vehicle not found' });
      res.json({ message: 'Vehicle deleted' });
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }
};
