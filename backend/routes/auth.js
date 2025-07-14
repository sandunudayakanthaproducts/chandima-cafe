import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, role });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
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
    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username role');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a user by username (admin only)
router.delete('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const deleted = await User.findOneAndDelete({ username });
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update admin username and/or password (admin only)
router.put('/admin-update', async (req, res) => {
  try {
    const { currentUsername, username, password } = req.body;
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
    res.json({ message: 'Admin updated', user: { username: admin.username, role: admin.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 