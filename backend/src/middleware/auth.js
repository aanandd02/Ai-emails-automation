import crypto from "crypto";

const USERNAME = process.env.BASIC_AUTH_USER;
const PASSWORD = process.env.BASIC_AUTH_PASS;

if (!USERNAME || !PASSWORD) {
  throw new Error("Missing BASIC_AUTH_USER or BASIC_AUTH_PASS env vars");
}

// In-memory token store; regenerated on each server start.
const activeTokens = new Set();

export function loginHandler(req, res) {
  const { username, password } = req.body || {};

  if (username !== USERNAME || password !== PASSWORD) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = crypto.randomUUID();
  activeTokens.add(token);

  res.json({ token });
}

export function logoutHandler(req, res) {
  const token = extractToken(req);
  if (token) {
    activeTokens.delete(token);
  }
  res.json({ loggedOut: true });
}

export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (token && activeTokens.has(token)) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  if (req.query?.token) {
    return req.query.token;
  }
  return null;
}

export default { loginHandler, logoutHandler, requireAuth };
