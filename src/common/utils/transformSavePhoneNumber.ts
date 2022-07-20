export function transformSavePhoneNumber(value: string) {
  //value example: +10123456789 || 0123456789
  if (value.length < 10) return value;
  const newValue = value.replace(/[^0-9+]/gi, '');
  return value.indexOf('+') === -1 ? `+1${newValue}` : newValue;
}
