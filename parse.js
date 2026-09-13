const fs = require('fs');
const sql = fs.readFileSync('newmhdb.sql', 'utf8');

// extract roles
const rolesMatch = sql.match(/INSERT INTO `roles` VALUES (.*);/);
const roles = [];
if (rolesMatch) {
    const rRegex = /_binary '(.*?)','([^']+)','([^']*)',(\d+)/g;
    let m;
    while ((m = rRegex.exec(rolesMatch[1])) !== null) {
        roles.push({ id: m[1], name: m[2] });
    }
}

// extract permissions
const permsMatch = sql.match(/INSERT INTO `permissions` VALUES (.*);/);
const permissions = [];
if (permsMatch) {
    const pRegex = /_binary '(.*?)','([^']+)','([^']*)'/g;
    let m;
    while ((m = pRegex.exec(permsMatch[1])) !== null) {
        permissions.push({ id: m[1], name: m[2] });
    }
}

// extract role_permissions
const rpMatch = sql.match(/INSERT INTO `role_permissions` VALUES (.*);/);
const rolePerms = [];
if (rpMatch) {
    const rpRegex = /\(_binary '(.*?)',_binary '(.*?)'\)/g;
    let m;
    while ((m = rpRegex.exec(rpMatch[1])) !== null) {
        rolePerms.push({ role_id: m[1], perm_id: m[2] });
    }
}

roles.forEach(role => {
    const rPerms = rolePerms.filter(rp => rp.role_id === role.id).map(rp => rp.perm_id);
    const permNames = permissions.filter(p => rPerms.includes(p.id)).map(p => p.name);
    console.log('Role:', role.name);
    console.log('Permissions:', permNames.join(', '));
    console.log('---');
});
