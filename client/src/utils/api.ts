/**
 * Strip undefined, null, and empty strings from a params object before handing it to axios.
 * This prevents axios from serializing them as literal strings (e.g. "undefined")
 * and keeps exactOptionalPropertyTypes happy.
 */
export const cleanParams = (obj: Record<string, unknown> | undefined): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (!obj) return out;
  
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') {
      out[k] = v;
    }
  }
  
  return out;
};
