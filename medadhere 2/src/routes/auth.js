const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

// Note: passwordHash may be empty for Google-only users.

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "password must be at least 6 characters" });
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: "email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email: normalizedEmail, passwordHash });

  const token = jwt.sign(
    { id: user._id.toString(), email: user.email },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "7d" },
  );

  res
    .status(201)
    .json({ token, user: { id: user._id.toString(), email: user.email } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id.toString(), email: user.email },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "7d" },
  );

  res
    .status(200)
    .json({ token, user: { id: user._id.toString(), email: user.email } });
});

router.get("/me", (req, res) => {
  // Client-side gating uses this endpoint to validate token presence.
  // We verify JWT here using the same secret as the middleware.
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    return res
      .status(200)
      .json({ user: { id: payload.id, email: payload.email } });
  } catch (e) {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
});

module.exports = router;
