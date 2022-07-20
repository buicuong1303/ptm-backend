export function compareString(string1: string, string2: string, asc = true) {
  if (string1 > string2) return asc;
  else if (string1 < string2) return !asc;
  else return 'equal';
}
