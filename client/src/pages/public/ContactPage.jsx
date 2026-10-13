import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, MessageCircle } from "lucide-react";
import { usePublicSettings } from "../../hooks/usePublicSettings";

const ContactPage = () => {
  const { data: s } = usePublicSettings();

  const phone = s?.business_phone || "+234 800 000 0000";
  const email = s?.business_email || "orders@nriju.com";
  const address = s?.business_address || "Lagos, Nigeria";
  const hours = s?.opening_hours || "Mon - Sat, 8am - 8pm";
  const whatsapp = s?.whatsapp_number || phone;

  return (
    <div>
      <section className="bg-primary text-white py-16 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-4 tracking-wide uppercase">
            Get in Touch
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-4">
            We'd Love to Hear From You
          </h1>
          <p className="text-white/80 text-lg">
            Questions about an order, a bulk purchase, or just saying hello?
          </p>
        </div>
      </section>

      <section className="py-16 container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact details */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-6">Find Us</h2>
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
                  <h3 className="font-semibold text-sm">Call or WhatsApp</h3>
                  <a href={`tel:${phone}`} className="text-text-muted text-sm hover:text-primary">
                    {phone}
                  </a>
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener"
                    className="block text-xs text-primary font-medium"
                  >
                    Chat on WhatsApp
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
                href="https://instagram.com"
                target="_blank"
                rel="noopener"
                className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:border-primary transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener"
                className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:border-primary transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener"
                className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:border-primary transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Map placeholder + quick links */}
          <div>
            <div className="aspect-square bg-surface rounded-2xl border border-border flex items-center justify-center mb-6">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-primary mx-auto mb-2" />
                <p className="text-text-muted text-sm">Lagos, Nigeria</p>
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="font-heading font-semibold mb-4">Quick Links</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { to: "/shop", label: "Shop" },
                  { to: "/delivery", label: "Delivery Info" },
                  { to: "/faq", label: "FAQ" },
                  { to: "/returns", label: "Returns" },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="px-4 py-2.5 bg-background rounded-lg text-sm text-text hover:text-primary transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
