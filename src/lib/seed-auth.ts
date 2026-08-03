/**
 * Local/demo seed users — used only when ALLOW_SEED_AUTH=true
 * or NODE_ENV !== 'production'. Tokens are still signed with JWT_SECRET from env
 * (never a hardcoded secret).
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

export const SEED_AUTH_USERS: SeedAuthUser[] = [
  {
    id: 'seed_1',
    employee_id: 'EMP-001',
    name: 'CEO SuperAdmin',
    email: 'superadmin@cegs.com',
    role: 'super_admin',
    department_id: '1',
    designation: 'Chief Executive Officer',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ceo',
    password: 'Password123',
  },
  {
    id: 'seed_2',
    employee_id: 'EMP-002',
    name: 'Nusrath Hussain',
    email: 'nusrath@cegs.com',
    role: 'admin',
    department_id: '2',
    designation: 'HR Manager',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nusrath',
    password: 'Password123',
  },
  {
    id: 'seed_3',
    employee_id: 'DEV-001',
    name: 'Saif Awaisi',
    email: 'saifawaisi79@gmail.com',
    role: 'super_admin',
    department_id: '1',
    designation: 'Developer & System Architect',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=saif',
    password: 'Password123',
  },
  {
    id: 'seed_4',
    employee_id: 'EMP-004',
    name: 'Mohammed Raheel',
    email: 'raheel@careerglobalexpertsolution.com',
    role: 'employee',
    department_id: '3',
    designation: 'Billing Specialist',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=raheel',
    password: 'Raheel@3211',
  },
  {
    id: 'seed_5',
    employee_id: 'EMP-005',
    name: 'Madiha Mehak',
    email: 'madiha@cegs.com',
    role: 'employee',
    department_id: '2',
    designation: 'Recruiter',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=madiha',
    password: 'Password123',
  },
];

const MASTER_PASSES = new Set(['Password123', 'admin123', 'emp123']);

export function isSeedAuthEnabled(): boolean {
  if (process.env.ALLOW_SEED_AUTH === 'true') return true;
  if (process.env.ALLOW_SEED_AUTH === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export function findSeedUser(email: string, password: string): SeedAuthUser | null {
  if (!isSeedAuthEnabled()) return null;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();
  const user = SEED_AUTH_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) return null;
  if (cleanPass === user.password || MASTER_PASSES.has(cleanPass)) return user;
  return null;
}
