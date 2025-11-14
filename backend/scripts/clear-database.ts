/**
 * Clear all test data from database
 */
import mongoose from 'mongoose';
import { User } from '../src/models/User.model';
import { WorkerProfile } from '../src/models/WorkerProfile.model';
import { EmployerProfile } from '../src/models/EmployerProfile.model';
import { ProfessionalProfile } from '../src/models/ProfessionalProfile.model';
import { MerchantProfile } from '../src/models/MerchantProfile.model';
import { Job } from '../src/models/Job.model';
import { JobApplication } from '../src/models/JobApplication.model';
import { ConsultationSession } from '../src/models/ConsultationSession.model';
import { Payment } from '../src/models/Payment.model';
import { Review } from '../src/models/Review.model';
import { Analytics } from '../src/models/Analytics.model';
import { AlertSubscription } from '../src/models/AlertSubscription.model';
import * as dotenv from 'dotenv';

dotenv.config();

async function clearDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sirius';
    await mongoose.connect(mongoUri);

    console.log('✅ Connected to MongoDB');
    console.log('🗑️  Clearing all collections...\n');

    // Clear all collections
    const results = await Promise.all([
      User.deleteMany({}),
      WorkerProfile.deleteMany({}),
      EmployerProfile.deleteMany({}),
      ProfessionalProfile.deleteMany({}),
      MerchantProfile.deleteMany({}),
      Job.deleteMany({}),
      JobApplication.deleteMany({}),
      ConsultationSession.deleteMany({}),
      Payment.deleteMany({}),
      Review.deleteMany({}),
      Analytics.deleteMany({}),
      AlertSubscription.deleteMany({}),
    ]);

    console.log(`✅ Deleted ${results[0].deletedCount} users`);
    console.log(`✅ Deleted ${results[1].deletedCount} worker profiles`);
    console.log(`✅ Deleted ${results[2].deletedCount} employer profiles`);
    console.log(`✅ Deleted ${results[3].deletedCount} professional profiles`);
    console.log(`✅ Deleted ${results[4].deletedCount} merchant profiles`);
    console.log(`✅ Deleted ${results[5].deletedCount} jobs`);
    console.log(`✅ Deleted ${results[6].deletedCount} job applications`);
    console.log(`✅ Deleted ${results[7].deletedCount} consultation sessions`);
    console.log(`✅ Deleted ${results[8].deletedCount} payments`);
    console.log(`✅ Deleted ${results[9].deletedCount} reviews`);
    console.log(`✅ Deleted ${results[10].deletedCount} analytics records`);
    console.log(`✅ Deleted ${results[11].deletedCount} alert subscriptions`);

    console.log('\n✅ Database cleared successfully!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
