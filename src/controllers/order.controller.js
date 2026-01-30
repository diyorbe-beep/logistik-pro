import { OrderService } from '../services/order.service.js';

export const OrderController = {
  getAll: (req, res) => {
    try {
      const orders = OrderService.getAll(req.user);
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getOne: (req, res) => {
    try {
      const order = OrderService.getOne(req.params.id, req.user);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  create: (req, res) => {
    try {
      const order = OrderService.create(req.body, req.user);
      res.status(201).json(order);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  update: (req, res) => {
    try {
      const order = OrderService.update(req.params.id, req.body, req.user);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  delete: (req, res) => {
    try {
      const success = OrderService.delete(req.params.id, req.user);
      if (!success) return res.status(404).json({ error: 'Order not found' });
      res.json({ message: 'Order deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  convertToShipment: (req, res) => {
    try {
      const shipment = OrderService.convertToShipment(req.params.id, req.user);
      res.json(shipment);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};
