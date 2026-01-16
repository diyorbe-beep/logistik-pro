import { readData, writeData, DATA_FILES } from '../utils/fileDb.js';

const createModel = (fileKey) => ({
  findAll: () => readData(DATA_FILES[fileKey]),
  
  findById: (id) => {
    const items = readData(DATA_FILES[fileKey]);
    return items.find(item => item.id === parseInt(id));
  },
  
  create: (data) => {
    const items = readData(DATA_FILES[fileKey]);
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    const newItem = { 
      id: newId, 
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(newItem);
    writeData(DATA_FILES[fileKey], items);
    return newItem;
  },
  
  update: (id, updates) => {
    const items = readData(DATA_FILES[fileKey]);
    const index = items.findIndex(item => item.id === parseInt(id));
    if (index === -1) return null;
    
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    writeData(DATA_FILES[fileKey], items);
    return items[index];
  },
  
  delete: (id) => {
    const items = readData(DATA_FILES[fileKey]);
    const index = items.findIndex(item => item.id === parseInt(id));
    if (index === -1) return false;
    
    items.splice(index, 1);
    writeData(DATA_FILES[fileKey], items);
    return true;
  }
});

export const ShipmentModel = createModel('SHIPMENTS');
export const OrderModel = createModel('ORDERS');
export const VehicleModel = createModel('VEHICLES');
export const PricingModel = createModel('PRICING');
export const CarrierModel = createModel('CARRIERS');
export const NewsModel = createModel('NEWS');
