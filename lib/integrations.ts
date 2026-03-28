import { prisma } from '@/lib/prisma';

export const SETTINGS_ID = 'singleton';

export async function getIntegrationSettings() {
  return prisma.integrationSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID },
    update: {}
  });
}
