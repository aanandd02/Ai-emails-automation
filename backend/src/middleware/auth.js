import crypto from "crypto";

const USERNAME = process.env.BASIC_AUTH_USER;
const PASSWORD = process.env.BASIC_AUTH_PASS;

if (!USERNAME || !PASSWORD) {
  throw new Error("Missing BASIC_AUTH_USER or BASIC_AUTH_PASS env vars");
}

// Generate a secret key for token validation derived from credentials
const TOKEN_SECRET = crypto.createHash("sha256").update(`${USERNAME}:${PASSWORD}`).digest("hex");

export function loginHandler(req, res) {
  const { username, password } = req.body || {};

  if (username !== USERNAME || password !== PASSWORD) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Generate a stateless token: base64(username:expires:signature)
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const data = `${username}:${expires}`;
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(data).digest("hex");
  const token = Buffer.from(`${data}:${signature}`).toString("base64");

  res.json({ token });
}

export function logoutHandler(req, res) {
  res.json({ loggedOut: true });
}

export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [username, expiresStr, signature] = decoded.split(":");
    const expires = parseInt(expiresStr, 10);

    if (isNaN(expires) || Date.now() > expires) {
      return res.status(401).json({ error: "Token expired" });
    }

    const expectedSignature = crypto.createHmac("sha256", TOKEN_SECRET).update(`${username}:${expires}`).digest("hex");
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    if (username !== USERNAME) {
      return res.status(401).json({ error: "Invalid user" });
    }

    next();
  } catch (e) {
    // Return 401 for invalid/old token formats so frontend logs out and refreshes token
    return res.status(401).json({ error: "Invalid token format" });
  }
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
