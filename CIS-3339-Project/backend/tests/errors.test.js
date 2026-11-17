// B2 error responses: every error is JSON { error } with no stack trace, plus GET /health.
const request = require('supertest');
const { app, models, startDb, stopDb, seed, login } = require('./helpers/testDb');

let editorToken;

beforeAll(async () => {
  await startDb();
  await seed();
  editorToken = await login('editor');
});

afterAll(stopDb);

// an error body is exactly { error: '<message>' }, nothing that leaks internals
function expectErrorShape(res) {
  expect(res.headers['content-type']).toMatch(/application\/json/);
  expect(Object.keys(res.body)).toEqual(['error']);
  expect(typeof res.body.error).toBe('string');
  expect(res.text).not.toMatch(/stack|at .*\.js:\d+/);
}

describe('400 responses', () => {
  test('invalid search parameter', async () => {
    const res = await request(app)
      .get('/clients/search?searchBy=bogus')
      .set('Authorization', `Bearer ${editorToken}`);

    expect(res.status).toBe(400);
    expectErrorShape(res);
  });

  test('malformed JSON body', async () => {
    const res = await request(app)
      .post('/clients')
      .set('Authorization', `Bearer ${editorToken}`)
      .set('Content-Type', 'application/json')
      .send('{"firstName": ');

    expect(res.status).toBe(400);
    expectErrorShape(res);
  });

  test('missing required fields', async () => {
    const res = await request(app)
      .post('/clients')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ firstName: 'OnlyFirst' });

    expect(res.status).toBe(400);
    expectErrorShape(res);
  });
});

describe('404 responses', () => {
  test('unknown route', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
    expectErrorShape(res);
  });

  test('invalid id', async () => {
    const res = await request(app)
      .get('/events/id/not-an-id')
      .set('Authorization', `Bearer ${editorToken}`);

    expect(res.status).toBe(404);
    expectErrorShape(res);
  });
});

describe('500 responses', () => {
  test('unexpected errors return a generic message without the stack', async () => {
    jest
      .spyOn(models.clients, 'find')
      .mockImplementation(() => {
        throw new Error('secret database detail');
      });

    const res = await request(app)
      .get('/clients')
      .set('Authorization', `Bearer ${editorToken}`);

    expect(res.status).toBe(500);
    expectErrorShape(res);
    expect(res.body.error).toBe('Internal server error');
    expect(res.text).not.toMatch(/secret database detail/);
  });
});

describe('GET /health', () => {
  test('works without a token and reports the database connection', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'connected' });
  });
});
