import mongoose from 'mongoose';
import { Professional } from '../src/models/Professional';
import { ConsultationSession } from '../src/models/ConsultationSession';
import * as crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sirius_consultations';

const fakeProfessionals = [
  {
    userId: 'user_001',
    email: 'dr.adewale@example.com',
    firstName: 'Adewale',
    lastName: 'Okonkwo',
    profession: 'DOCTOR',
    specialization: 'General Medicine',
    licenseNumber: 'MDCN-123456',
    yearsOfExperience: 8,
    bio: 'Experienced general practitioner with a passion for preventive healthcare. Specialized in treating common illnesses, chronic disease management, and health counseling.',
    isVerified: true,
    isActive: true,
    averageRating: 4.8,
    totalReviews: 24,
    totalSessions: 45,
    totalEarnings: 11250000 // ₦112,500
  },
  {
    userId: 'user_002',
    email: 'dr.chioma@example.com',
    firstName: 'Chioma',
    lastName: 'Nwosu',
    profession: 'DOCTOR',
    specialization: 'Pediatrics',
    licenseNumber: 'MDCN-234567',
    yearsOfExperience: 12,
    bio: 'Board-certified pediatrician dedicated to child health and development. Expert in infant care, childhood diseases, vaccinations, and developmental assessments.',
    isVerified: true,
    isActive: true,
    averageRating: 4.9,
    totalReviews: 38,
    totalSessions: 62,
    totalEarnings: 15500000 // ₦155,000
  },
  {
    userId: 'user_003',
    email: 'dr.emeka@example.com',
    firstName: 'Emeka',
    lastName: 'Afolabi',
    profession: 'DOCTOR',
    specialization: 'Dermatology',
    licenseNumber: 'MDCN-345678',
    yearsOfExperience: 6,
    bio: 'Dermatologist specializing in skin conditions, acne treatment, and cosmetic procedures. Providing evidence-based solutions for healthy, glowing skin.',
    isVerified: true,
    isActive: true,
    averageRating: 4.7,
    totalReviews: 19,
    totalSessions: 31,
    totalEarnings: 7750000 // ₦77,500
  },
  {
    userId: 'user_004',
    email: 'barrister.ngozi@example.com',
    firstName: 'Ngozi',
    lastName: 'Eze',
    profession: 'LAWYER',
    specialization: 'Corporate Law',
    licenseNumber: 'NBA-456789',
    yearsOfExperience: 15,
    bio: 'Seasoned corporate lawyer with extensive experience in business formation, contracts, and commercial transactions. Helping businesses navigate legal complexities.',
    isVerified: true,
    isActive: true,
    averageRating: 4.9,
    totalReviews: 42,
    totalSessions: 78,
    totalEarnings: 19500000 // ₦195,000
  },
  {
    userId: 'user_005',
    email: 'barrister.tunde@example.com',
    firstName: 'Tunde',
    lastName: 'Bello',
    profession: 'LAWYER',
    specialization: 'Family Law',
    licenseNumber: 'NBA-567890',
    yearsOfExperience: 10,
    bio: 'Compassionate family lawyer handling divorce, child custody, adoption, and estate matters. Dedicated to protecting family rights and achieving amicable resolutions.',
    isVerified: true,
    isActive: true,
    averageRating: 4.6,
    totalReviews: 28,
    totalSessions: 54,
    totalEarnings: 13500000 // ₦135,000
  },
  {
    userId: 'user_006',
    email: 'dr.aisha@example.com',
    firstName: 'Aisha',
    lastName: 'Mohammed',
    profession: 'DOCTOR',
    specialization: 'Mental Health',
    licenseNumber: 'MDCN-678901',
    yearsOfExperience: 9,
    bio: 'Clinical psychologist providing mental health support for anxiety, depression, stress management, and relationship issues. Creating a safe space for healing.',
    isVerified: true,
    isActive: true,
    averageRating: 5.0,
    totalReviews: 31,
    totalSessions: 56,
    totalEarnings: 14000000 // ₦140,000
  },
  {
    userId: 'user_007',
    email: 'barrister.oluwaseun@example.com',
    firstName: 'Oluwaseun',
    lastName: 'Adeyemi',
    profession: 'LAWYER',
    specialization: 'Criminal Defense',
    licenseNumber: 'NBA-789012',
    yearsOfExperience: 13,
    bio: 'Experienced criminal defense attorney committed to protecting the rights of the accused. Strong track record in court litigation and plea negotiations.',
    isVerified: true,
    isActive: true,
    averageRating: 4.8,
    totalReviews: 35,
    totalSessions: 67,
    totalEarnings: 16750000 // ₦167,500
  },
  {
    userId: 'user_008',
    email: 'dr.ifeanyi@example.com',
    firstName: 'Ifeanyi',
    lastName: 'Okoro',
    profession: 'DOCTOR',
    specialization: 'Internal Medicine',
    licenseNumber: 'MDCN-890123',
    yearsOfExperience: 7,
    bio: 'Internal medicine specialist focused on adult health, chronic diseases like diabetes and hypertension, and preventive care strategies.',
    isVerified: true,
    isActive: true,
    averageRating: 4.7,
    totalReviews: 22,
    totalSessions: 39,
    totalEarnings: 9750000 // ₦97,500
  },
  {
    userId: 'user_009',
    email: 'barrister.blessing@example.com',
    firstName: 'Blessing',
    lastName: 'Udoh',
    profession: 'LAWYER',
    specialization: 'Real Estate Law',
    licenseNumber: 'NBA-901234',
    yearsOfExperience: 11,
    bio: 'Real estate attorney specializing in property transactions, land disputes, title verification, and tenancy agreements. Ensuring smooth property dealings.',
    isVerified: true,
    isActive: true,
    averageRating: 4.8,
    totalReviews: 26,
    totalSessions: 48,
    totalEarnings: 12000000 // ₦120,000
  },
  {
    userId: 'user_010',
    email: 'dr.kunle@example.com',
    firstName: 'Kunle',
    lastName: 'Fashola',
    profession: 'DOCTOR',
    specialization: 'Cardiology',
    licenseNumber: 'MDCN-012345',
    yearsOfExperience: 14,
    bio: 'Cardiologist with expertise in heart disease prevention, diagnosis, and treatment. Committed to improving cardiovascular health through patient education.',
    isVerified: true,
    isActive: true,
    averageRating: 4.9,
    totalReviews: 40,
    totalSessions: 71,
    totalEarnings: 17750000 // ₦177,500
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    // Clear existing data
    console.log('Clearing existing data...');
    await Professional.deleteMany({});
    await ConsultationSession.deleteMany({});
    console.log('Existing data cleared!');

    // Insert professionals
    console.log('Creating fake professionals...');
    const createdProfessionals = await Professional.insertMany(fakeProfessionals);
    console.log(`Created ${createdProfessionals.length} professionals!`);

    // Create some active and completed sessions for the first 3 professionals
    console.log('Creating consultation sessions...');
    const sessions = [];

    // Professional 1: 2 active sessions, 1 completed
    sessions.push({
      professionalId: createdProfessionals[0]._id,
      clientAnonymousId: 'ANON-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      clientSessionToken: 'session_' + crypto.randomBytes(16).toString('hex'),
      paymentReference: 'PSREF_' + crypto.randomBytes(8).toString('hex'),
      amountPaid: 300000, // ₦3,000
      professionalEarning: 250000, // ₦2,500
      platformFee: 50000, // ₦500
      status: 'active',
      startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      endsAt: new Date(Date.now() + 19 * 60 * 60 * 1000), // 19 hours from now
      endedAt: null,
      endedBy: null,
      hasUnreadMessages: true,
      lastMessageAt: new Date(Date.now() - 30 * 60 * 1000) // 30 mins ago
    });

    sessions.push({
      professionalId: createdProfessionals[0]._id,
      clientAnonymousId: 'ANON-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      clientSessionToken: 'session_' + crypto.randomBytes(16).toString('hex'),
      paymentReference: 'PSREF_' + crypto.randomBytes(8).toString('hex'),
      amountPaid: 300000,
      professionalEarning: 250000,
      platformFee: 50000,
      status: 'active',
      startedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      endsAt: new Date(Date.now() + 16 * 60 * 60 * 1000), // 16 hours from now
      endedAt: null,
      endedBy: null,
      hasUnreadMessages: false,
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    });

    sessions.push({
      professionalId: createdProfessionals[0]._id,
      clientAnonymousId: 'ANON-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      clientSessionToken: 'session_' + crypto.randomBytes(16).toString('hex'),
      paymentReference: 'PSREF_' + crypto.randomBytes(8).toString('hex'),
      amountPaid: 300000,
      professionalEarning: 250000,
      platformFee: 50000,
      status: 'ended',
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      endedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endedBy: 'client',
      hasUnreadMessages: false,
      lastMessageAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    });

    // Professional 2: 1 active session, 2 completed
    sessions.push({
      professionalId: createdProfessionals[1]._id,
      clientAnonymousId: 'ANON-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      clientSessionToken: 'session_' + crypto.randomBytes(16).toString('hex'),
      paymentReference: 'PSREF_' + crypto.randomBytes(8).toString('hex'),
      amountPaid: 300000,
      professionalEarning: 250000,
      platformFee: 50000,
      status: 'active',
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      endsAt: new Date(Date.now() + 21 * 60 * 60 * 1000), // 21 hours from now
      endedAt: null,
      endedBy: null,
      hasUnreadMessages: true,
      lastMessageAt: new Date(Date.now() - 15 * 60 * 1000) // 15 mins ago
    });

    sessions.push({
      professionalId: createdProfessionals[1]._id,
      clientAnonymousId: 'ANON-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      clientSessionToken: 'session_' + crypto.randomBytes(16).toString('hex'),
      paymentReference: 'PSREF_' + crypto.randomBytes(8).toString('hex'),
      amountPaid: 300000,
      professionalEarning: 250000,
      platformFee: 50000,
      status: 'ended',
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      endsAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      endedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      endedBy: 'auto',
      hasUnreadMessages: false,
      lastMessageAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    });

    sessions.push({
      professionalId: createdProfessionals[1]._id,
      clientAnonymousId: 'ANON-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      clientSessionToken: 'session_' + crypto.randomBytes(16).toString('hex'),
      paymentReference: 'PSREF_' + crypto.randomBytes(8).toString('hex'),
      amountPaid: 300000,
      professionalEarning: 250000,
      platformFee: 50000,
      status: 'ended',
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endsAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      endedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      endedBy: 'professional',
      hasUnreadMessages: false,
      lastMessageAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    });

    // Professional 3: 3 active sessions
    for (let i = 0; i < 3; i++) {
      sessions.push({
        professionalId: createdProfessionals[2]._id,
        clientAnonymousId: 'ANON-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
        clientSessionToken: 'session_' + crypto.randomBytes(16).toString('hex'),
        paymentReference: 'PSREF_' + crypto.randomBytes(8).toString('hex'),
        amountPaid: 300000,
        professionalEarning: 250000,
        platformFee: 50000,
        status: 'active',
        startedAt: new Date(Date.now() - (i + 1) * 4 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + (24 - (i + 1) * 4) * 60 * 60 * 1000),
        endedAt: null,
        endedBy: null,
        hasUnreadMessages: i === 0,
        lastMessageAt: new Date(Date.now() - i * 60 * 60 * 1000)
      });
    }

    const createdSessions = await ConsultationSession.insertMany(sessions);
    console.log(`Created ${createdSessions.length} consultation sessions!`);

    console.log('\n✅ Database seeded successfully!');
    console.log(`\nCreated:`);
    console.log(`- ${createdProfessionals.length} professionals`);
    console.log(`- ${createdSessions.length} consultation sessions`);
    console.log(`\nYou can now view them at:`);
    console.log(`- Professionals: http://localhost:5500/consultations.html`);
    console.log(`- Dashboard: http://localhost:5500/consultation-dashboard.html`);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

seedDatabase();
