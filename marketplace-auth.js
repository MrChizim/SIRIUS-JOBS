(function () {
  if (typeof window === 'undefined') return;

  const STORAGE_KEY = 'siriusMarketplaceMerchants';
  const SESSION_KEY = 'siriusMarketplaceSession';
  const DEFAULT_MERCHANTS = [
    {
      id: 'demo-merchant',
      businessName: 'Dewiss Finishing',
      contactName: 'Sirius Demo',
      email: 'demo@siriusjobs.com',
      phone: '+2347012345678',
      instagram: 'https://www.instagram.com/dewissgadgethub',
      whatsapp: '+2347012345678',
      password: 'Demo1234!',
      plan: '12-month',
      category: 'Tech & gadgets',
      website: 'https://dewissonmarket.ng',
      city: 'Port Harcourt',
      createdAt: new Date().toISOString(),
    },
  ];

  function normaliseEmail(value) {
    return (value || '').toString().trim().toLowerCase();
  }

  function loadMerchants() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        saveMerchants(DEFAULT_MERCHANTS);
        return [...DEFAULT_MERCHANTS];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        saveMerchants(DEFAULT_MERCHANTS);
        return [...DEFAULT_MERCHANTS];
      }
      return parsed;
    } catch (error) {
      console.warn('Unable to read marketplace merchants from storage', error);
      saveMerchants(DEFAULT_MERCHANTS);
      return [...DEFAULT_MERCHANTS];
    }
  }

  function saveMerchants(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.warn('Unable to persist marketplace merchants', error);
    }
  }

  function generateId() {
    return `merchant_${Math.random().toString(36).slice(2, 10)}`;
  }

  function registerMerchant(payload) {
    const email = normaliseEmail(payload.email);
    if (!email || !payload.password) {
      throw new Error('Email and password are required');
    }
    const merchants = loadMerchants();
    if (merchants.some(merchant => normaliseEmail(merchant.email) === email)) {
      throw new Error('Merchant with this email already exists');
    }
    const record = {
      id: generateId(),
      businessName: payload.businessName?.trim() || 'Marketplace Merchant',
      contactName: payload.contactName?.trim() || '',
      email,
      phone: payload.phone?.trim() || '',
      instagram: payload.instagram?.trim() || '',
      whatsapp: payload.whatsapp?.trim() || '',
      password: payload.password,
      plan: payload.plan || 'PENDING_SELECTION',
      category: payload.category || 'general',
      website: payload.website || '',
      city: payload.city || '',
      createdAt: new Date().toISOString(),
    };
    merchants.push(record);
    saveMerchants(merchants);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ merchantId: record.id, signedInAt: Date.now() }));
    return record;
  }

  function loginMerchant(email, password) {
    const merchants = loadMerchants();
    const record = merchants.find(merchant => normaliseEmail(merchant.email) === normaliseEmail(email));
    if (!record || record.password !== password) {
      throw new Error('Invalid email or password');
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ merchantId: record.id, signedInAt: Date.now() }));
    return record;
  }

  function logoutMerchant() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getActiveMerchant() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session?.merchantId) return null;
      const merchants = loadMerchants();
      return merchants.find(merchant => merchant.id === session.merchantId) || null;
    } catch (error) {
      console.warn('Unable to load active marketplace merchant', error);
      return null;
    }
  }

  window.SiriusMarketplaceAuth = {
    register: registerMerchant,
    login: loginMerchant,
    logout: logoutMerchant,
    loadMerchants,
    getActiveMerchant,
  };
})();
