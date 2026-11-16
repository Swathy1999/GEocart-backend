const User = require("../modals/userModal");
const Store = require("../modals/storeModal");
const Product = require("../modals/productModal");
const Order = require("../modals/orderModal");
exports.overview = async (req, res) => {
  const [customers, owners, stores, pendingStores, products, orders, revenue] =
    await Promise.all([
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "owner" }),
      Store.countDocuments(),
      Store.countDocuments({ isApproved: false }),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);
  res.json({
    stats: {
      customers,
      owners,
      stores,
      pendingStores,
      products,
      orders,
      revenue: revenue[0]?.total || 0,
    },
  });
};
exports.stores = async (req, res) =>
  res.json({
    stores: await Store.find()
      .populate("owner", "name email")
      .sort({ createdAt: -1 }),
  });
exports.approveStore = async (req, res) => {
  const store = await Store.findByIdAndUpdate(
    req.params.id,
    { isApproved: !!req.body.isApproved },
    { new: true },
  ).populate("owner", "name email");
  if (!store) return res.status(404).json({ message: "Store not found" });
  res.json({ store });
};
exports.users = async (req, res) =>
  res.json({
    users: await User.find().select("-password").sort({ createdAt: -1 }),
  });
exports.toggleUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role == "admin")
    return res
      .status(400)
      .json({ message: "Admin accounts cannot be disabled here" });
  user.isActive = !user.isActive;
  await user.save();
  res.json({
    user: { id: user._id, name: user.name, isActive: user.isActive },
  });
};
exports.orders = async (req, res) =>
  res.json({
    orders: await Order.find()
      .populate("customer", "name email")
      .populate("store", "name")
      .sort({ createdAt: -1 })
      .limit(300),
  });
