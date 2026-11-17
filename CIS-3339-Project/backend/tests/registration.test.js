// B1 registration rules for PUT /events/register and PUT /events/deregister.
const request = require('supertest');
const { app, models, startDb, stopDb, seed, login } = require('./helpers/testDb');

let data;
let editorToken;
let viewerToken;

beforeAll(async () => {
  await startDb();
  data = await seed();
  editorToken = await login('editor');
  viewerToken = await login('viewer');
});

afterAll(stopDb);

// clear attendees so each test starts from an empty registration list
beforeEach(async () => {
  await models.events.updateMany({}, { $set: { attendees: [] } });
});

const register = (eventId, clientId, token = editorToken) =>
  request(app)
    .put(`/events/register?event=${eventId}&client=${clientId}`)
    .set('Authorization', `Bearer ${token}`);

const deregister = (eventId, clientId, token = editorToken) =>
  request(app)
    .put(`/events/deregister?event=${eventId}&client=${clientId}`)
    .set('Authorization', `Bearer ${token}`);

const attendeesOf = async (eventId) =>
  (await models.events.findById(eventId).lean()).attendees.map(String);

test('registering twice leaves exactly one attendee', async () => {
  const first = await register(data.eventA._id, data.clientA._id);
  const second = await register(data.eventA._id, data.clientA._id);

  expect(first.status).toBe(201);
  expect(second.status).toBe(200);
  expect(second.body).toEqual({ message: 'Already registered' });
  expect(await attendeesOf(data.eventA._id)).toEqual([String(data.clientA._id)]);
});

test('deregistering a registered client removes them', async () => {
  await register(data.eventA._id, data.clientA._id);
  const res = await deregister(data.eventA._id, data.clientA._id);

  expect(res.status).toBe(200);
  expect(await attendeesOf(data.eventA._id)).toEqual([]);
});

test('deregistering a client who is not registered -> 200 { message: "Not registered" }', async () => {
  const res = await deregister(data.eventA._id, data.clientA._id);

  expect(res.status).toBe(200);
  expect(res.body).toEqual({ message: 'Not registered' });
});

test('an org-A client can not be registered for an org-B event -> 404', async () => {
  const res = await register(data.eventB._id, data.clientA._id);

  expect(res.status).toBe(404);
  expect(res.body).toHaveProperty('error');
  expect(await attendeesOf(data.eventB._id)).toEqual([]);
});

test('an org-B client can not be registered for an org-A event -> 404', async () => {
  const res = await register(data.eventA._id, data.clientB._id);

  expect(res.status).toBe(404);
  expect(await attendeesOf(data.eventA._id)).toEqual([]);
});

test('a viewer can not register clients -> 403', async () => {
  const res = await register(data.eventA._id, data.clientA._id, viewerToken);

  expect(res.status).toBe(403);
  expect(await attendeesOf(data.eventA._id)).toEqual([]);
});
