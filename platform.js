/**
 * Sirius Jobs – Front-end data layer
 * ---------------------------------
 * Lightweight localStorage-backed store that simulates the marketplace workflows:
 * - Client & professional registration + verification
 * - Onboarding payments
 * - Consultation unlocks (payments held by platform)
 * - Consultation completion + review + fund release
 * - Professional wallet snapshots
 *
 * Amounts are stored in Kobo for accuracy.
 */
(function () {
  const STORAGE_KEY = 'siriusPlatformData';
  const CONSULTATION_FEE_KOBO = 3_000 * 100;
  const PROFESSIONAL_SHARE_KOBO = 2_500 * 100;
  const PLATFORM_SHARE_KOBO = CONSULTATION_FEE_KOBO - PROFESSIONAL_SHARE_KOBO;
  const REGULATORY_PATTERNS = {
    MDCN: /^MDCN-\d{5}$/i,
    'MEDICAL AND DENTAL COUNCIL OF NIGERIA': /^MDCN-\d{5}$/i,
    NBA: /^NBA\/SCN-\d{5}$/i,
    'NIGERIAN BAR ASSOCIATION': /^NBA\/SCN-\d{5}$/i,
  };

  const seedProfessionals = [
    {
      email: 'adaobi.nwankwo@siriuspro.ng',
      firstName: 'Adaobi',
      lastName: 'Nwankwo',
      profession: 'Family Doctor',
      regulatoryBody: 'MDCN',
      licenseNumber: 'MDCN-24311',
      phone: '07030000011',
      onboardingPaid: true,
      profilePublic: true,
      licenseVerified: true,
      emailVerified: true,
    },
    {
      email: 'ibrahim.sani@siriuspro.ng',
      firstName: 'Ibrahim',
      lastName: 'Sani',
      profession: 'General Practitioner',
      regulatoryBody: 'MDCN',
      licenseNumber: 'MDCN-19283',
      phone: '08090000012',
      onboardingPaid: true,
      profilePublic: true,
      licenseVerified: true,
      emailVerified: true,
    },
    {
      email: 'kemi.ajayi@siriuspro.ng',
      firstName: 'Kemi',
      lastName: 'Ajayi',
      profession: 'Telemedicine Doctor',
      regulatoryBody: 'MDCN',
      licenseNumber: 'MDCN-18542',
      phone: '08110000013',
      onboardingPaid: true,
      profilePublic: true,
      licenseVerified: true,
      emailVerified: true,
    },
    {
      email: 'ifeoma.nwachukwu@siriuspro.ng',
      firstName: 'Ifeoma',
      lastName: 'Nwachukwu',
      profession: 'Corporate Lawyer',
      regulatoryBody: 'NBA',
      licenseNumber: 'NBA/SCN-10922',
      phone: '08030000021',
      onboardingPaid: true,
      profilePublic: true,
      licenseVerified: true,
      emailVerified: true,
    },
    {
      email: 'farouk.adamu@siriuspro.ng',
      firstName: 'Farouk',
      lastName: 'Adamu',
      profession: 'Commercial Lawyer',
      regulatoryBody: 'NBA',
      licenseNumber: 'NBA/SCN-22112',
      phone: '08060000022',
      onboardingPaid: true,
      profilePublic: true,
      licenseVerified: true,
      emailVerified: true,
    },
    {
      email: 'lydia.etuk@siriuspro.ng',
      firstName: 'Lydia',
      lastName: 'Etuk',
      profession: 'Employment & Family Lawyer',
      regulatoryBody: 'NBA',
      licenseNumber: 'NBA/SCN-17843',
      phone: '07020000023',
      onboardingPaid: true,
      profilePublic: true,
      licenseVerified: true,
      emailVerified: true,
    },
  ];

  function nowISO() {
    return new Date().toISOString();
  }

  function makeId(prefix = 'CONS') {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  }

  function loadDB() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return seedDatabase();
      }
      const parsed = JSON.parse(stored);
      return normalizeDatabase(parsed);
    } catch (error) {
      console.warn('Unable to read Sirius platform storage, resetting.', error);
      return seedDatabase();
    }
  }

  function normalizeDatabase(data) {
    const db = {
      clients: data?.clients ?? {},
      professionals: data?.professionals ?? {},
      consultations: Array.isArray(data?.consultations) ? data.consultations : [],
      payouts: Array.isArray(data?.payouts) ? data.payouts : [],
    };
    seedProfessionals.forEach((pro) => {
      if (!db.professionals[pro.email]) {
        db.professionals[pro.email] = {
          ...pro,
          createdAt: nowISO(),
        };
      }
    });
    saveDB(db);
    return db;
  }

  function normalizeRegulatoryBody(body) {
    return (body ?? '').toString().trim().toUpperCase();
  }

  function validateLicenseFormat(licenseNumber, regulatoryBody) {
    const formattedBody = normalizeRegulatoryBody(regulatoryBody);
    const value = (licenseNumber ?? '').toString().trim().toUpperCase();
    if (!value) {
      return { valid: false, message: 'Enter a licence number before verification.' };
    }
    const patternEntry = Object.entries(REGULATORY_PATTERNS).find(([key]) => formattedBody.includes(key));
    if (patternEntry) {
      const [, pattern] = patternEntry;
      if (!pattern.test(value)) {
        return { valid: false, message: 'Licence number does not match the expected format for the selected regulatory body.' };
      }
    } else if (value.length < 6) {
      return { valid: false, message: 'Licence number looks too short. Please double-check and try again.' };
    }
    return { valid: true, licence: value, body: formattedBody };
  }

  function seedDatabase() {
    const db = normalizeDatabase({});
    saveDB(db);
    return db;
  }

  function saveDB(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function registerClient({ firstName, lastName, email, password }) {
    const db = loadDB();
    const normalizedEmail = email.toLowerCase();
    if (db.clients[normalizedEmail]) {
      throw new Error('A client with this email already exists.');
    }
    const verificationToken = makeId('VRF');
    db.clients[normalizedEmail] = {
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      verified: false,
      verificationToken,
      createdAt: nowISO(),
    };
    saveDB(db);
    return {
      record: { ...db.clients[normalizedEmail], password: undefined },
      verificationToken,
    };
  }

  function verifyClient({ email, token }) {
    const db = loadDB();
    const record = db.clients[email?.toLowerCase?.() ?? ''];
    if (!record) {
      throw new Error('Client record not found.');
    }
    if (record.verificationToken && token && record.verificationToken !== token) {
      throw new Error('Invalid verification token supplied.');
    }
    record.verified = true;
    record.verifiedAt = nowISO();
    saveDB(db);
    return { ...record, password: undefined };
  }

  function registerProfessional(payload) {
    const {
      firstName,
      lastName,
      email,
      password,
      profession,
      licenseNumber,
      regulatoryBody,
    } = payload;
    const db = loadDB();
    const normalizedEmail = email.toLowerCase();
    if (db.professionals[normalizedEmail]) {
      throw new Error('A professional with this email already exists.');
    }
    const verificationToken = makeId('PRF');
    db.professionals[normalizedEmail] = {
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      profession,
      licenseNumber,
      regulatoryBody,
      onboardingPaid: false,
      profilePublic: false,
      licenseVerified: false,
      emailVerified: false,
      createdAt: nowISO(),
      verificationToken,
      payoutAccount: null,
      licenseVerification: {
        status: 'UNVERIFIED',
        checkedAt: null,
        reference: null,
        notes: '',
      },
    };
    saveDB(db);
    return {
      record: stripPassword(db.professionals[normalizedEmail]),
      verificationToken,
    };
  }

  function verifyProfessional({ email, token }) {
    const db = loadDB();
    const record = db.professionals[email?.toLowerCase?.() ?? ''];
    if (!record) {
      throw new Error('Professional record not found.');
    }
    if (record.verificationToken && token && record.verificationToken !== token) {
      throw new Error('Invalid verification token supplied.');
    }
    record.emailVerified = true;
    record.emailVerifiedAt = nowISO();
    saveDB(db);
    return stripPassword(record);
  }

  function verifyProfessionalLicense({ email, licenseNumber, regulatoryBody }) {
    const db = loadDB();
    const normalizedEmail = email?.toLowerCase?.();
    const record = db.professionals[normalizedEmail];
    if (!record) {
      throw new Error('Professional record not found.');
    }
    const result = validateLicenseFormat(licenseNumber ?? record.licenseNumber, regulatoryBody ?? record.regulatoryBody);
    if (!result.valid) {
      record.licenseVerification = {
        status: 'FAILED',
        checkedAt: nowISO(),
        reference: makeId('LIC'),
        notes: result.message,
      };
      saveDB(db);
      throw new Error(result.message);
    }
    record.licenseNumber = result.licence;
    record.regulatoryBody = result.body || record.regulatoryBody;
    record.licenseVerified = true;
    record.licenseVerification = {
      status: 'VERIFIED',
      checkedAt: nowISO(),
      reference: makeId('LIC'),
      notes: 'Verified locally. Awaiting regulatory confirmation.',
    };
    saveDB(db);
    return stripPassword(record);
  }

  function markProfessionalPaid(email) {
    const db = loadDB();
    const record = db.professionals[email?.toLowerCase?.() ?? ''];
    if (!record) {
      throw new Error('Professional not found.');
    }
    record.onboardingPaid = true;
    record.profilePublic = true;
    record.paymentHistory = record.paymentHistory ?? [];
    record.paymentHistory.push({
      amountKobo: 1_000 * 100,
      reference: makeId('PAY'),
      paidAt: nowISO(),
    });
    saveDB(db);
    return stripPassword(record);
  }

  function toggleProfessionalVisibility(email, isPublic) {
    const db = loadDB();
    const record = db.professionals[email?.toLowerCase?.() ?? ''];
    if (!record) {
      throw new Error('Professional not found.');
    }
    record.profilePublic = Boolean(isPublic);
    saveDB(db);
    return stripPassword(record);
  }

  function recordConsultationUnlock({ professionalEmail, professionalName, clientEmail }) {
    const db = loadDB();
    const normalizedPro = professionalEmail?.toLowerCase?.();
    const normalizedClient = clientEmail?.toLowerCase?.();
    const proRecord = db.professionals[normalizedPro];
    if (!proRecord) {
      throw new Error('The selected professional is not yet onboarded on Sirius Jobs.');
    }
    if (!proRecord.onboardingPaid) {
      throw new Error('The professional must complete onboarding before receiving unlocks.');
    }
    const clientRecord = db.clients[normalizedClient];
    if (!clientRecord || !clientRecord.verified) {
      throw new Error('Client account is not verified. Please sign in again.');
    }
    const consultation = {
      id: makeId('CONS'),
      professionalEmail: normalizedPro,
      professionalName: professionalName ?? `${proRecord.firstName} ${proRecord.lastName}`.trim(),
      clientEmail: normalizedClient,
      clientName: `${clientRecord.firstName ?? ''} ${clientRecord.lastName ?? ''}`.trim() || normalizedClient,
      status: 'PAID_HOLD',
      amountKobo: CONSULTATION_FEE_KOBO,
      proAmountKobo: PROFESSIONAL_SHARE_KOBO,
      platformFeeKobo: PLATFORM_SHARE_KOBO,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      rating: null,
      comment: '',
    };
    db.consultations.push(consultation);
    saveDB(db);
    return consultation;
  }

  function completeConsultation({ consultationId, rating, comment }) {
    const db = loadDB();
    const consultation = db.consultations.find((entry) => entry.id === consultationId);
    if (!consultation) {
      throw new Error('Consultation record not found.');
    }
    consultation.status = 'COMPLETED';
    consultation.completedAt = nowISO();
    consultation.updatedAt = nowISO();
    consultation.rating = typeof rating === 'number' ? rating : null;
    consultation.comment = comment ?? '';
    saveDB(db);
    return consultation;
  }

  function getClientConsultations(email) {
    const db = loadDB();
    const normalizedEmail = email?.toLowerCase?.();
    if (!normalizedEmail) return [];
    return db.consultations
      .filter((entry) => entry.clientEmail === normalizedEmail)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getProfessionalSnapshot(email) {
    const db = loadDB();
    const normalizedEmail = email?.toLowerCase?.();
    const pro = db.professionals[normalizedEmail];
    if (!pro) {
      return null;
    }
    const consultations = db.consultations.filter((entry) => entry.professionalEmail === normalizedEmail);
    const pending = consultations.filter((entry) => entry.status === 'PAID_HOLD');
    const completed = consultations.filter((entry) => entry.status === 'COMPLETED');
    const pendingValue = pending.reduce((sum, entry) => sum + (entry.proAmountKobo ?? 0), 0);
    const completedValue = completed.reduce((sum, entry) => sum + (entry.proAmountKobo ?? 0), 0);
    const averageRating =
      completed.length > 0
        ? (
            completed.reduce((sum, entry) => sum + (entry.rating ?? 0), 0) /
            Math.max(completed.filter((entry) => entry.rating).length, 1)
          ).toFixed(1)
        : '0.0';
    const reviewCount = completed.filter((entry) => entry.rating).length;
    const clientsServed = new Set(completed.map((entry) => entry.clientEmail)).size;

    const walletHistory = consultations
      .map((entry) => {
        const isCompleted = entry.status === 'COMPLETED';
        return {
          id: entry.id,
          type: isCompleted ? 'Consultation payout' : 'Consultation on hold',
          amount: entry.proAmountKobo ?? 0,
          status: entry.status,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          clientName: entry.clientName,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const reviews = completed
      .filter((entry) => typeof entry.rating === 'number')
      .map((entry) => ({
        rating: entry.rating,
        comment: entry.comment,
        createdAt: entry.completedAt ?? entry.updatedAt ?? entry.createdAt,
        client: {
          firstName: entry.clientName?.split(' ')[0] ?? 'Client',
          lastName: entry.clientName?.split(' ').slice(1).join(' ') ?? '',
        },
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      profile: {
        user: {
          firstName: pro.firstName,
          lastName: pro.lastName,
        },
        profession: pro.profession,
        regulatoryBody: pro.regulatoryBody,
        licenseNumber: pro.licenseNumber,
        profileImageUrl: pro.profileImageUrl ?? '',
        licenseVerified: pro.licenseVerified ?? false,
        emailVerified: pro.emailVerified ?? false,
        licenseVerification: pro.licenseVerification ?? { status: pro.licenseVerified ? 'VERIFIED' : 'UNVERIFIED' },
        verifiedBadge: Boolean(pro.onboardingPaid),
        consultations,
        onboardingPaid: Boolean(pro.onboardingPaid),
        isPublic: Boolean(pro.profilePublic),
      },
      wallet: {
        available: completedValue,
        pending: pendingValue,
        history: walletHistory,
      },
      stats: {
        clientsServed,
        netEarnings: pendingValue + completedValue,
        pendingEarnings: pendingValue,
        consultationsScheduled: consultations.length,
        averageRating: Number.isFinite(Number(averageRating)) ? Number(averageRating) : 0,
        reviewCount,
      },
      payoutAccount: pro.payoutAccount ?? null,
      reviews,
    };
  }

  function saveProfessionalPayoutAccount(email, account) {
    const db = loadDB();
    const record = db.professionals[email?.toLowerCase?.() ?? ''];
    if (!record) {
      throw new Error('Professional not found.');
    }
    record.payoutAccount = {
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolder: account.accountHolder,
      updatedAt: nowISO(),
    };
    saveDB(db);
    return stripPassword(record).payoutAccount;
  }

  function stripPassword(record) {
    if (!record) return record;
    const { password, verificationToken, ...rest } = record;
    return rest;
  }

  function getAnyProfessional() {
    const db = loadDB();
    const entries = Object.values(db.professionals ?? {});
    return entries.length ? stripPassword(entries[0]) : null;
  }

  window.SiriusPlatform = {
    registerClient,
    verifyClient,
    registerProfessional,
    verifyProfessional,
    verifyProfessionalLicense,
    markProfessionalPaid,
    toggleProfessionalVisibility,
    recordConsultationUnlock,
    completeConsultation,
    getClientConsultations,
    getProfessionalSnapshot,
    saveProfessionalPayoutAccount,
    getAnyProfessional,
    constants: {
      CONSULTATION_FEE: CONSULTATION_FEE_KOBO / 100,
      PROFESSIONAL_SHARE: PROFESSIONAL_SHARE_KOBO / 100,
      PLATFORM_SHARE: PLATFORM_SHARE_KOBO / 100,
    },
  };
})();
