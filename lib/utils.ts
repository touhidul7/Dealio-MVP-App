export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function parseJsonArray(value?: string | null): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

export function normalizePhone(phone?: string | null) {
  return phone ? phone.replace(/\D/g, '') : null;
}

export function normalizeCompany(company?: string | null) {
  return company
    ?.toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|limited)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim() || null;
}
