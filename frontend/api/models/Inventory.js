import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  liquor: { type: mongoose.Schema.Types.ObjectId, ref: 'Liquor', required: true },
  store: { type: Number, required: true }, // 1 or 2
  bottles: { type: Number, default: 0 },
  openVolume: { type: Number, default: 0 }, // ml
});

export default mongoose.model('Inventory', inventorySchema); 