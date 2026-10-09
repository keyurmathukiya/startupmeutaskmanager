require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  if (!process.env.JWT_SECRET) {
    console.error('Missing JWT_SECRET. Set it in server/.env');
    process.exit(1);
  }

  let mongoUri = process.env.MONGO_URI;
  let mongod;

  if (!mongoUri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
    console.log('No MONGO_URI set, using temporary in-memory MongoDB for local development.');
  }

  try {
    await connectDB(mongoUri);
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Database connection failed:', err.message);
    if (mongod) {
      await mongod.stop();
    }
    process.exit(1);
  }
}

startServer();
