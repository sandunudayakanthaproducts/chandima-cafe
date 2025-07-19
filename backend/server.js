import express, { json } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import liquorRoutes from './routes/liquor.js';
import inventoryRoutes from './routes/inventory.js';
import transferRoutes from './routes/transfer.js';
import saleRoutes from './routes/sale.js';
import billRoutes from './routes/bill.js';
import restaurantRoutes from './routes/restaurant.js';
import foodRoutes from './routes/food.js';
import cocktailRoutes from './routes/cocktail.js';

config();

const app = express();
app.use(cors());
app.use(json());

// MongoDB connection (with connection caching for serverless)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}
async function connectToDatabase() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Middleware to ensure DB connection for every request
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    res.status(500).json({ message: 'Database connection error', error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/liquor', liquorRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/sale', saleRoutes);
app.use('/api/bill', billRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/cocktail', cocktailRoutes);

app.get('/', (req, res) => {
  res.send('Bar Management System API');
});

export default app; 
