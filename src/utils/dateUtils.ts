/**
 * Utilities for safe date parsing and formatting across Omnix.
 * Prevents RangeError: Invalid time value exceptions.
 */

export function safeParseDate(input: any): Date | null {
  if (input === null || input === undefined || input === '') return null;

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  // Firestore Timestamp object (.toDate())
  if (typeof input?.toDate === 'function') {
    try {
      const d = input.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch (_) {}
  }

  // Firestore Timestamp JSON { seconds, nanoseconds } or { _seconds, _nanoseconds }
  if (typeof input === 'object' && input !== null) {
    if (typeof input.seconds === 'number') {
      const d = new Date(input.seconds * 1000);
      if (!isNaN(d.getTime())) return d;
    }
    if (typeof input._seconds === 'number') {
      const d = new Date(input._seconds * 1000);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Epoch number or numeric string
  if (typeof input === 'number') {
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const d = new Date(parseInt(trimmed, 10));
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export function safeToDate(input: any): Date {
  return safeParseDate(input) || new Date();
}

export function formatTimeSafely(
  input: any,
  options?: Intl.DateTimeFormatOptions,
  fallback = 'Data indisponível'
): string {
  const d = safeParseDate(input);
  if (!d) return fallback;
  try {
    return d.toLocaleTimeString('pt-BR', options || { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return fallback;
  }
}

export function formatDateSafely(
  input: any,
  options?: Intl.DateTimeFormatOptions,
  fallback = 'Data indisponível'
): string {
  const d = safeParseDate(input);
  if (!d) return fallback;
  try {
    return d.toLocaleDateString('pt-BR', options || { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (_) {
    return fallback;
  }
}

export function formatDateTimeSafely(
  input: any,
  options?: Intl.DateTimeFormatOptions,
  fallback = 'Data indisponível'
): string {
  const d = safeParseDate(input);
  if (!d) return fallback;
  try {
    return d.toLocaleString('pt-BR', options || { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return fallback;
  }
}

export function safeToISOString(input: any): string {
  const d = safeParseDate(input);
  if (!d) return new Date().toISOString();
  try {
    return d.toISOString();
  } catch (_) {
    return new Date().toISOString();
  }
}
