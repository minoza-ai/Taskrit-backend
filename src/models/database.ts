import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskrit';

export class Database {
  async initialize(): Promise<void> {
    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB successfully');
      
      // Clear and rebuild indexes
      try {
        const db = mongoose.connection.db;
        if (db) {
          // Clear users collection to remove problematic data
          try {
            await db.collection('users').deleteMany({});
            console.log('Cleared users collection');
          } catch (err) {
            console.error('Error clearing users:', err);
          }
          
          // Drop all indexes on users collection
          try {
            await db.collection('users').dropIndexes();
            console.log('Dropped all indexes on users collection');
          } catch (err: any) {
            if (err.code !== 27) { // "index not found" error
              console.error('Error dropping indexes:', err.message);
            }
          }
          
          // Clear nonces collection
          try {
            await db.collection('nonces').deleteMany({});
            console.log('Cleared nonces collection');
          } catch (err) {
            console.error('Error clearing nonces:', err);
          }
        }
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
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

