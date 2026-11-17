// Shared helpers for the backend tests: an in-memory MongoDB, seed data for two
// organizations, and logging in through the real POST /users/login route.
//
// Usage in a test file:
//   const { startDb, stopDb, seed, login } = require('./helpers/testDb');
//   beforeAll(async () => { await startDb(); data = await seed(); });
//   afterAll(stopDb);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../../app');
const models = require('../../models/models');

const { orgs, users, clients, events, services } = models;

// plain-text passwords of the seeded users (stored hashed, like the real database)
const PASSWORDS = {
  editor: 'editor-pass',
  viewer: 'viewer-pass'
};

let mongod;

// Start a fresh in-memory MongoDB for this test file and connect Mongoose to it.
async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // build the unique indexes declared in models.js so duplicate-key behavior matches production
  await Promise.all(Object.values(models).map((model) => model.syncIndexes()));
}

async function stopDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

// Seed org A (the ORG_ID this backend serves) and org B, an editor and a viewer in org A,
// and one client, service, and event in each organization. Returns the created documents.
async function seed() {
  const orgAId = new mongoose.Types.ObjectId(process.env.ORG_ID);
  const orgBId = new mongoose.Types.ObjectId();

  await orgs.create([
    { _id: orgAId, name: 'Org A' },
    { _id: orgBId, name: 'Org B' }
  ]);

  // a low bcrypt cost keeps the tests fast; the hash format is the same as production
  await users.create([
    {
      _id: new mongoose.Types.ObjectId(),
      username: 'editor',
      password: bcrypt.hashSync(PASSWORDS.editor, 4),
      role: 'editor',
      org: orgAId
    },
    {
      _id: new mongoose.Types.ObjectId(),
      username: 'viewer',
      password: bcrypt.hashSync(PASSWORDS.viewer, 4),
      role: 'viewer',
      org: orgAId
    }
  ]);

  const [clientA, clientB] = await clients.create([
    {
      firstName: 'Alice',
      lastName: 'Anders',
      phoneNumber: { primary: '7135550001' },
      address: { city: 'Houston', zip: '77001' },
      orgs: [orgAId]
    },
    {
      firstName: 'Bob',
      lastName: 'Barker',
      phoneNumber: { primary: '7135550002' },
      address: { city: 'Austin', zip: '73301' },
      orgs: [orgBId]
    }
  ]);

  const [serviceA, serviceB] = await services.create([
    { name: 'Food Pantry', description: 'Org A service', status: 'Active', org: orgAId },
    { name: 'Tutoring', description: 'Org B service', status: 'Active', org: orgBId }
  ]);

  const [eventA, eventB] = await events.create([
    {
      name: 'Org A Food Drive',
      date: new Date('2026-12-01'),
      services: [serviceA._id],
      attendees: [],
      org: orgAId
    },
    {
      name: 'Org B Study Night',
      date: new Date('2026-12-02'),
      services: [serviceB._id],
      attendees: [],
      org: orgBId
    }
  ]);

  return {
    orgAId,
    orgBId,
    clientA,
    clientB,
    serviceA,
    serviceB,
    eventA,
    eventB
  };
}

// Log in through the real route and return the JWT.
async function login(username) {
  const res = await request(app)
    .post('/users/login')
    .send({ username, password: PASSWORDS[username] });
  if (res.status !== 200) {
    throw new Error(`login as ${username} failed with ${res.status}`);
  }
  return res.body.token;
}

module.exports = { app, models, PASSWORDS, startDb, stopDb, seed, login };
