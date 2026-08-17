export const field = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

export const optional = (form: FormData, key: string): string | null => {
  const value = field(form, key);
  return value === "" ? null : value;
};

export const backTo = (
  path: string,
  params: Record<string, string>,
): string => {
  const query = new URLSearchParams(params).toString();
  return query === "" ? path : `${path}?${query}`;
};
