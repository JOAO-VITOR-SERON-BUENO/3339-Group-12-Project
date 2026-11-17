require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('MONGO_URL is missing in environment variables.');
  process.exit(1);
}

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Database connection Success!');
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
})
.catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});