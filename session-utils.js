(function () {
  const unique = (values) => Array.from(new Set((values ?? []).filter(Boolean)));

  const deriveRolesFromData = (data) => {
    const apiRoles = Array.isArray(data?.roles) ? data.roles : [];
    const userRoles = Array.isArray(data?.user?.roles) ? data.user.roles : [];
    const primaryRole = data?.user?.role;
    return unique([...apiRoles, ...userRoles, primaryRole]);
  };

  const createPayload = (data, options = {}) => {
    const user = data?.user ?? {};
    const roles = deriveRolesFromData(data);
    const preferredRole = options.activeRole;
    const activeRole =
      preferredRole && roles.includes(preferredRole) ? preferredRole : roles[0] ?? null;

    return {
      token: data?.token ?? null,
      userId: user.id ?? null,
      email: user.email ?? options.email ?? null,
      role: user.role ?? null,
      roles,
      activeRole,
      firstName: user.firstName ?? options.firstName ?? '',
      lastName: user.lastName ?? options.lastName ?? '',
      verified: Boolean(user.emailVerifiedAt) || Boolean(user.verified),
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      professionalProfile: user.professionalProfile ?? null,
      artisanProfile: user.artisanProfile ?? null,
      employerProfile: user.employerProfile ?? null,
      loggedInAt: new Date().toISOString(),
    };
  };

  const persist = (payload) => {
    if (!payload || typeof sessionStorage === 'undefined') {
      return;
    }

    const base = { ...payload };
    const roles = Array.isArray(base.roles) ? base.roles : [];

    if (roles.includes('ARTISAN')) {
      const workerPayload = { ...base, activeRole: 'ARTISAN' };
      sessionStorage.setItem('siriusWorkerAuth', JSON.stringify(workerPayload));
    } else {
      sessionStorage.removeItem('siriusWorkerAuth');
    }

    if (roles.includes('CLIENT')) {
      const clientPayload = { ...base, activeRole: 'CLIENT' };
      sessionStorage.setItem('siriusClientAuth', JSON.stringify(clientPayload));
    } else {
      sessionStorage.removeItem('siriusClientAuth');
    }

    if (roles.includes('DOCTOR') || roles.includes('LAWYER')) {
      const professionalRole = roles.includes('DOCTOR') ? 'DOCTOR' : 'LAWYER';
      const professionalPayload = { ...base, activeRole: professionalRole };
      sessionStorage.setItem('siriusProAuth', JSON.stringify(professionalPayload));
    } else {
      sessionStorage.removeItem('siriusProAuth');
    }

    const hasEmployerRole = roles.includes('EMPLOYER') || roles.includes('ADMIN');
    if (hasEmployerRole) {
      const employerActiveRole = roles.includes('EMPLOYER') ? 'EMPLOYER' : 'ADMIN';
      const employerPayload = { ...base, activeRole: employerActiveRole };
      sessionStorage.setItem('siriusEmployerAuth', JSON.stringify(employerPayload));
    } else {
      sessionStorage.removeItem('siriusEmployerAuth');
    }
  };

  const parse = (key) => {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? 'null');
    } catch (error) {
      console.warn('Unable to parse session payload for', key, error);
      return null;
    }
  };

  window.SiriusSession = {
    deriveRoles: deriveRolesFromData,
    createPayload,
    persist,
    parse,
  };
})();
