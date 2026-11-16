const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const auth = require("../controllers/userController");
const stores = require("../controllers/storeController");
const products = require("../controllers/productController");
const orders = require("../controllers/orderController");
const admin = require("../controllers/adminController");
const { protect, allow } = require("../middlewares/authMiddleware");
const authRouter = express.Router();
authRouter.post("/register", asyncHandler(auth.registerController));
authRouter.post("/login", asyncHandler(auth.loginController));
authRouter.get("/me", protect, asyncHandler(auth.meController));
const storeRouter = express.Router();
storeRouter.get("/", asyncHandler(stores.list));
storeRouter.get("/mine", protect, allow("owner"), asyncHandler(stores.mine));
storeRouter.post("/", protect, allow("owner"), asyncHandler(stores.create));
storeRouter.get("/:id", asyncHandler(stores.details));
storeRouter.put("/:id", protect, allow("owner"), asyncHandler(stores.update));
const productRouter = express.Router();
productRouter.get(
  "/mine",
  protect,
  allow("owner"),
  asyncHandler(products.mine),
);
productRouter.get("/", asyncHandler(products.list));
productRouter.post("/", protect, allow("owner"), asyncHandler(products.create));
productRouter.put(
  "/:id",
  protect,
  allow("owner"),
  asyncHandler(products.update),
);
productRouter.delete(
  "/:id",
  protect,
  allow("owner"),
  asyncHandler(products.remove),
);
const orderRouter = express.Router();
orderRouter.post("/", protect, allow("customer"), asyncHandler(orders.create));
orderRouter.get("/mine", protect, allow("customer"), asyncHandler(orders.mine));
orderRouter.get(
  "/owner",
  protect,
  allow("owner"),
  asyncHandler(orders.ownerOrders),
);
orderRouter.patch(
  "/:id/status",
  protect,
  allow("owner"),
  asyncHandler(orders.updateStatus),
);
const adminRouter = express.Router();
adminRouter.use(protect, allow("admin"));
adminRouter.get("/overview", asyncHandler(admin.overview));
adminRouter.get("/stores", asyncHandler(admin.stores));
adminRouter.patch("/stores/:id/approval", asyncHandler(admin.approveStore));
adminRouter.get("/users", asyncHandler(admin.users));
adminRouter.patch("/users/:id/toggle", asyncHandler(admin.toggleUser));
adminRouter.get("/orders", asyncHandler(admin.orders));
module.exports = {
  auth: authRouter,
  stores: storeRouter,
  products: productRouter,
  orders: orderRouter,
  admin: adminRouter,
};
