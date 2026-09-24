export type AppRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'PROJECT_MANAGER' | 'FIELD_ENGINEER';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: AppRole[];
  companyId: string;
}

export interface NavItem {
  label: string;
  href: string;
  description?: string;
}
