export const taipeiDateTime = (value: string | Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', ...options }).format(new Date(value));

export const taipeiDateParts = (value: string | Date) => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
};

export const taipeiDateKey = (value: string | Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
