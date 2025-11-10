(function () {
  if (typeof window === 'undefined') return;

  const STORAGE_KEY = 'siriusMarketplaceVendors';

  const DEFAULT_VENDORS = [
    {
      id: 'dewiss',
      order: 1,
      name: 'Dewiss Gadget Hub',
      owner: 'Dewiss Operations',
      headline: 'Phones, laptops & premium gadgets you can trust',
      summary: 'Same-day dispatch of phones, laptops, consoles and accessories with diagnostics support and trade-in options.',
      location: 'Port Harcourt • Nationwide delivery',
      delivery: 'Ships nationwide within 24–48 hours via insured logistics partners.',
      whatsapp: '+2348139669971',
      instagram: 'https://www.instagram.com/dewissgadgethub?igsh=enRob25yYzlqMTBs',
      highlights: [
        'Smartphones, laptops, gaming consoles & accessories',
        'Trade-in support and certified repairs with diagnostics',
        'Express delivery and pickup hubs in Port Harcourt & Lagos',
      ],
      hero: true,
      categories: ['Tech & Gadgets'],
      logoUrl: '',
      media: [
        { type: 'image', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80' },
        { type: 'image', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80' },
        { type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumbnail: 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=900&q=80' },
      ],
    },
    {
      id: 'glyts-paints',
      order: 2,
      name: 'Glyts Paints',
      owner: 'Glyts Team',
      headline: 'Decorative & protective coatings for every surface',
      summary: 'Premium interior/exterior, marine and specialty coatings with colour lab support and certified applicators.',
      location: 'Port Harcourt • Delivers nationwide',
      delivery: 'Colour matching, on-site tinting and delivery across Nigeria.',
      whatsapp: '+2347039539167',
      instagram: '',
      highlights: [
        'Paint systems for residential, commercial and marine projects',
        'Free colour consultations and on-site tinting for large orders',
        'Certified applicator network with 10-year finish warranty',
      ],
      hero: false,
      categories: ['Surface Care'],
      logoUrl: '',
      media: [
        { type: 'image', url: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=80' },
        { type: 'image', url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80' },
        { type: 'image', url: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=900&q=80' },
      ],
    },
    {
      id: 'de-eminent-eatery',
      order: 3,
      name: 'De Eminent Eatery',
      owner: 'Glyts Eats',
      headline: 'Shawarma, pizza, pastries & outdoor catering',
      summary: 'Quick-service meals, corporate catering and bakery delights with delivery within Port Harcourt and pickup hubs.',
      location: 'Port Harcourt • Delivery on request nationwide',
      delivery: 'Hot meals and frozen packs delivered within PH, packaged orders dispatched outside PH.',
      whatsapp: '+2347039539167',
      instagram: '',
      highlights: [
        'Shawarma, grills, pizzas, burgers and cocktail platters',
        'Corporate catering for trainings, retreats and private events',
        'Pastries & cakes baked daily with custom orders available',
      ],
      hero: false,
      categories: ['Food & Catering'],
      logoUrl: '',
      media: [
        { type: 'image', url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80' },
        { type: 'image', url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80&sat=-50' },
        { type: 'video', url: 'https://www.w3schools.com/html/movie.mp4', thumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80' },
      ],
    },
    {
      id: 'izreal-palm-rich',
      order: 4,
      name: 'Izreal Palm Rich',
      owner: 'Isreal Okwu',
      headline: 'Cold-pressed palm oil, palm kernel oil & allied products',
      summary: 'Premium palm produce sourced from Imo State, filtered twice for purity and packaged for households, retailers and export clients.',
      location: 'Imo State • Nationwide fulfilment',
      delivery: 'Weekly dispatch from Owerri logistics hub with moisture and FFA reports.',
      whatsapp: '+2348105892627',
      instagram: 'https://www.instagram.com/izrealpalmrich?igsh=MWt6Nmxmbnhld21wcQ==',
      highlights: [
        'Supply options: 1L retail, 5L/10L family, 25L & 50L wholesale drums',
        'Laboratory certified quality with documentation per batch',
        'Export-ready packaging and consolidation on request',
      ],
      hero: false,
      categories: ['Food & Agriculture'],
      logoUrl: '',
      media: [
        { type: 'image', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80' },
        { type: 'image', url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80' },
        { type: 'image', url: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=900&q=80' },
      ],
    },
  ];

  const HERO_FALLBACK_ID = 'dewiss';

  function cloneDefaults() {
    return DEFAULT_VENDORS.map(v => ({
      ...v,
      highlights: Array.isArray(v.highlights) ? [...v.highlights] : [],
    }));
  }

  function normaliseHighlights(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter(Boolean).map(item => item.toString().trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split('\n')
        .map(part => part.trim())
        .filter(Boolean);
    }
    return [];
  }

  function cleanInstagram(value) {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('@')) {
      return `https://www.instagram.com/${trimmed.slice(1)}`;
    }
    return `https://www.instagram.com/${trimmed}`;
  }

  function normalisePhone(value) {
    if (!value) return '';
    const trimmed = value.toString().trim();
    if (!trimmed) return '';
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('234')) {
      return `+${digits}`;
    }
    if (digits.startsWith('0')) {
      return `+234${digits.slice(1)}`;
    }
    if (trimmed.startsWith('+')) {
      return `+${digits}`;
    }
    return digits.length === 10 ? `+234${digits}` : `+${digits}`;
  }

  function buildWhatsAppLink(phone) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (!digits) return '';
    return `https://wa.me/${digits.startsWith('234') ? digits : digits.startsWith('0') ? `234${digits.slice(1)}` : digits}`;
  }

  function ensureHero(vendors) {
    let heroVendor = vendors.find(v => v.hero);
    if (!heroVendor) {
      heroVendor = vendors.find(v => v.id === HERO_FALLBACK_ID) || vendors[0];
      if (heroVendor) heroVendor.hero = true;
    }
    vendors.forEach(v => {
      if (v !== heroVendor) v.hero = false;
    });
    return vendors;
  }

  function normaliseVendor(rawVendor) {
    const vendor = { ...rawVendor };
    vendor.highlights = normaliseHighlights(vendor.highlights);
    vendor.instagram = cleanInstagram(vendor.instagram || '');
    vendor.whatsapp = normalisePhone(vendor.whatsapp || '');
    vendor.whatsappLink = buildWhatsAppLink(vendor.whatsapp);
    vendor.categories = Array.isArray(vendor.categories) ? [...vendor.categories] : [];
    vendor.owner = vendor.owner?.trim() || '';
    vendor.headline = vendor.headline?.trim() || '';
    vendor.summary = vendor.summary?.trim() || '';
    vendor.location = vendor.location?.trim() || '';
    vendor.delivery = vendor.delivery?.trim() || '';
    vendor.logoUrl = vendor.logoUrl?.trim() || '';
    vendor.name = vendor.name?.trim() || 'Marketplace Vendor';
    vendor.order = typeof vendor.order === 'number' ? vendor.order : 99;
    vendor.media = Array.isArray(vendor.media)
      ? vendor.media
          .map(item => {
            if (!item || !item.url) return null;
            return {
              type: item.type === 'video' ? 'video' : 'image',
              url: item.url,
              thumbnail: item.thumbnail || item.url,
            };
          })
          .filter(Boolean)
      : [];
    return vendor;
  }

  function mergeVendors(defaults, stored) {
    const map = new Map();
    defaults.forEach(v => map.set(v.id, { ...v }));
    stored.forEach(item => {
      if (!item || !item.id) return;
      const base = map.get(item.id) || { id: item.id };
      map.set(item.id, { ...base, ...item });
    });
    return Array.from(map.values());
  }

  function prepareForStorage(vendors) {
    return vendors.map(v => {
      const { whatsappLink, ...rest } = v;
      return {
        ...rest,
        highlights: Array.isArray(rest.highlights) ? [...rest.highlights] : [],
      };
    });
  }

  function loadStoredVendors() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Unable to read marketplace vendors from storage', error);
      return [];
    }
  }

  function saveToStorage(vendors) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prepareForStorage(vendors)));
    } catch (error) {
      console.warn('Unable to persist marketplace vendors', error);
    }
  }

  function loadVendors() {
    const stored = loadStoredVendors();
    const merged = mergeVendors(cloneDefaults(), stored).map(normaliseVendor);
    ensureHero(merged);
    return merged.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }

  function saveVendors(vendors) {
    const normalised = vendors.map(normaliseVendor);
    ensureHero(normalised);
    saveToStorage(normalised);
    return loadVendors();
  }

  function getVendorById(id) {
    return loadVendors().find(v => v.id === id) || null;
  }

  function upsertVendor(partialVendor) {
    if (!partialVendor || !partialVendor.id) {
      throw new Error('Vendor ID is required');
    }
    const vendors = loadVendors();
    const index = vendors.findIndex(v => v.id === partialVendor.id);
    const updated = normaliseVendor({ ...(index >= 0 ? vendors[index] : { id: partialVendor.id }), ...partialVendor });
    vendors[index >= 0 ? index : vendors.length] = updated;
    return saveVendors(vendors);
  }

  function setHeroVendor(id) {
    const vendors = loadVendors().map(v => ({ ...v, hero: v.id === id }));
    return saveVendors(vendors);
  }

  function resetVendor(id) {
    if (!id) {
      localStorage.removeItem(STORAGE_KEY);
      return loadVendors();
    }
    const defaults = cloneDefaults();
    const defaultVendor = defaults.find(v => v.id === id);
    const vendors = loadVendors();
    const index = vendors.findIndex(v => v.id === id);
    if (index >= 0 && defaultVendor) {
      vendors[index] = normaliseVendor(defaultVendor);
      return saveVendors(vendors);
    }
    return vendors;
  }

  window.SiriusMarketplace = {
    loadVendors,
    saveVendors,
    upsertVendor,
    setHeroVendor,
    getVendorById,
    resetVendor,
  };
})();
