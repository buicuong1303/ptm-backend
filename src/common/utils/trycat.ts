export async function trycat<T>(promise: Promise<T>) {
  try {
    const data: T = await promise;
    return [data, null];
  } catch (error) {
    return [null, error];
  }
}
