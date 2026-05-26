import { UserRole } from '../types/invoice';

const WRITE_ROLES: UserRole[] = ['Admin', 'Financial_Director', 'Billing_Clerk'];
const FISCAL_MANAGER_ROLES: UserRole[] = ['Admin', 'Financial_Director'];

export function canWriteCatalog(role?: UserRole): boolean {
  return Boolean(role && WRITE_ROLES.includes(role));
}

export function canDeleteCatalog(role?: UserRole): boolean {
  return Boolean(role && FISCAL_MANAGER_ROLES.includes(role));
}
