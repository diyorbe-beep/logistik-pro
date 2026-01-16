import { readData, writeData, DATA_FILES } from '../utils/fileDb.js';

export const UserModel = {
  findAll: () => {
    return readData(DATA_FILES.USERS);
  },

  findById: (id) => {
    const users = readData(DATA_FILES.USERS);
    return users.find(user => user.id === id);
  },

  findByUsername: (username) => {
    const users = readData(DATA_FILES.USERS);
    return users.find(user => user.username === username);
  },

  findByEmail: (email) => {
    const users = readData(DATA_FILES.USERS);
    return users.find(user => user.email === email);
  },

  create: (userData) => {
    const users = readData(DATA_FILES.USERS);
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const newUser = { id: newId, ...userData };
    
    users.push(newUser);
    writeData(DATA_FILES.USERS, users);
    
    return newUser;
  }
};
