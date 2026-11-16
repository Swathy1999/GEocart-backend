const mongoose = require("mongoose");
const storeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General" },
    address: { type: String, required: true },
    phone: { type: String, default: "" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    deliveryRadiusKm: { type: Number, default: 5, min: 0.5, max: 100 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    isApproved: { type: Boolean, default: false },
    isOpen: { type: Boolean, default: true },
    openingHours: { type: String, default: "9:00 AM – 9:00 PM" },
    image: { type: String, default: "" },
  },
  { timestamps: true },
);
storeSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("Store", storeSchema);
