const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

export const phoneHref = (value) => {
  const raw = String(value || "").trim();
  const digits = digitsOnly(raw);

  return `tel:${raw.startsWith("+") ? "+" : ""}${digits}`;
};

export const whatsappHref = (value) => `https://wa.me/${digitsOnly(value)}`;

export const socialProfileHref = (value, baseUrl) => {
  const profile = String(value || "").trim();

  if (/^https?:\/\//i.test(profile)) return profile;

  const handle = profile.replace(/^@/, "").replace(/^\/+|\/+$/g, "");
  return handle ? `${baseUrl}/${handle}` : baseUrl;
};
