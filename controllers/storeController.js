const Store = require("../modals/storeModal");
const Product = require("../modals/productModal");
exports.list = async (req, res) => {
  const filter = { isApproved: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search)
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { category: { $regex: req.query.search, $options: "i" } },
      { address: { $regex: req.query.search, $options: "i" } },
    ];
  if (req.query.lat !== undefined && req.query.lng !== undefined) {
    const lat = Number(req.query.lat),
      lng = Number(req.query.lng),
      radius = Math.min(Number(req.query.radius) || 25000, 100000);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    )
      return res.status(400).json({ message: "Invalid location coordinates" });
    filter.location = {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radius,
      },
    };
  }
  const stores = await Store.find(filter).sort(
    req.query.lat !== undefined ? {} : { createdAt: -1 },
  );
  res.json({ stores });
};
exports.mine = async (req, res) =>
  res.json({
    stores: await Store.find({ owner: req.user._id }).sort({ createdAt: -1 }),
  });
exports.create = async (req, res) => {
  const b = req.body;
  const coords = b.location?.coordinates || [
    Number(b.longitude ?? 50.55),
    Number(b.latitude ?? 26.12),
  ];
  if (
    !b.name?.trim() ||
    !b.address?.trim() ||
    coords.length !== 2 ||
    !coords.every(Number.isFinite)
  )
    return res
      .status(400)
      .json({
        message:
          "Store name, address and valid longitude/latitude are required",
      });
  const store = await Store.create({
    owner: req.user._id,
    name: b.name,
    description: b.description,
    category: b.category,
    address: b.address,
    phone: b.phone,
    location: { type: "Point", coordinates: coords },
    deliveryRadiusKm: Number(b.deliveryRadiusKm) || 5,
    deliveryFee: Number(b.deliveryFee) || 0,
    minOrder: Number(b.minOrder) || 0,
    image: b.image,
    openingHours: b.openingHours,
  });
  res.status(201).json({ store });
};
exports.details = async (req, res) => {
  const store = await Store.findOne({ _id: req.params.id, isApproved: true });
  if (!store) return res.status(404).json({ message: "Store not found" });
  const products = await Product.find({
    store: store._id,
    isAvailable: true,
    stock: { $gt: 0 },
  });
  res.json({ store, products });
};
exports.update = async (req, res) => {
  const store = await Store.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });
  if (!store) return res.status(404).json({ message: "Store not found" });
  [
    "name",
    "description",
    "category",
    "address",
    "phone",
    "deliveryRadiusKm",
    "deliveryFee",
    "minOrder",
    "isOpen",
    "openingHours",
    "image",
  ].forEach((k) => {
    if (req.body[k] !== undefined) store[k] = req.body[k];
  });
  await store.save();
  res.json({ store });
};
