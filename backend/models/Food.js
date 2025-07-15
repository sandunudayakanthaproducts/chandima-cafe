import mongoose from 'mongoose';

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  barcode: { type: String, unique: true, sparse: true }
});

const Food = mongoose.model('Food', foodSchema);
export default Food; 