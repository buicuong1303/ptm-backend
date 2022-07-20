export function convertQueriesValue(queries: any) {
  for (const [key, value] of Object.entries(queries)) {
    if (
      value === null ||
      value === 'null' ||
      value === undefined ||
      value === 'undefined'
    )
      queries[key] = null;
    else queries[key] = value;
  }
  return queries;
}
