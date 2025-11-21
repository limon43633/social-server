import { MongoClient } from 'mongodb';

let client;
let db;

export const connectToDatabase = async () => {
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.DB_NAME);
    console.log('✅ Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  return db;
};

export const closeDatabase = async () => {
  if (client) {
    await client.close();
  }
};