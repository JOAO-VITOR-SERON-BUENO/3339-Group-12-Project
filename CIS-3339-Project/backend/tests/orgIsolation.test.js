// Organization isolation: a user in org A can't read, update, or delete org B's
// clients, events, or services. Every attempt is a 404 and the org-B record is unchanged.
const request = require('supertest');
const { app, models, startDb, stopDb, seed, login } = require('./helpers/testDb');

let data;
let editorToken;

beforeAll(async () => {
  await startDb();
  data = await seed();
  editorToken = await login('editor');
});

afterAll(stopDb);

const resources = [
  {
    name: 'client',
    path: '/clients',
    model: () => models.clients,
    record: () => data.clientB,
    update: { firstName: 'Hacked' }
  },
  {
    name: 'event',
    path: '/events',
    model: () => models.events,
    record: () => data.eventB,
    update: { name: 'Hacked' }
  },
  {
    name: 'service',
    path: '/services',
    model: () => models.services,
    record: () => data.serviceB,
    update: { name: 'Hacked' }
  }
];

describe.each(resources)('org-B $name', ({ path, model, record, update }) => {
  let before;

  beforeAll(async () => {
    before = await model().findById(record()._id).lean();
  });

  // the org-B record must look exactly as it did before each request
  afterEach(async () => {
    const after = await model().findById(record()._id).lean();
    expect(after).toEqual(before);
  });

  test('GET by id -> 404', async () => {
    const res = await request(app)
      .get(`${path}/id/${record()._id}`)
      .set('Authorization', `Bearer ${editorToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('is not in the list', async () => {
    const res = await request(app)
      .get(path)
      .set('Authorization', `Bearer ${editorToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.map((item) => item._id);
    expect(ids).not.toContain(String(record()._id));
  });

  test('PUT -> 404', async () => {
    const res = await request(app)
      .put(`${path}/update/${record()._id}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send(update);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('DELETE -> 404', async () => {
    const res = await request(app)
      .delete(`${path}/${record()._id}`)
      .set('Authorization', `Bearer ${editorToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('the organization always comes from the JWT', () => {
  test('a client created with orgs set to org B is saved in org A', async () => {
    const res = await request(app)
      .post('/clients')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        firstName: 'Dana',
        lastName: 'Diaz',
        phoneNumber: { primary: '7135550004' },
        address: { city: 'Houston' },
        orgs: [String(data.orgBId)]
      });

    expect(res.status).toBe(201);
    const saved = await models.clients.findOne({ firstName: 'Dana' }).lean();
    expect(saved.orgs.map(String)).toEqual([String(data.orgAId)]);
  });
});
