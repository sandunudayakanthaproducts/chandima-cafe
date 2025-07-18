import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  liquorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Liquor', required: true },
  brand: { type: String, required: true },
  volume: { type: Number, required: true }, // in ml
}, { _id: false });

const cocktailSchema = new mongoose.Schema({
  name: { type: String, required: true },
  barcode: { type: String, unique: true, sparse: true },
  price: { type: Number, required: true },
  ingredients: { type: [ingredientSchema], required: true }
});

const Cocktail = mongoose.model('Cocktail', cocktailSchema);
export default Cocktail; 