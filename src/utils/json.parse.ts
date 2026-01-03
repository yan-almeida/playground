export const SafeJSONParse = (value: any) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};
