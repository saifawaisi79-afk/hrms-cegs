/**
 * DISABLED for production.
 * Demo logins must not be recreated. Use HR Onboarding to create real users,
 * or `npm run seed` for bootstrap Super Admin / HR only.
 *
 * To remove leftover demos: node scripts/clear-demo-users.js
 */
console.error('set-demo-logins is disabled. Demo accounts are not allowed in production.');
console.error('Create users via HR Onboarding, or run: npm run seed');
console.error('To wipe leftover demos: node scripts/clear-demo-users.js');
process.exit(1);
