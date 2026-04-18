import mongoose from 'mongoose';
import { env } from './env.js';

async function cleanupLegacyIndexes() {
  try {
    const collection = mongoose.connection.db.collection('studentprofiles');
    await collection.dropIndex('user_1');
  } catch (error) {
    const ignorableCodes = ['IndexNotFound', 'NamespaceNotFound'];
    if (!ignorableCodes.includes(error.codeName)) {
      throw error;
    }
  }
}

export async function connectToDatabase() {
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  await cleanupLegacyIndexes();
}
