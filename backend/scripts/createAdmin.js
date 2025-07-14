import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createAdmin = async () => {
  const username = 'admin';
  const password = 'admin123';
  const role = 'admin';

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const existing = await User.findOne({ username });
  if (existing) {
    console.log('Admin user already exists');
    process.exit();
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed, role });
  await user.save();
  console.log('Admin user created');
  process.exit();
};

createAdmin(); 