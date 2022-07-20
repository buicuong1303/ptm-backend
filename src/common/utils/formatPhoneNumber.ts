export function formatPhoneNumber(value: string) {
  value = value?.toString().trim();

  if (!value || value?.length < 10) return value;
  const plainPhone = value.replace(/[^0-9]/g, '');
  let standardPhone: any =
    plainPhone.length === 10 ? `+1${plainPhone}` : `+${plainPhone}`;
  let result = '';
  let temp = '';
  const patternA = '(###) ###-####';
  const patternB = '+#(###) ###-####';
  if (standardPhone.includes('+1')) temp = patternA;
  else temp = patternB;
  if (temp.includes('+')) {
    for (const index in standardPhone) {
      const indexReplace = temp.indexOf('#');
      if (Number.isInteger(+standardPhone[index])) {
        temp = temp.replace('#', standardPhone[index]);
        if (indexReplace > -1) result = temp.slice(0, indexReplace + 1);
      }
    }
  } else {
    standardPhone = standardPhone.slice(2);
    for (const index in standardPhone) {
      const indexReplace = temp.indexOf('#');
      if (Number.isInteger(+standardPhone[index])) {
        temp = temp.replace('#', standardPhone[index]);
        if (indexReplace > -1) result = temp.slice(0, indexReplace + 1);
      }
    }
  }
  return result;
}
