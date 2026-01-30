import { OrderModel, ShipmentModel } from '../models/generic.model.js';

export const OrderService = {
  getAll: (user) => {
    const orders = OrderModel.findAll();
    // Admin and Operator see ALL orders
    if (user.role === 'admin' || user.role === 'operator') {
      return orders;
    }
    // Customer sees only their own orders
    if (user.role === 'customer') {
      return orders.filter(o => String(o.customerId) === String(user.id));
    }
    return [];
  },

  getOne: (id, user) => {
    const order = OrderModel.findById(id);
    if (!order) return null;

    // Visibility check
    if (user.role === 'admin' || user.role === 'operator') return order;
    if (user.role === 'customer' && String(order.customerId) === String(user.id)) return order;
    
    return null;
  },

  create: (data, user) => {
    // Basic validation
    if (!data.origin || !data.destination || !data.recipientName) {
      throw new Error('Missing required fields');
    }

    const newOrder = {
      ...data,
      customerId: user.id || data.customerId, // specific logic might be needed if operators create orders for customers
      status: 'Pending',
      trackingNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    return OrderModel.create(newOrder);
  },

  update: (id, data, user) => {
    const order = OrderModel.findById(id);
    if (!order) return null;

    // Permission check
    if (user.role !== 'admin' && user.role !== 'operator' && String(order.customerId) !== String(user.id)) {
      throw new Error('Unauthorized');
    }

    return OrderModel.update(id, data);
  },

  delete: (id, user) => {
    const order = OrderModel.findById(id);
    if (!order) return null;

    if (user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    return OrderModel.delete(id);
  },

  convertToShipment: (id, user) => {
    const order = OrderModel.findById(id);
    if (!order) throw new Error('Order not found');

    if (user.role !== 'admin' && user.role !== 'operator') {
      throw new Error('Unauthorized');
    }

    if (order.status === 'Converted to Shipment') {
      throw new Error('Order already converted');
    }

    // Create Shipment from Order data
    const shipmentData = {
      trackingNumber: order.trackingNumber.replace('ORD', 'SHP'),
      origin: order.origin,
      destination: order.destination,
      status: 'Pending',
      sender: user.name || 'System', // Or fetch customer name
      recipient: order.recipientName,
      weight: order.weight,
      price: order.estimatedPrice,
      customerId: order.customerId,
      operatorId: user.id, // Assign to current operator
      convertedFromOrderId: order.id
    };

    const newShipment = ShipmentModel.create(shipmentData);

    // Update Order status
    OrderModel.update(id, { status: 'Converted to Shipment', relatedShipmentId: newShipment.id });

    return newShipment;
  }
};
