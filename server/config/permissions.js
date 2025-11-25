const ROLES = {
    ADMIN: 'admin',
    USER: 'user',
    AUDITOR: 'auditor'
};

const PERMISSIONS = {
    CALL_READ: 'call:read',
    CALL_INITIATE: 'call:initiate',
    CALL_DELETE: 'call:delete',
    CONSENT_READ: 'consent:read',
    CONSENT_VERIFY: 'consent:verify',
    USER_MANAGE: 'user:manage',
    SYSTEM_STATS: 'system:stats'
};

const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: Object.values(PERMISSIONS),
    [ROLES.USER]: [
        PERMISSIONS.CALL_READ,
        PERMISSIONS.CALL_INITIATE,
        PERMISSIONS.CONSENT_READ
    ],
    [ROLES.AUDITOR]: [
        PERMISSIONS.CALL_READ,
        PERMISSIONS.CONSENT_READ,
        PERMISSIONS.CONSENT_VERIFY,
        PERMISSIONS.SYSTEM_STATS
    ]
};

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS };
