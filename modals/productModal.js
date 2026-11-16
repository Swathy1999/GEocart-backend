const mongoose = require("mongoose");
const productSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General" },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    sku: { type: String, default: "" },
    stock: { type: Number, default: 0, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);
productSchema.index({ name: "text", description: "text", category: "text" });
module.exports = mongoose.model("Product", productSchema);
