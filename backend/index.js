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

config();

const app = express();
app.use(cors());
app.use(json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/liquor', liquorRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/sale', saleRoutes);
app.use('/api/bill', billRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/food', foodRoutes);

app.get('/', (req, res) => {
  res.send('Bar Management System API');
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 