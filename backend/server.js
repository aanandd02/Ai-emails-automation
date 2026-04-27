console.log("Starting server.js");
import "dotenv/config";
import express from "express";
import cors from "cors";
console.log("Imports done");
import automationRoutes from "./src/routes/automationRoutes.js";
import logger from "./src/utils/logger.js";
import { loginHandler, logoutHandler, requireAuth } from "./src/middleware/auth.js";

console.log("All imports done");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("App created");

// Frontend origin(s) allowed for CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());

// Public auth endpoints
app.post("/api/login", loginHandler);
app.post("/api/logout", logoutHandler);

// Protected automation APIs
app.use("/api", requireAuth, automationRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "running", message: "AI Email Automation API is active", healthCheck: "/health" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

console.log("Calling app.listen...");
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  logger.info(`API server running on http://localhost:${PORT}`);
});
console.log("app.listen called");

// Keep event loop alive
setInterval(() => {}, 3600000);
