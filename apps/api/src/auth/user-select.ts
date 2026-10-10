import { Prisma } from '@prisma/client';

/** Public shape of a user returned by the API. */
export const userSelect = {
  id: true,
  phone: true,
  name: true,
  role: true,
  language: true,
  village: true,
  district: true,
  state: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;
