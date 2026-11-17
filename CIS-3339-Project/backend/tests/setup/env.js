// Runs before every test file (jest "setupFiles"), before app.js is required.
// dotenv never overrides variables that are already set, so these values win over backend/.env.
// The tests connect to an in-memory MongoDB (see tests/helpers/testDb.js), never the real MONGO_URL.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ORG_ID = '64e0380b3cc28d087655693b';
process.env.CORS_ORIGIN = 'http://localhost:5173';
