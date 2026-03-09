import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskrit';

export class Database {
  async initialize(): Promise<void> {
    try {
      await mongoose.connect(mongoUri);
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

