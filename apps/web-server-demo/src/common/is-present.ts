/** GraphQL sends an omitted optional field as `undefined` or `null`; both mean "not provided". */
export function isPresent<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}
