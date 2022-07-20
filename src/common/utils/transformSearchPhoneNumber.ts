export function transformSearchPhoneNumber(value: string) {
  return value.replace(/[^0-9+]/gi, '');
}
