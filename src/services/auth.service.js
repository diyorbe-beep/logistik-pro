import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model.js';
import { config } from '../config/config.js';

export const AuthService = {
  register: async (userData) => {
    const { username, email, password, role, userType, phone } = userData;

    // Check existing
    if (UserModel.findByUsername(username)) {
      throw new Error('Username already exists');
    }
    if (UserModel.findByEmail(email)) {
      throw new Error('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const finalRole = role || (userType === 'customer' ? 'customer' : userType === 'carrier' ? 'carrier' : userType === 'operator' ? 'operator' : 'user');

    const newUser = UserModel.create({
      username,
      email,
      password: hashedPassword,
      role: finalRole,
      userType: userType || finalRole,
      phone: phone || ''
    });

    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  login: async (username, password) => {
    const user = UserModel.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      userType: user.userType
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '24h' });

    const { password: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }
};
