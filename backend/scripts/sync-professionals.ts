import { prisma } from '../src/lib/prisma.js';
import mongoose from 'mongoose';
import { Professional } from '../src/models/Professional';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sirius_consultations';

async function syncProfessionals() {
  try {
    console.log('Connecting to databases...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB!');

    // Fetch PostgreSQL users
    const postgresUsers = await prisma.user.findMany({
      where: {
        OR: [
          { roles: { has: 'DOCTOR' } },
          { roles: { has: 'LAWYER' } }
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true
      }
    });

    console.log(`\nFound ${postgresUsers.length} professional users in PostgreSQL:`);
    postgresUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.roles.join(', ')})`);
    });

    // Update MongoDB professionals with correct user IDs
    console.log('\nUpdating MongoDB professionals...');

    for (const user of postgresUsers) {
      const profession = user.roles.includes('DOCTOR') ? 'DOCTOR' : 'LAWYER';

      // Find the MongoDB professional by email
      const mongoProfessional = await Professional.findOne({ email: user.email });

      if (mongoProfessional) {
        // Update with correct user ID
        mongoProfessional.userId = user.id;
        mongoProfessional.firstName = user.firstName;
        mongoProfessional.lastName = user.lastName;
        await mongoProfessional.save();
        console.log(`  ✓ Updated ${user.email} with userId: ${user.id}`);
      } else {
        // Create a new professional in MongoDB
        await Professional.create({
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profession,
          specialization: profession === 'DOCTOR' ? 'General Medicine' : 'General Law',
          licenseNumber: profession === 'DOCTOR' ? 'MDCN-TEST' : 'NBA-TEST',
          yearsOfExperience: 5,
          bio: `Test ${profession.toLowerCase()} account for consultation platform testing.`,
          isVerified: true,
          isActive: true,
          averageRating: 4.5,
          totalReviews: 0,
          totalSessions: 0,
          totalEarnings: 0
        });
        console.log(`  ✓ Created new professional ${user.email}`);
      }
    }

    console.log('\n✅ Sync complete!');
    console.log('\nYou can now log in with:');
    console.log('- doctor@test.com / Test1234');
    console.log('- lawyer@test.com / Test1234');
    console.log('\nSelect "Professional" on the login page.');

  } catch (error) {
    console.error('Error syncing professionals:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await mongoose.disconnect();
    console.log('\nDisconnected from databases');
    process.exit(0);
  }
}

syncProfessionals();
