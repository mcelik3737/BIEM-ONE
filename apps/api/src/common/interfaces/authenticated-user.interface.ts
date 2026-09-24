import { AppRole } from '../enums/app-role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  companyId: string;
  roles: AppRole[];
}
