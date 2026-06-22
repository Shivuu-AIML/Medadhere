const express = require('express');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');

const router = express.Router();

function getGoogleClientId() {
  const envClientId = process.env.GOOGLE_CLIENT_ID;
  if (envClientId) return envClientId;

  // Local dev fallback: keep backend + frontend in sync.
  // NOTE: This id MUST match the one in public/index.html.
  return '692120893547-p8lf5ofddh28j7bofiieh8128d6ahkls.apps.googleusercontent.com';
}

function getGoogleClient() {
  const clientId = getGoogleClientId();
  return new OAuth2Client(clientId);
}

router.post('/token', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const clientId = getGoogleClientId();
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });


    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const email = String(payload.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(401).json({ error: 'Google token missing email' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      // Create a user with no password (Google-only).
      user = await User.create({
        email,
        passwordHash: null,
      });
    }


    // Issue our app JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    res.status(200).json({ token, user: { id: user._id.toString(), email: user.email } });
  } catch (err) {
    // Helpful debugging without leaking the actual token.
    console.error('Google auth error:', {
      message: err?.message,
      name: err?.name,
      stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
    });

    res.status(401).json({ error: 'Google authentication failed' });
  }

});

module.exports = router;

