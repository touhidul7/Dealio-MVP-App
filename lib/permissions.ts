import type { Prisma, Role, User } from '@prisma/client';

export function listingReadWhere(user: User): Prisma.ListingWhereInput {
  if (user.role === 'admin') return {};
  return {
    OR: [
      { ownerUserId: user.id },
      { assignedUserId: user.id },
      { shares: { some: { userId: user.id } } },
      { visibilityScope: 'shared' }
    ]
  };
}

export function buyerReadWhere(user: User): Prisma.BuyerWhereInput {
  if (user.role === 'admin') return {};
  return {
    OR: [
      { ownerUserId: user.id },
      { visibilityMode: 'shared' },
      { visibilityMode: 'match_only' }
    ]
  };
}

export function matchReadWhere(user: User): Prisma.MatchWhereInput {
  if (user.role === 'admin') return {};
  return {
    listing: listingReadWhere(user),
    buyer: buyerReadWhere(user)
  };
}

export function canManageSettings(role: Role) {
  return role === 'admin';
}
