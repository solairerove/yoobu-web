export function normalizeBookingStatus(status: string): string {
  return status.trim().replace(/-/g, '_').toUpperCase();
}
