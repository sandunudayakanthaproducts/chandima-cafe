import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  liquor: { type: mongoose.Schema.Types.ObjectId, ref: 'Liquor', required: true },
  store: { type: Number, required: true },
  type: { type: String, enum: ['bottle', 'shot', 'add'], required: true },
  quantity: { type: Number, required: true }, // ml for shot, bottles for bottle/add
  price: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  user: { type: String },
});

export default mongoose.model('Sale', saleSchema); 