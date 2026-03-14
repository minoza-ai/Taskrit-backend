import mongoose from 'mongoose';

const fallbackMongoUri = 'mongodb://localhost:27017/taskrit';

function getMongoUri(): string {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (mongoUri) {
    return mongoUri;
  }

  if (process.env.NODE_ENV === 'development') {
    return fallbackMongoUri;
  }

  throw new Error('MONGODB_URI is required when NODE_ENV is not development');
}

export class Database {
  async initialize(): Promise<void> {
    try {
      await mongoose.connect(getMongoUri());
      console.log('Connected to MongoDB successfully');
    } catch (err) {
      console.error('MongoDB connection error:', err);
      throw err;
    }
  }

  async close(): Promise<void> {
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (err) {
      console.error('MongoDB disconnect error:', err);
      throw err;
    }
  }
}

export const database = new Database();

