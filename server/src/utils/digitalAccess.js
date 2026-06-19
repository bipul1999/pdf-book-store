const DEFAULT_DIGITAL_ACCESS_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
export const LIFETIME_DIGITAL_ACCESS_EXPIRES_AT = new Date("9999-12-31T23:59:59.999Z");

export const VERIFIED_DIGITAL_ORDER_STATUSES = ["success", "confirmed", "completed"];

export function isVerifiedDigitalOrder(order) {
  return order?.orderType !== "manual_book" && VERIFIED_DIGITAL_ORDER_STATUSES.includes(order?.status);
}

export function digitalAccessExpiry(order, item) {
  if (item?.accessExpiresAt) return new Date(item.accessExpiresAt);
  if (isVerifiedDigitalOrder(order)) return LIFETIME_DIGITAL_ACCESS_EXPIRES_AT;
  return new Date(order.updatedAt.getTime() + DEFAULT_DIGITAL_ACCESS_DAYS * DAY_MS);
}

export function initializeDigitalAccess(order) {
  if (order?.orderType === "manual_book") return;
  const expiresAt = new Date(Date.now() + DEFAULT_DIGITAL_ACCESS_DAYS * DAY_MS);
  order.items.forEach((item) => {
    if (!item.accessExpiresAt) item.accessExpiresAt = expiresAt;
  });
}
