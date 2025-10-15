export function cn(...values: Array<string | number | false | null | undefined>) {
  return values
    .flatMap((value) => {
      if (typeof value === "number") {
        return Number.isFinite(value) ? String(value) : [];
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? [trimmed] : [];
      }

      return [];
    })
    .join(" ");
}
