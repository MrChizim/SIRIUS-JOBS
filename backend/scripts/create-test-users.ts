import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function createTestUsers() {
  console.log('Creating test users...');

  const password = 'Test1234';
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // 1. Create Worker (Artisan) account
    const existingWorker = await prisma.user.findUnique({
      where: { email: 'worker@test.com' },
    });

    if (!existingWorker) {
      const category = await prisma.serviceCategory.findFirst();
      if (!category) {
        console.log('Creating service category...');
        await prisma.serviceCategory.create({
          data: {
            label: 'Plumbing',
            description: 'Plumbing services',
          },
        });
      }

      const serviceCategory = await prisma.serviceCategory.findFirst();

      const worker = await prisma.user.create({
        data: {
          email: 'worker@test.com',
          passwordHash,
          phone: '+2348012345678',
          firstName: 'John',
          lastName: 'Worker',
          role: 'ARTISAN',
          roles: ['ARTISAN'],
          isVerified: true,
          emailVerifiedAt: new Date(),
          artisanProfile: serviceCategory
            ? {
                create: {
                  serviceCategoryId: serviceCategory.id,
                  bio: 'Experienced plumber',
                  yearsExperience: 5,
                },
              }
            : undefined,
        },
      });
      console.log('✓ Worker account created: worker@test.com / Test1234');
    } else {
      console.log('✓ Worker account already exists: worker@test.com / Test1234');
    }

    // 2. Create Employer account
    const existingEmployer = await prisma.user.findUnique({
      where: { email: 'employer@test.com' },
    });

    if (!existingEmployer) {
      await prisma.user.create({
        data: {
          email: 'employer@test.com',
          passwordHash,
          phone: '+2348012345679',
          firstName: 'Jane',
          lastName: 'Employer',
          role: 'EMPLOYER',
          roles: ['EMPLOYER'],
          isVerified: true,
          emailVerifiedAt: new Date(),
          employerProfile: {
            create: {
              companyName: 'Test Company Ltd',
              industry: 'Construction',
            },
          },
        },
      });
      console.log('✓ Employer account created: employer@test.com / Test1234');
    } else {
      console.log('✓ Employer account already exists: employer@test.com / Test1234');
    }

    // 3. Create Client account (for consultations)
    const existingClient = await prisma.user.findUnique({
      where: { email: 'client@test.com' },
    });

    if (!existingClient) {
      await prisma.user.create({
        data: {
          email: 'client@test.com',
          passwordHash,
          firstName: 'Alice',
          lastName: 'Client',
          role: 'CLIENT',
          roles: ['CLIENT'],
          isVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      console.log('✓ Client account created: client@test.com / Test1234');
    } else {
      console.log('✓ Client account already exists: client@test.com / Test1234');
    }

    // 4. Create Doctor account
    const existingDoctor = await prisma.user.findUnique({
      where: { email: 'doctor@test.com' },
    });

    if (!existingDoctor) {
      await prisma.user.create({
        data: {
          email: 'doctor@test.com',
          passwordHash,
          phone: '+2348012345680',
          firstName: 'Dr. Bob',
          lastName: 'Medical',
          role: 'DOCTOR',
          roles: ['DOCTOR'],
          isVerified: true,
          emailVerifiedAt: new Date(),
          professionalProfile: {
            create: {
              profession: 'Doctor',
              licenseNumber: 'MD123456',
              regulatoryBody: 'MDCN',
              consultationFee: 5000,
              licenseVerified: true,
            },
          },
        },
      });
      console.log('✓ Doctor account created: doctor@test.com / Test1234');
    } else {
      console.log('✓ Doctor account already exists: doctor@test.com / Test1234');
    }

    // 5. Create Lawyer account
    const existingLawyer = await prisma.user.findUnique({
      where: { email: 'lawyer@test.com' },
    });

    if (!existingLawyer) {
      await prisma.user.create({
        data: {
          email: 'lawyer@test.com',
          passwordHash,
          phone: '+2348012345681',
          firstName: 'Atty. Carol',
          lastName: 'Legal',
          role: 'LAWYER',
          roles: ['LAWYER'],
          isVerified: true,
          emailVerifiedAt: new Date(),
          professionalProfile: {
            create: {
              profession: 'Lawyer',
              licenseNumber: 'LAW123456',
              regulatoryBody: 'NBA',
              consultationFee: 10000,
              licenseVerified: true,
            },
          },
        },
      });
      console.log('✓ Lawyer account created: lawyer@test.com / Test1234');
    } else {
      console.log('✓ Lawyer account already exists: lawyer@test.com / Test1234');
    }

    // 6. Create dual-role account (both Worker and Employer)
    const existingDual = await prisma.user.findUnique({
      where: { email: 'dual@test.com' },
    });

    if (!existingDual) {
      const serviceCategory = await prisma.serviceCategory.findFirst();

      await prisma.user.create({
        data: {
          email: 'dual@test.com',
          passwordHash,
          phone: '+2348012345682',
          firstName: 'Multi',
          lastName: 'Role',
          role: 'ARTISAN',
          roles: ['ARTISAN', 'EMPLOYER'],
          isVerified: true,
          emailVerifiedAt: new Date(),
          artisanProfile: serviceCategory
            ? {
                create: {
                  serviceCategoryId: serviceCategory.id,
                  bio: 'Dual role user',
                },
              }
            : undefined,
          employerProfile: {
            create: {
              companyName: 'Dual Role Company',
            },
          },
        },
      });
      console.log('✓ Dual-role account created: dual@test.com / Test1234');
    } else {
      console.log('✓ Dual-role account already exists: dual@test.com / Test1234');
    }

    console.log('\n✅ All test accounts ready!');
    console.log('\nTest Credentials:');
    console.log('=================');
    console.log('Worker:   worker@test.com / Test1234');
    console.log('Employer: employer@test.com / Test1234');
    console.log('Client:   client@test.com / Test1234');
    console.log('Doctor:   doctor@test.com / Test1234');
    console.log('Lawyer:   lawyer@test.com / Test1234');
    console.log('Dual:     dual@test.com / Test1234 (both worker & employer)');
  } catch (error) {
    console.error('Error creating test users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
