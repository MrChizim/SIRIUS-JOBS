import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sirius_consultations';

export async function connectMongo() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[mongo] Connected to MongoDB successfully');
  } catch (error) {
    console.error('[mongo] Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectMongo() {
  try {
    await mongoose.disconnect();
    console.log('[mongo] Disconnected from MongoDB');
  } catch (error) {
    console.error('[mongo] Error disconnecting from MongoDB:', error);
  }
}
