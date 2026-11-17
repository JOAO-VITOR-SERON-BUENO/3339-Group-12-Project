// Runs in every test file (jest "setupFilesAfterEnv").
// The error handler in app.js logs every error it handles, including the expected
// 401/403/404s the tests trigger on purpose; mute it so the test report stays readable.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});
