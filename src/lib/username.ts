export const USERNAME_RULE_MESSAGE =
  "Use 3-20 caracteres: letras, números, . ou _";
export const PENDING_USERNAME_KEY = "sync.pendingUsername";

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function isValidUsername(value: string) {
  return /^[a-z0-9_.]{3,20}$/.test(value);
}
