// Format a date into a compact, human-readable string.
// Used by admin tables (Joined / Created / Expiry columns) and detail pages.
export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export default formatDate;
