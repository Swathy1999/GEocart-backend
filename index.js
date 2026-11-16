
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const routes = require("./routes/allRoutes");

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",")
      : true,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to GeoCart API",
    status: "Server is running",
  });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    app: "GeoCart API",
  });
});

// Authentication routes with rate limiting
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
    },
  }),
  routes.auth
);

// Other API routes
app.use("/api/stores", routes.stores);
app.use("/api/products", routes.products);
app.use("/api/orders", routes.orders);
app.use("/api/admin", routes.admin);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  if (res.headersSent) {
    return next(err);
  }

  const status =
    err.name === "ValidationError" || err.name === "CastError"
      ? 400
      : err.status || 500;

  res.status(status).json({
    success: false,
    message:
      status === 500
        ? "Server error. Check API logs."
        : err.message || "Invalid request",
  });
});

// Start server after database connection
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT,  () => {
      console.log(`GeoCart API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });
