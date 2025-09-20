const mongoose = require('mongoose');
const BookSchema = new mongoose.Schema({
  title: String,
  price: Number,
  inStock: Boolean,
  availabilityText: String,
  rating: Number,
  detailUrl: { type: String, unique: true },
  thumbnail: String
}, { timestamps: true });
BookSchema.index({ title: 'text' });
module.exports = mongoose.model('Book', BookSchema);
