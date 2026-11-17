// This is the main file for the backend

// import functionalities
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');

require('dotenv').config();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim());

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false); 
    }
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

mongoose.set('strictQuery', false);

app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    db: dbConnected ? 'connected' : 'disconnected'
  });
});

app.use('/clients', require('./routes/clients'));
app.use('/events', require('./routes/events'));
app.use('/org', require('./routes/org'));
app.use('/services', require('./routes/services'));
app.use('/users', require('./routes/users'));

// 3. JSON 404 for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(function (err, req, res, next) {
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON body';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate value';
  } else if (!err.statusCode) {
    statusCode = 500;
    message = 'Internal server error';
  }

  res.status(statusCode).json({ error: message });
});

module.exports = app;