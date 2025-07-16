import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  liquor: { type: mongoose.Schema.Types.ObjectId, ref: 'Liquor' }, // not required for cocktail
  cocktail: { type: mongoose.Schema.Types.ObjectId, ref: 'Cocktail' }, // only for cocktail sales
  store: { type: Number, required: true },
  type: { type: String, enum: ['bottle', 'shot', 'add', 'cocktail'], required: true },
  quantity: { type: Number, required: true }, // ml for shot/cocktail, bottles for bottle/add
  price: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  user: { type: String },
  billId: { type: String }, // optional, for bill grouping
});

export default mongoose.model('Sale', saleSchema); 