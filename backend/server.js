import "dotenv/config";
import express from "express";
import cors from "cors";
import automationRoutes from "./src/routes/automationRoutes.js";
import logger from "./src/utils/logger.js";
import { loginHandler, logoutHandler, requireAuth } from "./src/middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  logger.info(`API server running on http://localhost:${PORT}`);
});
