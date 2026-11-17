// Small helpers shared by the route files.
const mongoose = require('mongoose');

// An error that carries the HTTP status code the error handler should respond with.
class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Express 4 does not catch rejected promises; forward them to the error handler.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Throw a 404 unless `id` is a valid ObjectId (an invalid id can never match a record).
function assertObjectId(id, label) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, `${label} not found`);
  }
}

// Copy a request body for create/update, dropping fields the client must never set
// (ids, the organization, Mongo update operators such as $set or $push).
function cleanBody(body, protectedFields = []) {
  const blocked = new Set(['_id', '__v', ...protectedFields]);
  const clean = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (!blocked.has(key) && !key.startsWith('$')) {
      clean[key] = value;
    }
  }
  return clean;
}

// Escape user input before putting it in a RegExp, so search text is matched literally.
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { HttpError, asyncHandler, assertObjectId, cleanBody, escapeRegex };
