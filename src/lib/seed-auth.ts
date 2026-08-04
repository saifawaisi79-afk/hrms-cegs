/**
 * Legacy in-memory seed login is DISABLED for production-style auth.
 * Users must exist in MongoDB (created via `npm run seed` or HR Onboarding).
 */

export type SeedAuthUser = {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  department_id: string | null;
  designation: string;
  avatar_url: string;
  password: string;
};

/** Kept empty — do not authenticate via hardcoded demo passwords. */
export const SEED_AUTH_USERS: SeedAuthUser[] = [];

export function isSeedAuthEnabled(): boolean {
  return false;
}

export function findSeedUser(_email: string, _password: string): SeedAuthUser | null {
  return null;
}
