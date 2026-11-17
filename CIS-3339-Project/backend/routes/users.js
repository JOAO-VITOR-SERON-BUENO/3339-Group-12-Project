// This file contains all API endpoints for interacting with the "users" collection in the MongoDB database
const express = require('express');
const router = express.Router();
// import bcrypt for comparing password to hashed password
const bcrypt = require('bcryptjs');
// import JWT (JSON Web Token) to create a web token to the user after a successful login - allows user to make API calls
const jwt = require('jsonwebtoken');

// import users data model schema
const { users } = require('../models/models');

// one message for every failed login, so the response never reveals whether the username exists
const INVALID_LOGIN = 'Invalid username or password';

// compared against when the username doesn't exist, so a failed lookup takes as long as a wrong password
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// API endpoint to handle login
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body || {};

  // only accept plain strings (blocks query-operator injection such as { "$ne": null })
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    !username ||
    !password
  ) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // this backend instance serves a single organization (ORG_ID)
    const user = await users.findOne({ username, org: process.env.ORG_ID });
    const isMatch = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_HASH
    );

    if (!user || !isMatch) {
      return res.status(401).json({ error: INVALID_LOGIN });
    }

    // orgId in the token is what every protected route uses to scope its queries
    const payload = {
      name: user.username,
      role: user.role,
      orgId: String(user.org)
    };

    // token expires in 30 days. This is not best security practice but still demonstrates how JWT work
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
