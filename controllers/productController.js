const Product = require("../modals/productModal");
const Store = require("../modals/storeModal");
exports.mine = async (req, res) => {
  const stores = await Store.find({ owner: req.user._id }).select("_id");
  res.json({
    products: await Product.find({
      store: { $in: stores.map((s) => s._id) },
    }).populate("store", "name address"),
  });
};
exports.list = async (req, res) => {
  const filter = { isAvailable: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search)
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { category: { $regex: req.query.search, $options: "i" } },
    ];
  if (req.query.store) filter.store = req.query.store;
  const products = await Product.find(filter).populate({
    path: "store",
    match: { isApproved: true },
    select: "name address deliveryFee deliveryRadiusKm isOpen",
  });
  res.json({ products: products.filter((p) => p.store) });
};
exports.create = async (req, res) => {
  const { storeId, name, description, category, price, stock, sku, image } =
    req.body;
  const store = await Store.findOne({ _id: storeId, owner: req.user._id });
  if (!store)
    return res.status(404).json({ message: "Your store was not found" });
  if (
    !name?.trim() ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0 ||
    !Number.isInteger(Number(stock ?? 0)) ||
    Number(stock ?? 0) < 0
  )
    return res
      .status(400)
      .json({
        message:
          "Enter a product name, non-negative price and whole-number stock",
      });
  const product = await Product.create({
    store: store._id,
    name,
    description,
    category,
    price: Number(price),
    stock: Number(stock) || 0,
    sku,
    image,
  });
  res.status(201).json({ product });
};
exports.update = async (req, res) => {
  const product = await Product.findById(req.params.id).populate("store");
  if (!product || String(product.store.owner) !== String(req.user._id))
    return res.status(404).json({ message: "Product not found" });
  [
    "name",
    "description",
    "category",
    "price",
    "stock",
    "sku",
    "image",
    "isAvailable",
  ].forEach((k) => {
    if (req.body[k] !== undefined) product[k] = req.body[k];
  });
  await product.save();
  res.json({ product });
};
exports.remove = async (req, res) => {
  const p = await Product.findById(req.params.id).populate("store");
  if (!p || String(p.store.owner) !== String(req.user._id))
    return res.status(404).json({ message: "Product not found" });
  await p.deleteOne();
  res.json({ message: "Product deleted" });
};
