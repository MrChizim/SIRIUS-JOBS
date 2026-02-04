/**
 * Reset Analytics and Ratings Script
 * Resets all analytics, ratings, reviews to 0 for fresh start
 * Run: npx tsx scripts/reset-analytics-and-ratings.ts
 */

import mongoose from 'mongoose';
import 'dotenv/config';
import { Analytics } from '../src/models/Analytics.model';
import { ProfessionalProfile } from '../src/models/ProfessionalProfile.model';
import { Review } from '../src/models/Review.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sirius_jobs';

async function resetAnalyticsAndRatings() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔄 Resetting analytics and ratings...\n');

    // Reset all analytics to 0
    const analyticsResult = await Analytics.updateMany(
      {},
      {
        $set: {
          'metrics.profileViews': 0,
          'metrics.jobApplications': 0,
          'metrics.hiresReceived': 0,
          'metrics.jobsPosted': 0,
          'metrics.hiresMade': 0,
          'metrics.consultationUnlocks': 0,
          'metrics.totalEarnings': 0,
          'metrics.averageRating': 0,
          'metrics.imageClicks': {},
          'metrics.socialLinkClicks': {},
          'metrics.newsletterExposures': 0,
          lastUpdated: new Date(),
        },
      }
    );
    console.log(`✅ Reset ${analyticsResult.modifiedCount} analytics records`);

    // Reset professional profiles ratings and reviews
    const professionalResult = await ProfessionalProfile.updateMany(
      {},
      {
        $set: {
          rating: 0,
          totalReviews: 0,
          totalEarnings: 0,
        },
      }
    );
    console.log(`✅ Reset ${professionalResult.modifiedCount} professional profiles`);

    // Delete all reviews
    const reviewResult = await Review.deleteMany({});
    console.log(`✅ Deleted ${reviewResult.deletedCount} reviews`);

    console.log('\n✅ All analytics, ratings, and reviews have been reset!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

resetAnalyticsAndRatings();
