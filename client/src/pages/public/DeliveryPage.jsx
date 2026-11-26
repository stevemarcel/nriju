import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Banknote,
  CreditCard,
  Smartphone,
  Truck,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  ShoppingCart,
  HelpCircle,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { FaInstagram, FaFacebookF, FaWhatsapp } from "react-icons/fa";
import { usePublicSettings } from "../../hooks/usePublicSettings";
import { socialProfileHref, whatsappHref } from "../../utils/contactLinks";
import { formatNaira } from "../../utils/formatMoney";

const HERO_IMAGE = "/assets/delivery/delivery-hero.webp";

const QUICK_LINKS = [
  { label: "Shop", to: "/shop", icon: ShoppingCart, primary: true },
  { label: "Delivery Info", to: "/delivery", icon: Truck },
  { label: "FAQ", to: "/faq", icon: HelpCircle },
  { label: "Returns", to: "/returns", icon: RotateCcw },
];

const DELIVERY_OPTIONS = [
  {
    icon: Truck,
    title: "Own Fleet",
    desc: "Our own drivers handle cooked orders - same day, hot to your door.",
  },
  {
    icon: Package,
    title: "Third-Party",
    desc: "Shelf-stable packaged items can ship wider via our delivery partners.",
  },
  {
    icon: MapPin,
    title: "Pickup",
    desc: "Skip the delivery fee and collect your order fresh from the kitchen.",
  },
];

const PAYMENT_METHODS = [
  { icon: Banknote, label: "Cash" },
  { icon: CreditCard, label: "POS" },
  { icon: Smartphone, label: "Transfer" },
];

const SKELETON_ROWS = [1, 2, 3];

const DeliveryPage = () => {
  const { data: s, isPending } = usePublicSettings();

  // * Declarations
  const [heroImageAvailable, setHeroImageAvailable] = useState(true);

  const ownFee = s?.delivery_fee_own;
  const thirdFee = s?.delivery_fee_thirdparty;
  const deliveryFeeStep = s?.delivery_fee_increment_per_5000;
  const hours = s?.opening_hours || "Mon - Sat, 8am - 8pm";
  const whatsapp = s?.whatsapp_number || s?.business_phone || "+234 800 000 0000";

  const maxOrderKobo = s?.pay_on_delivery_max_order_kobo || 10000000;
  const canPayOnDelivery = s?.pay_on_delivery_enabled === true;

  const formatFee = (kobo) => (kobo == null || kobo === "" ? "—" : formatNaira(Number(kobo)));

  const instagramUrl = socialProfileHref(s?.instagram_handle, "https://instagram.com");
  const facebookUrl = socialProfileHref(s?.facebook_page, "https://facebook.com");

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
            Delivery
          </span>
          <h1 className="mt-2 max-w-3xl mx-auto font-heading text-3xl font-bold leading-tight text-on-accent sm:text-5xl">
            Fast, Reliable Delivery Across Lagos
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-on-accent/80 text-base sm:text-lg">
            We deliver your favorite Nigerian meals hot and straight to your door.
          </p>
        </div>
      </section>

      {/* Delivery options */}
      <section className="py-16 px-3 sm:px-4 sm:py-20">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {DELIVERY_OPTIONS.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.title}
                  className="p-6 bg-surface rounded-xl border border-border text-center"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold mb-2">{m.title}</h3>
                  <p className="text-sm text-text-muted">{m.desc}</p>
                </div>
              );
            })}
            </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Pricing */}
            <div className="bg-surface rounded-2xl border border-border p-8">
              <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2">
                <Truck className="w-6 h-6 text-primary" /> Delivery Fees
              </h2>
              {isPending ? (
                <div className="space-y-3">
                  {SKELETON_ROWS.map((i) => (
                    <div key={i} className="h-12 bg-background rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="rounded-lg bg-background p-4 text-sm leading-6 text-text-secondary">
                    Delivery is free below ₦5,000. From ₦5,000 through ₦10,000, the base fee
                    applies. Each additional ₦5,000 band adds {formatFee(deliveryFeeStep)}
                  </p>
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Own-fleet delivery</p>
                      <p className="text-xs text-text-muted">
                        Base fee, same-day cooked and packaged
                      </p>
                    </div>
                    <span className="font-heading font-bold text-text">{formatFee(ownFee)}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Third-party delivery</p>
                      <p className="text-xs text-text-muted">Base fee, packaged items only</p>
                    </div>
                    <span className="font-heading font-bold text-text">{formatFee(thirdFee)}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Pickup</p>
                      <p className="text-xs text-text-muted">Collect from our kitchen</p>
                    </div>
                    <span className="font-heading font-bold text-emerald-600">Free</span>
                  </div>
                </div>
              )}
            </div>

            {/* Service info */}
            <div className="space-y-6">
              <div className="bg-surface rounded-2xl border border-border p-8">
                <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Service Areas
                </h2>
                <p className="text-text-muted text-sm leading-relaxed mb-4">
                  We deliver across Lagos and surrounding areas. For addresses outside our coverage
                  zone, we'll notify you at checkout and offer pickup as an alternative.
                </p>
                <div className="flex items-center gap-2 text-sm text-text">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Address lookup at checkout confirms availability before you pay</span>
                </div>
              </div>

              {canPayOnDelivery && (
                <div className="bg-surface rounded-2xl border border-border p-8">
                  <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-primary" /> Pay on Delivery
                  </h2>
                  <p className="text-text-muted text-sm leading-relaxed mb-4">
                    Pay with cash, POS or transfer — your driver will confirm a one-time OTP code
                    before handing over your order. Available on orders up to{" "}
                    {formatFee(maxOrderKobo)}.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map(({ icon: MethodIcon, label }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-chip bg-accent-soft px-3 py-1 text-xs font-medium text-text"
                      >
                        <MethodIcon className="h-3.5 w-3.5 text-primary" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-surface rounded-2xl border border-border p-8">
                <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Opening Hours
                </h2>
                <p className="text-text-muted text-sm leading-relaxed">{hours}</p>
              </div>
            </div>
          </div>

          {/* Social links */}
          <div className="mt-12 flex gap-3 justify-center">
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

      {/* Quick Links */}
      <section className="py-16 px-3 sm:px-4 sm:py-20">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="overflow-hidden rounded-[20px] border border-border/60 bg-surface shadow-sm">
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

export default DeliveryPage;
