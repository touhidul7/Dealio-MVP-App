import type { Role } from '@prisma/client';

export type AppShellUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
};

