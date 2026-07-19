const IST_TIME_ZONE = 'Asia/Kolkata';

export function formatDateIST(value) {
  if (!value) {
    return 'Not provided';
  }

  const date = toDate(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: IST_TIME_ZONE,
  }).format(date);
}

export function formatTimeIST(value) {
  if (!value) {
    return '';
  }

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const [hours, minutes] = value.split(':');
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: IST_TIME_ZONE,
    }).format(new Date(`2000-01-01T${hours}:${minutes}:00+05:30`));
  }

  const date = toDate(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: IST_TIME_ZONE,
  }).format(date);
}

export function formatDateTimeIST(value) {
  if (!value) {
    return 'Not provided';
  }

  const date = toDate(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: IST_TIME_ZONE,
  }).format(date);
}

export function todayInputDateIST() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: IST_TIME_ZONE,
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function toDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00+05:30`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
