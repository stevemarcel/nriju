// Server-side slugify — single source of truth for clean URLs
// Strips punctuation, normalizes spaces, trims hyphens
const slugify = (str) => {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // strip punctuation
    .replace(/[\s_-]+/g, "-") // spaces/underscores → single hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
};

export default slugify;
