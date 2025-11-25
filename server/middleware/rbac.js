const { ROLE_PERMISSIONS } = require('../config/permissions');

const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        // req.user is populated by JWT middleware (which should run before this)
        const userRole = req.user?.role;

        if (!userRole) {
            return res.status(403).json({ error: 'Access denied: No role assigned' });
        }

        const userPermissions = ROLE_PERMISSIONS[userRole] || [];

        if (userPermissions.includes(requiredPermission)) {
            next();
        } else {
            res.status(403).json({ error: `Access denied: Missing permission ${requiredPermission}` });
        }
    };
};

module.exports = { checkPermission };
