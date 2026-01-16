import { UserModel } from '../models/user.model.js';

export const UserController = {
  getProfile: (req, res) => {
    // req.user is already set by middleware
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  },

  getAll: (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      const users = UserModel.findAll();
      const safeUsers = users.map(user => {
         const { password, ...safe } = user;
         return safe;
      });
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
