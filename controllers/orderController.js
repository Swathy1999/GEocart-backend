const mongoose = require("mongoose");
const Order = require("../modals/orderModal");
const Product = require("../modals/productModal");
const Store = require("../modals/storeModal");
function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = (v) => (v * Math.PI) / 180,
    dLat = rad(lat2 - lat1),
    dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
exports.create = async (req, res) => {
  const { storeId, items, deliveryAddress, customerPhone, notes, lng, lat } =
    req.body;
  if (
    !mongoose.isValidObjectId(storeId) ||
    !Array.isArray(items) ||
    !items.length ||
    !deliveryAddress?.trim()
  )
    return res
      .status(400)
      .json({
        message:
          "A valid store, at least one item and delivery address are required",
      });
  if ((lng == undefined) !== (lat == undefined))
    return res
      .status(400)
      .json({ message: "Send both longitude and latitude, or neither" });
  const store = await Store.findOne({
    _id: storeId,
    isApproved: true,
    isOpen: true,
  });
  if (!store) return res.status(404).json({ message: "Store is unavailable" });
  const requested = new Map();
  for (const item of items) {
    const qty = Number(item.quantity);
    if (
      !mongoose.isValidObjectId(item.productId) ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > 1000
    )
      return res
        .status(400)
        .json({
          message: "Each item needs a valid product and whole-number quantity",
        });
    requested.set(
      String(item.productId),
      (requested.get(String(item.productId)) || 0) + qty,
    );
  }
  const normalized = [];
  let subtotal = 0;
  const decremented = [];
  try {
    for (const [productId, quantity] of requested) {
      const product = await Product.findOneAndUpdate(
        {
          _id: productId,
          store: store._id,
          isAvailable: true,
          stock: { $gte: quantity },
        },
        { $inc: { stock: -quantity } },
        { new: true },
      );
      if (!product)
        throw Object.assign(
          new Error(
            "A product is unavailable or stock is insufficient. Refresh your cart.",
          ),
          { status: 409 },
        );
      decremented.push({ id: product._id, quantity });
      subtotal += product.price * quantity;
      normalized.push({ product, quantity });
    }
    if (subtotal < store.minOrder)
      throw Object.assign(
        new Error(`Minimum order is BHD ${store.minOrder.toFixed(3)}`),
        { status: 400 },
      );
    let deliveryFee = store.deliveryFee || 0;
    if (lng !== undefined) {
      if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat)))
        throw Object.assign(new Error("Invalid delivery coordinates"), {
          status: 400,
        });
      const [storeLng, storeLat] = store.location.coordinates;
      if (
        distanceKm(Number(lat), Number(lng), storeLat, storeLng) >
        store.deliveryRadiusKm
      )
        throw Object.assign(
          new Error("Delivery address is outside this store delivery area"),
          { status: 400 },
        );
    }
    const order = await Order.create({
      orderNumber: `GC-${Date.now()}`,
      customer: req.user._id,
      store: store._id,
      items: normalized.map((x) => ({
        product: x.product._id,
        name: x.product.name,
        price: x.product.price,
        quantity: x.quantity,
      })),
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      deliveryAddress: deliveryAddress.trim(),
      customerPhone,
      notes,
    });
    res.status(201).json({ order });
  } catch (error) {
    if (decremented.length)
      await Promise.all(
        decremented.map((x) =>
          Product.updateOne({ _id: x.id }, { $inc: { stock: x.quantity } }),
        ),
      );
    throw error;
  }
};
exports.mine = async (req, res) =>
  res.json({
    orders: await Order.find({ customer: req.user._id })
      .populate("store", "name address")
      .sort({ createdAt: -1 }),
  });
exports.ownerOrders = async (req, res) => {
  const stores = await Store.find({ owner: req.user._id }).select("_id");
  res.json({
    orders: await Order.find({ store: { $in: stores.map((s) => s._id) } })
      .populate("customer", "name phone email")
      .populate("store", "name")
      .sort({ createdAt: -1 }),
  });
};
exports.updateStatus = async (req, res) => {
  const stores = await Store.find({ owner: req.user._id }).select("_id");
  const order = await Order.findOne({
    _id: req.params.id,
    store: { $in: stores.map((s) => s._id) },
  });
  if (!order) return res.status(404).json({ message: "Order not found" });
  const allowed = {
    placed: ["accepted", "cancelled"],
    accepted: ["preparing", "cancelled"],
    preparing: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered"],
    delivered: [],
    cancelled: [],
  };
  const next = req.body.status;
  if (!allowed[order.status]?.includes(next))
    return res
      .status(400)
      .json({ message: `Cannot move order from ${order.status} to ${next}` });
  if (next == "cancelled")
    await Promise.all(
      order.items.map((i) =>
        Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } }),
      ),
    );
  order.status = next;
  await order.save();
  res.json({ order });
};
