import mongoose from 'mongoose';

const transferSchema = new mongoose.Schema({
  liquor: { type: mongoose.Schema.Types.ObjectId, ref: 'Liquor', required: true },
  fromStore: { type: Number, required: true },
  toStore: { type: Number, required: true },
  quantity: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  user: { type: String },
});

export default mongoose.model('Transfer', transferSchema); 