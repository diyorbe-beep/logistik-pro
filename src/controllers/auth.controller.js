import { AuthService } from '../services/auth.service.js';

export const AuthController = {
  register: async (req, res) => {
    try {
      const user = await AuthService.register(req.body);
      res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
      if (error.message === 'Username already exists' || error.message === 'Email already exists') {
        return res.status(400).json({ error: error.message });
      }
      console.error('Register Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const result = await AuthService.login(username, password);
      res.json(result);
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: error.message });
      }
      console.error('Login Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
