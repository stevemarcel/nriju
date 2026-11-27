import { useState } from "react";
import { Link } from "react-router-dom";
import {
  RefreshCw,
  Clock,
  CheckCircle,
  Phone,
  Mail,
  ShoppingCart,
  Truck,
  HelpCircle,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { FaInstagram, FaFacebookF, FaWhatsapp } from "react-icons/fa";
import { usePublicSettings } from "../../hooks/usePublicSettings";
import { phoneHref, socialProfileHref, whatsappHref } from "../../utils/contactLinks";

// * Declarations
const HERO_IMAGE = "/assets/returns/returns-hero.webp";

const QUICK_LINKS = [
  { label: "Shop", to: "/shop", icon: ShoppingCart, primary: true },
  { label: "Delivery Info", to: "/delivery", icon: Truck },
  { label: "FAQ", to: "/faq", icon: HelpCircle },
  { label: "Returns", to: "/returns", icon: RotateCcw },
];

const FEATURES = [
  {
    icon: Clock,
    title: "30-Min Window",
    desc: "Report issues within 30 minutes of delivery for a remake or refund.",
  },
  {
    icon: RefreshCw,
    title: "Freshness Guarantee",
    desc: "Cold, wrong, or incomplete orders are remade or refunded - no questions.",
  },
  {
    icon: CheckCircle,
    title: "Easy Process",
    desc: "Contact us, we handle the rest. No return shipping on us for valid claims.",
  },
];

const ReturnsPage = () => {
  const { data: s, isPending } = usePublicSettings();

  // * Declarations
  const [heroImageAvailable, setHeroImageAvailable] = useState(true);

  const phone = s?.business_phone || "+234 800 000 0000";
  const email = s?.business_email || "orders@nriju.com";
  const whatsapp = s?.whatsapp_number || phone;

  const instagramUrl = socialProfileHref(s?.instagram_handle, "https://instagram.com");
  const facebookUrl = socialProfileHref(s?.facebook_page, "https://facebook.com");

  const policy = s?.return_policy;

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
            Returns
          </span>
          <h1 className="mt-2 max-w-3xl mx-auto font-heading text-3xl font-bold leading-tight text-on-accent sm:text-5xl">
            Returns & Refunds
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-on-accent/80 text-base sm:text-lg">
            We want you happy with every order. Here's how returns work.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-3 sm:px-4 sm:py-20">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            {FEATURES.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  className="p-6 bg-surface rounded-xl border border-border text-center"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold mb-2">{c.title}</h3>
                  <p className="text-sm text-text-muted">{c.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Return Policy */}
          <div className="bg-surface rounded-2xl border border-border p-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Return Policy</h2>
            {isPending ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-4 bg-background rounded animate-pulse" />
                ))}
              </div>
            ) : policy ? (
              <div className="text-text-muted text-sm leading-relaxed whitespace-pre-line">
                {policy}
              </div>
            ) : (
              <p className="text-text-muted text-sm leading-relaxed">
                Contact us within 30 minutes of delivery if anything is wrong with your order. For
                cooked items we remake or refund; for packaged items we process refunds on a
                case-by-case basis. We do not accept returns on opened or consumed food.
              </p>
            )}

            <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row gap-4">
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-sm text-text-muted hover:text-primary"
              >
                <Mail className="w-4 h-4" /> {email}
              </a>
              <a
                href={phoneHref(phone)}
                className="flex items-center gap-2 text-sm text-text-muted hover:text-primary"
              >
                <Phone className="w-4 h-4" /> {phone}
              </a>
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

      {/* Social Links */}
      <section className="py-16 px-3 sm:px-4 sm:py-20">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="flex gap-3 justify-center">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:border-primary transition-colors"
            >
              <FaInstagram className="w-4 h-4" />
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:border-primary transition-colors"
            >
              <FaFacebookF className="w-4 h-4" />
            </a>
            <a
              href={whatsappHref(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:border-primary transition-colors"
            >
              <FaWhatsapp className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ReturnsPage;
