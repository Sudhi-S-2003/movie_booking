/**
 * Drop keys whose value is `undefined`. Needed with
 * `exactOptionalPropertyTypes`, where `{ a: undefined }` is not a valid
 * optional property, e.g. when spreading parsed (zod) input into a model.
 */
export type Defined<T> = { [K in keyof T]: Exclude<T[K], undefined> };

export const definedOnly = <T extends object>(obj: T): Partial<Defined<T>> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<Defined<T>>;
