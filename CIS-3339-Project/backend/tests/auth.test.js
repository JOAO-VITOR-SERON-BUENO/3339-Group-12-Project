// Login, authentication (401), and role (403) checks.
const request = require('supertest');
const { app, PASSWORDS, startDb, stopDb, seed, login } = require('./helpers/testDb');

const newClient = {
  firstName: 'Carla',
  lastName: 'Cruz',
  phoneNumber: { primary: '7135550003' },
  address: { city: 'Houston' }
};

let editorToken;
let viewerToken;

beforeAll(async () => {
  await startDb();
  await seed();
  editorToken = await login('editor');
  viewerToken = await login('viewer');
});

afterAll(stopDb);

describe('POST /users/login', () => {
  test('valid credentials return a JWT', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ username: 'editor', password: PASSWORDS.editor });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  test('wrong password and unknown user both return 401 with the identical message', async () => {
    const wrongPassword = await request(app)
      .post('/users/login')
      .send({ username: 'editor', password: 'not-the-password' });
    const unknownUser = await request(app)
      .post('/users/login')
      .send({ username: 'nobody', password: 'whatever' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body).toEqual({ error: 'Invalid username or password' });
    expect(unknownUser.body).toEqual(wrongPassword.body);
  });
});

describe('authentication and roles on POST /clients', () => {
  test('no token -> 401', async () => {
    const res = await request(app).post('/clients').send(newClient);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('invalid token -> 401', async () => {
    const res = await request(app)
      .post('/clients')
      .set('Authorization', 'Bearer not-a-real-token')
      .send(newClient);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('viewer -> 403 and nothing is created', async () => {
    const res = await request(app)
      .post('/clients')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send(newClient);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');

    const list = await request(app)
      .get('/clients')
      .set('Authorization', `Bearer ${editorToken}`);
    expect(list.body.some((c) => c.firstName === 'Carla')).toBe(false);
  });

  test('editor -> 201 on the same route', async () => {
    const res = await request(app)
      .post('/clients')
      .set('Authorization', `Bearer ${editorToken}`)
      .send(newClient);

    expect(res.status).toBe(201);
  });

  test('viewer can still read', async () => {
    const res = await request(app)
      .get('/clients')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
