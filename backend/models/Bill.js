import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
  billId: { type: String, required: true, unique: true },
  items: [
    {
      brand: { type: String },
      type: { type: String },
      qty: { type: Number },
      price: { type: Number },
      shotSize: { type: Number },
      liquorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Liquor' }
    }
  ],
  total: { type: Number },
  time: { type: Date, default: Date.now },
  user: { type: String }
});

// Remove old model if it exists (dev hot reload fix)
delete mongoose.connection.models.Bill;

export default mongoose.model('Bill', billSchema); 