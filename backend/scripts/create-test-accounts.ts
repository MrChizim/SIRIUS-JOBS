/**
 * Create Test Accounts Script
 * Run: npx tsx scripts/create-test-accounts.ts
 */

import mongoose from 'mongoose';
import 'dotenv/config';
import { User } from '../src/models/User.model';
import { WorkerProfile } from '../src/models/WorkerProfile.model';
import { EmployerProfile } from '../src/models/EmployerProfile.model';
import { ProfessionalProfile } from '../src/models/ProfessionalProfile.model';
import { MerchantProfile } from '../src/models/MerchantProfile.model';
import { Analytics } from '../src/models/Analytics.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sirius_jobs';

async function createTestAccounts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test accounts data
    const testAccounts = [
      // Workers
      {
        name: 'Tunde Adeyemi',
        email: 'worker1@test.com',
        password: 'Test123!@#',
        accountType: 'worker' as const,
        profile: {
          skills: ['Plumbing', 'Electrical', 'HVAC'],
          experience: 'Over 8 years of experience in residential and commercial plumbing and electrical work. Certified and licensed.',
          location: 'Lagos',
          bio: 'Reliable and professional artisan with expertise in plumbing and electrical installations.',
          subscription: {
            status: 'active' as const,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            amount: 1000,
          },
          governmentId: {
            type: 'nin' as const,
            documentUrl: 'https://example.com/id1.jpg',
            verifiedAt: new Date(),
          },
        },
      },
      {
        name: 'Chioma Okafor',
        email: 'worker2@test.com',
        password: 'Test123!@#',
        accountType: 'worker' as const,
        profile: {
          skills: ['Carpentry', 'Furniture', 'Woodwork'],
          experience: '5 years specializing in custom furniture and interior woodwork.',
          location: 'Abuja',
          bio: 'Creative carpenter with a passion for custom furniture design.',
          subscription: {
            status: 'active' as const,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            amount: 1000,
          },
          governmentId: {
            type: 'voters_card' as const,
            documentUrl: 'https://example.com/id2.jpg',
            verifiedAt: new Date(),
          },
        },
      },
      {
        name: 'Ibrahim Mohammed',
        email: 'worker3@test.com',
        password: 'Test123!@#',
        accountType: 'worker' as const,
        profile: {
          skills: ['Painting', 'Decoration', 'Interior Design'],
          experience: '10 years of professional painting and interior decoration experience.',
          location: 'Port Harcourt',
          bio: 'Expert painter with attention to detail and quality finishes.',
          subscription: {
            status: 'expired' as const,
            startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            amount: 1000,
          },
        },
      },

      // Employers
      {
        name: 'Ada Technologies Ltd',
        email: 'employer1@test.com',
        password: 'Test123!@#',
        accountType: 'employer' as const,
        profile: {
          companyName: 'Ada Technologies Ltd',
          industry: 'Technology',
          companySize: '50-200',
          location: 'Lagos',
          website: 'https://adatech.ng',
          description: 'Leading tech company in Nigeria looking for skilled workers.',
        },
      },
      {
        name: 'BuildRight Construction',
        email: 'employer2@test.com',
        password: 'Test123!@#',
        accountType: 'employer' as const,
        profile: {
          companyName: 'BuildRight Construction',
          industry: 'Construction',
          companySize: '200-500',
          location: 'Abuja',
          description: 'Large construction firm specializing in residential and commercial projects.',
        },
      },

      // Professionals
      {
        name: 'Dr. Amaka Nwankwo',
        email: 'doctor1@test.com',
        password: 'Test123!@#',
        accountType: 'professional' as const,
        profile: {
          professionalType: 'doctor' as const,
          licenseNumber: 'MDC-12345',
          specialization: 'General Medicine',
          yearsOfExperience: 12,
          bio: 'Experienced general practitioner with over 12 years of practice.',
          consultationFee: 3000,
          isVerified: true,
        },
      },
      {
        name: 'Barr. Emeka Okonkwo',
        email: 'lawyer1@test.com',
        password: 'Test123!@#',
        accountType: 'professional' as const,
        profile: {
          professionalType: 'lawyer' as const,
          licenseNumber: 'NBA-67890',
          specialization: 'Corporate Law',
          yearsOfExperience: 15,
          bio: 'Senior lawyer specializing in corporate and business law.',
          consultationFee: 3000,
          isVerified: true,
        },
      },

      // Merchants
      {
        name: 'FreshMart Stores',
        email: 'merchant1@test.com',
        password: 'Test123!@#',
        accountType: 'merchant' as const,
        profile: {
          businessName: 'FreshMart Stores',
          description: 'Your one-stop shop for fresh groceries and household items.',
          category: 'Groceries',
          location: 'Lagos',
          whatsapp: '+2348012345678',
          email: 'freshmart@example.com',
          subscription: {
            package: '6months' as const,
            status: 'active' as const,
            startDate: new Date(),
            endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
            amount: 19000,
            maxImages: 20,
          },
        },
      },
      {
        name: 'TechHub Electronics',
        email: 'merchant2@test.com',
        password: 'Test123!@#',
        accountType: 'merchant' as const,
        profile: {
          businessName: 'TechHub Electronics',
          description: 'Premium electronics and gadgets at affordable prices.',
          category: 'Electronics',
          location: 'Abuja',
          whatsapp: '+2348087654321',
          instagram: '@techhub_ng',
          subscription: {
            package: '3months' as const,
            status: 'active' as const,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
            amount: 10000,
            maxImages: 20,
          },
        },
      },
    ];

    console.log('\n🔄 Creating test accounts...\n');

    for (const account of testAccounts) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: account.email });
        if (existingUser) {
          console.log(`⚠️  User ${account.email} already exists, skipping...`);
          continue;
        }

        // Create user
        const user = await User.create({
          name: account.name,
          email: account.email,
          password: account.password,
          accountType: account.accountType,
          isVerified: true,
        });

        console.log(`✅ Created ${account.accountType}: ${account.name} (${account.email})`);

        // Create profile based on account type
        if (account.accountType === 'worker' && account.profile) {
          await WorkerProfile.create({
            userId: user._id.toString(),
            ...account.profile,
          });

          // Create analytics
          await Analytics.create({
            userId: user._id.toString(),
            accountType: 'worker',
            metrics: {
              profileViews: 0,
              jobApplications: 0,
              hiresReceived: 0,
            },
          });
        } else if (account.accountType === 'employer' && account.profile) {
          await EmployerProfile.create({
            userId: user._id.toString(),
            ...account.profile,
          });

          await Analytics.create({
            userId: user._id.toString(),
            accountType: 'employer',
            metrics: {
              jobsPosted: 0,
              hiresMade: 0,
            },
          });
        } else if (account.accountType === 'professional' && account.profile) {
          await ProfessionalProfile.create({
            userId: user._id.toString(),
            ...account.profile,
            rating: 0,
            totalReviews: 0,
            totalEarnings: 0,
          });

          await Analytics.create({
            userId: user._id.toString(),
            accountType: 'professional',
            metrics: {
              profileViews: 0,
              consultationUnlocks: 0,
              totalEarnings: 0,
            },
          });
        } else if (account.accountType === 'merchant' && account.profile) {
          await MerchantProfile.create({
            userId: user._id.toString(),
            ...account.profile,
          });

          await Analytics.create({
            userId: user._id.toString(),
            accountType: 'merchant',
            metrics: {
              profileViews: 0,
              imageClicks: new Map(),
              socialLinkClicks: new Map(),
            },
          });
        }
      } catch (error: any) {
        console.error(`❌ Error creating ${account.email}:`, error.message);
      }
    }

    console.log('\n✅ Test accounts created successfully!\n');
    console.log('📝 Login credentials (all use password: Test123!@#):');
    console.log('   Workers:');
    console.log('   - worker1@test.com (Active subscription)');
    console.log('   - worker2@test.com (Active subscription)');
    console.log('   - worker3@test.com (Expired subscription)');
    console.log('   Employers:');
    console.log('   - employer1@test.com');
    console.log('   - employer2@test.com');
    console.log('   Professionals:');
    console.log('   - doctor1@test.com');
    console.log('   - lawyer1@test.com');
    console.log('   Merchants:');
    console.log('   - merchant1@test.com');
    console.log('   - merchant2@test.com\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestAccounts();
