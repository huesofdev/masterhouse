/**
 * Helper utilities to ensure date calculations use the business timezone (default: Asia/Colombo)
 * regardless of the server's OS timezone (e.g., UTC on AWS / Linux / DigitalOcean).
 */

export function getTodayStr(timeZone = 'Asia/Colombo'): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone });
}

export function formatDateStr(dateInput: Date | string, timeZone = 'Asia/Colombo'): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput.split('T')[0] : '';
  return d.toLocaleDateString('sv-SE', { timeZone });
}
