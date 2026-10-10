import { UserRole } from '../../users/schemas/user.schema';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sessionId: string;
}
