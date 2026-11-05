// Always 12-hour clock with AM/PM ("6:00 PM"), whatever the device's locale is set to.
export function timeParts(date: Date | string) {
  const d = new Date(date);
  const h = d.getHours();
  return { time: `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`, period: h < 12 ? 'AM' : 'PM' };
}

export function formatTime(date: Date | string) {
  const { time, period } = timeParts(date);
  return `${time} ${period}`;
}
