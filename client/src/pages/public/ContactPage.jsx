import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ChevronRight,
  ShoppingCart,
  Truck,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { FaInstagram, FaFacebookF, FaWhatsapp } from "react-icons/fa";
import { usePublicSettings } from "../../hooks/usePublicSettings";
import { phoneHref, socialProfileHref, whatsappHref } from "../../utils/contactLinks";

// * Declarations
const HERO_IMAGE = "/assets/contact/contact-hero.webp";

const QUICK_LINKS = [
  { label: "Shop", to: "/shop", icon: ShoppingCart, primary: true },
  { label: "Delivery Info", to: "/delivery", icon: Truck },
  { label: "FAQ", to: "/faq", icon: HelpCircle },
  { label: "Returns", to: "/returns", icon: RotateCcw },
];

const ContactPage = () => {
  const { data: s } = usePublicSettings();

  // * Declarations
  const [heroImageAvailable, setHeroImageAvailable] = useState(true);

  const phone = s?.business_phone || "+234 800 000 0000";
  const email = s?.business_email || "orders@nriju.com";
  const address = s?.business_address || "Lagos, Nigeria";
  const hours = s?.opening_hours || "Mon - Sat, 8am - 8pm";
  const whatsapp = s?.whatsapp_number || phone;
  const instagramUrl = socialProfileHref(s?.instagram_handle, "https://instagram.com");
  const facebookUrl = socialProfileHref(s?.facebook_page, "https://facebook.com");

  const mapQuery = encodeURIComponent(address);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`;

  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="relative bg-text py-16 sm:py-20">
        {heroImageAvailable ? (
          <img
            src={HERO_IMAGE}
            alt=""
            onError={() => setHeroImageAvailable(false)}
            className="absolute inset-0 h-full w-full object-cover object-center"
            aria-hidden="true"
          />
        ) : null}
        <div
          className="absolute inset-0 bg-linear-to-t from-text/95 via-text/55 to-text/25"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-screen-2xl px-6 sm:px-8 text-center sm:py-24 lg:py-28">
          <span className="inline-block px-3 py-1 bg-primary/20 rounded-full text-xs font-semibold mb-4 tracking-wide uppercase text-on-accent">
            Get in Touch
          </span>
          <h1 className="mt-2 max-w-3xl mx-auto font-heading text-3xl font-bold leading-tight text-on-accent sm:text-5xl">
            We'd Love to Hear From You
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-on-accent/80 text-base sm:text-lg">
            Questions about an order, a bulk purchase, or just saying hello?
          </p>
        </div>
      </section>

      <section className="py-16 px-3 sm:px-4 sm:py-20">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact details */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-primary mb-4">
                Find Us
              </p>
              <h2 className="font-heading text-3xl font-bold leading-tight mb-6">
                Visit our kitchen
              </h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Visit Us</h3>
                    <p className="text-text-muted text-sm">{address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Call us</h3>
                    <a
                      href={phoneHref(phone)}
                      className="text-text-muted text-sm hover:text-primary"
                    >
                      {phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FaWhatsapp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">WhatsApp</h3>
                    <a
                      href={whatsappHref(whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted text-sm hover:text-primary"
                    >
                      {whatsapp}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Email</h3>
                    <a
                      href={`mailto:${email}`}
                      className="text-text-muted text-sm hover:text-primary"
                    >
                      {email}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Opening Hours</h3>
                    <p className="text-text-muted text-sm">{hours}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-10 h-10 rounded-full text-primary bg-surface border border-border flex items-center justify-center hover:border-primary transition-colors"
                >
                  <FaInstagram className="w-4 h-4" />
                </a>
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-10 h-10 rounded-full text-primary bg-surface border border-border flex items-center justify-center hover:border-primary transition-colors"
                >
                  <FaFacebookF className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Map */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-primary mb-4">
                Our Location
              </p>
              <h2 className="font-heading text-3xl font-bold leading-tight mb-6">
                Find us on the map
              </h2>
              <div className="relative overflow-hidden rounded-2xl border border-border">
                <iframe
                  title="Nriju location on Google Maps"
                  src={mapEmbedUrl}
                  loading="lazy"
                  className="h-80 w-full border-0"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open location in Google Maps"
                  className="absolute inset-0 flex items-end justify-center p-4"
                >
                  <span className="inline-flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-semibold text-on-accent shadow-soft transition-colors hover:bg-primary/90">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    Open in Google Maps
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-12 overflow-hidden rounded-[20px] border border-border/60 bg-surface shadow-sm">
            <div className="p-4 sm:px-5">
              <h2 className="font-heading text-lg font-semibold text-text">Quick Links</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 sm:pt-0 lg:grid-cols-4">
              {QUICK_LINKS.map(({ label, to, icon: Icon, primary }) => (
                <Link
                  key={label}
                  to={to}
                  className={`flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                    primary
                      ? "border-primary bg-primary text-on-accent hover:bg-primary/90"
                      : "border-border bg-background text-text hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ContactPage;
