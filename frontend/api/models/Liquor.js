import mongoose from 'mongoose';

const liquorSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  size: { type: Number, required: true }, // ml
  barcode: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  shotPrices: { type: Map, of: Number, default: {} }, // e.g. { '25': 300, '50': 600 }
});

export default mongoose.model('Liquor', liquorSchema); 