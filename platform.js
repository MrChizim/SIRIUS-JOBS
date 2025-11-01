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

  function deriveProfessionalRole(profession) {
    const normalized = (profession ?? '').toString().trim().toUpperCase();
    if (!normalized) {
      return 'PROFESSIONAL';
    }
    if (normalized.includes('LAW')) {
      return 'LAWYER';
    }
    if (normalized.includes('DOCTOR') || normalized.includes('MEDIC') || normalized.includes('PHYSICIAN')) {
      return 'DOCTOR';
    }
    return normalized;
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
      id: makeId('CLI'),
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      role: 'CLIENT',
      roles: ['CLIENT'],
      sessionToken: null,
      lastLoginAt: null,
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

  function ensureClientAccountShape(record) {
    if (!record) return null;
    if (!record.id) {
      record.id = makeId('CLI');
    }
    const existingRoles = Array.isArray(record.roles) ? record.roles.filter(Boolean) : [];
    if (!existingRoles.includes('CLIENT')) {
      existingRoles.push('CLIENT');
    }
    record.roles = existingRoles;
    record.role = 'CLIENT';
    if (!record.sessionToken) {
      record.sessionToken = makeId('TOK');
    }
    if (!record.email) {
      record.email = '';
    }
    return record;
  }

  function authenticateClient({ email, password }) {
    const db = loadDB();
    const normalizedEmail = email?.toLowerCase?.();
    const record = db.clients[normalizedEmail];
    if (!record) {
      throw new Error('We could not find a client account with that email.');
    }
    if (record.password !== password) {
      throw new Error('Incorrect email or password. Please try again.');
    }
    if (!record.verified) {
      throw new Error('Please verify your email before signing in.');
    }
    ensureClientAccountShape(record);
    record.lastLoginAt = nowISO();
    saveDB(db);
    const sessionToken = record.sessionToken;
    const roleList = Array.isArray(record.roles) && record.roles.length ? record.roles.slice() : ['CLIENT'];
    return {
      source: 'platform',
      token: sessionToken,
      roles: roleList,
      user: {
        id: record.id,
        email: record.email,
        firstName: record.firstName,
        lastName: record.lastName,
        role: 'CLIENT',
        roles: roleList,
        emailVerifiedAt: record.verifiedAt ?? nowISO(),
        verified: true,
        clientProfile: {
          verified: true,
          createdAt: record.createdAt,
        },
      },
    };
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
    const primaryRole = deriveProfessionalRole(profession);
    const verificationToken = makeId('PRF');
    db.professionals[normalizedEmail] = {
      id: makeId('PRO'),
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      profession,
      licenseNumber,
      regulatoryBody,
      role: primaryRole,
      roles: [primaryRole],
      sessionToken: null,
      lastLoginAt: null,
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

  function ensureProfessionalAccountShape(record) {
    if (!record) return null;
    if (!record.id) {
      record.id = makeId('PRO');
    }
    const derivedRole = deriveProfessionalRole(record.role || record.profession);
    const roles = Array.isArray(record.roles) ? record.roles.filter(Boolean) : [];
    if (!roles.includes(derivedRole)) {
      roles.push(derivedRole);
    }
    record.role = derivedRole;
    record.roles = roles;
    if (!record.sessionToken) {
      record.sessionToken = makeId('TOK');
    }
    return record;
  }

  function authenticateProfessional({ email, password, profession }) {
    const db = loadDB();
    const normalizedEmail = email?.toLowerCase?.();
    const record = db.professionals[normalizedEmail];
    if (!record) {
      throw new Error('We could not find a professional account with that email.');
    }
    if (record.password !== password) {
      throw new Error('Incorrect email or password. Please try again.');
    }
    if (!record.emailVerified) {
      throw new Error('Please verify your email before signing in.');
    }
    if (profession) {
      record.profession = profession;
    }
    ensureProfessionalAccountShape(record);
    record.lastLoginAt = nowISO();
    saveDB(db);
    const roleList = Array.isArray(record.roles) && record.roles.length ? record.roles.slice() : [record.role];
    return {
      source: 'platform',
      token: record.sessionToken,
      roles: roleList,
      user: {
        id: record.id,
        email: record.email,
        firstName: record.firstName,
        lastName: record.lastName,
        role: record.role,
        roles: roleList,
        professionalProfile: {
          profession: record.profession,
          licenseNumber: record.licenseNumber,
          regulatoryBody: record.regulatoryBody,
          verifiedBadge: Boolean(record.onboardingPaid),
          licenseVerified: Boolean(record.licenseVerified),
          onboardingPaid: Boolean(record.onboardingPaid),
        },
      },
    };
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

  function bookCrossConsultation({ clientEmail, targetProfession, reason, preferredDate, mode }) {
    const db = loadDB();
    const normalizedClient = clientEmail?.toLowerCase?.();
    if (!normalizedClient) {
      throw new Error('Client email is required.');
    }
    const clientRecord = db.professionals[normalizedClient];
    if (!clientRecord) {
      throw new Error('Professional account not found.');
    }
    const clientProfession = (clientRecord.profession ?? '').toLowerCase();
    const isDoctor = (clientRecord.role ?? '').toUpperCase() === 'DOCTOR' || clientProfession.includes('doctor');
    const isLawyer = (clientRecord.role ?? '').toUpperCase() === 'LAWYER' || clientProfession.includes('lawyer');
    if (targetProfession === 'LAWYER' && !isDoctor) {
      throw new Error('Only doctors can request lawyer consultations from this panel.');
    }
    if (targetProfession === 'DOCTOR' && !isLawyer) {
      throw new Error('Only lawyers can request doctor consultations from this panel.');
    }

    const candidates = Object.values(db.professionals ?? {}).filter((entry) => {
      const profession = (entry.profession ?? '').toLowerCase();
      if (targetProfession === 'LAWYER') {
        return profession.includes('lawyer');
      }
      return profession.includes('doctor');
    });

    if (!candidates.length) {
      throw new Error('No available professionals found right now.');
    }
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const scheduledDate = preferredDate ? new Date(preferredDate) : new Date(Date.now() + 36 * 60 * 60 * 1000);
    const safeScheduledDate = Number.isNaN(scheduledDate.getTime()) ? new Date(Date.now() + 36 * 60 * 60 * 1000) : scheduledDate;

    const consultation = {
      id: makeId('CONS'),
      professionalEmail: target.email?.toLowerCase?.() ?? '',
      professionalName: `${target.firstName ?? ''} ${target.lastName ?? ''}`.trim() || 'Assigned Professional',
      clientEmail: normalizedClient,
      clientName: `${clientRecord.firstName ?? ''} ${clientRecord.lastName ?? ''}`.trim() || normalizedClient,
      status: 'PAID_HOLD',
      amountKobo: CONSULTATION_FEE_KOBO,
      proAmountKobo: PROFESSIONAL_SHARE_KOBO,
      platformFeeKobo: PLATFORM_SHARE_KOBO,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      scheduledFor: safeScheduledDate.toISOString(),
      crossConsult: {
        targetProfession,
        reason,
        mode: mode ?? 'VIDEO',
      },
    };
    db.consultations.push(consultation);
    saveDB(db);
    return {
      consultation,
      assignedProfessional: {
        email: target.email,
        name: `${target.firstName ?? ''} ${target.lastName ?? ''}`.trim() || 'Assigned Professional',
        profession: target.profession,
      },
    };
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
    authenticateClient,
    registerProfessional,
    verifyProfessional,
    verifyProfessionalLicense,
    authenticateProfessional,
    markProfessionalPaid,
    toggleProfessionalVisibility,
    recordConsultationUnlock,
    completeConsultation,
    getClientConsultations,
    bookCrossConsultation,
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
