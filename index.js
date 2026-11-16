require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const app = express();
app.use(helmet());
app.use(
  cors(),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));
app.use(
  "/api/auth",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }),
  require("./routes/allRoutes").auth,
);
app.use("/api/stores", require("./routes/allRoutes").stores);
app.use("/api/products", require("./routes/allRoutes").products);
app.use("/api/orders", require("./routes/allRoutes").orders);
app.use("/api/admin", require("./routes/allRoutes").admin);
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", app: "GeoCart API" }),
);
app.use((req, res) => res.status(404).json({ message: "API route not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status =
    err.name == "ValidationError" || err.name == "CastError"
      ? 400
      : err.status || 500;
  res
    .status(status)
    .json({
      message:
        status == 500
          ? "Server error. Check API logs."
          : err.message || "Invalid request",
    });
});

const PORT = process.env.PORT ;
connectDB()
  .then(() =>
    app.listen(PORT, () => console.log(`GeoCart API running on ${PORT}`)),
  )
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });
