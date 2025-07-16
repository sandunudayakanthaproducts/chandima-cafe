import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  await connectToDatabase();
  const { method, body, query } = req;

  if (method === 'POST' && req.url.endsWith('/register')) {
    const { username, password, role } = body;
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    try {
      const existing = await User.findOne({ username });
      if (existing) return res.status(400).json({ message: 'Username already exists' });
      const hashed = await bcrypt.hash(password, 10);
      const user = new User({ username, password: hashed, role });
      await user.save();
      return res.status(201).json({ message: 'User registered' });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'POST' && req.url.endsWith('/login')) {
    const { username, password } = body;
    try {
      const user = await User.findOne({ username });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ message: 'Invalid credentials' });
      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      return res.json({ token, user: { username: user.username, role: user.role } });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'GET' && req.url.endsWith('/users')) {
    try {
      const users = await User.find({}, 'username role');
      return res.json(users);
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'DELETE' && req.url.includes('/users/')) {
    const username = req.query.username || req.url.split('/users/')[1];
    try {
      const deleted = await User.findOneAndDelete({ username });
      if (!deleted) return res.status(404).json({ message: 'User not found' });
      return res.json({ message: 'User deleted' });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  if (method === 'PUT' && req.url.endsWith('/admin-update')) {
    try {
      const { currentUsername, username, password } = body;
      const update = {};
      if (username) update.username = username;
      if (password) {
        update.password = await bcrypt.hash(password, 10);
      }
      const admin = await User.findOneAndUpdate(
        { username: currentUsername, role: 'admin' },
        update,
        { new: true }
      );
      if (!admin) return res.status(404).json({ message: 'Admin not found' });
      return res.json({ message: 'Admin updated', user: { username: admin.username, role: admin.role } });
    } catch (err) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
} 