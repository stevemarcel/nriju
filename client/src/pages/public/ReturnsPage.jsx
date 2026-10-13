import { RefreshCw, Clock, CheckCircle, Phone, Mail } from "lucide-react";
import { usePublicSettings } from "../../hooks/usePublicSettings";

const ReturnsPage = () => {
  const { data: s, isPending } = usePublicSettings();
  const policy = s?.return_policy;

  return (
    <div>
      <section className="bg-primary text-white py-16 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-4 tracking-wide uppercase">
            Returns
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-4">
            Returns & Refunds
          </h1>
          <p className="text-white/80 text-lg">
            We want you happy with every order. Here's how returns work.
          </p>
        </div>
      </section>

      <section className="py-16 container mx-auto px-4 max-w-3xl">
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: Clock,
              title: "30-Min Window",
              desc: "Report issues within 30 minutes of delivery for a remake or refund.",
            },
            {
              icon: RefreshCw,
              title: "Freshness Guarantee",
              desc: "Cold, wrong, or incomplete orders are remade or refunded — no questions.",
            },
            {
              icon: CheckCircle,
              title: "Easy Process",
              desc: "Contact us, we handle the rest. No return shipping on us for valid claims.",
            },
          ].map((c) => {
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
              href="mailto:orders@nriju.com"
              className="flex items-center gap-2 text-sm text-text-muted hover:text-primary"
            >
              <Mail className="w-4 h-4" /> orders@nriju.com
            </a>
            <a
              href="tel:+2348000000000"
              className="flex items-center gap-2 text-sm text-text-muted hover:text-primary"
            >
              <Phone className="w-4 h-4" /> +234 800 000 0000
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReturnsPage;
