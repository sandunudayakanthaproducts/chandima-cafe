import mongoose from 'mongoose';

const transferSchema = new mongoose.Schema({
  liquor: { type: mongoose.Schema.Types.ObjectId, ref: 'Liquor', required: true },
  fromStore: { type: Number, default: 1 },
  toStore: { type: Number, default: 2 },
  quantity: { type: Number, required: true },
  user: { type: String }
}, { timestamps: true }); // Add timestamps

export default mongoose.model('Transfer', transferSchema); 