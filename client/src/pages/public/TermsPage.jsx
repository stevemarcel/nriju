import { Gavel, FileText, ShoppingBag, Truck, Shield } from "lucide-react";
import { usePublicSettings } from "../../hooks/usePublicSettings";

const TermsPage = () => {
  const { data: s, isPending } = usePublicSettings();
  const terms = s?.terms_and_conditions;

  return (
    <div>
      <section className="bg-primary text-white py-16 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-4 tracking-wide uppercase">
            Legal
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-4">
            Terms & Conditions
          </h1>
          <p className="text-white/80 text-lg">The rules that govern your use of Nriju.</p>
        </div>
      </section>

      <section className="py-16 container mx-auto px-4 max-w-3xl">
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: ShoppingBag,
              title: "By using Nriju",
              desc: "You accept these terms and our privacy policy.",
            },
            {
              icon: Truck,
              title: "Orders",
              desc: "All sales are final except where our returns policy applies.",
            },
            {
              icon: Shield,
              title: "Account",
              desc: "You're responsible for keeping your account details secure.",
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
          <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Terms of Service
          </h2>
          {isPending ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-4 bg-background rounded animate-pulse" />
              ))}
            </div>
          ) : terms ? (
            <div className="text-text-muted text-sm leading-relaxed whitespace-pre-line">
              {terms}
            </div>
          ) : (
            <div className="text-text-muted text-sm leading-relaxed space-y-6">
              <div>
                <h3 className="font-heading font-semibold text-text mb-2">1. Acceptance</h3>
                <p>
                  By accessing or placing an order through Nriju, you agree to be bound by these
                  Terms and Conditions and our Privacy Policy.
                </p>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-text mb-2">2. Orders</h3>
                <p>
                  All orders are subject to availability. We reserve the right to refuse or cancel
                  any order at our discretion, including where an item is out of stock or pricing is
                  incorrect.
                </p>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-text mb-2">3. Pricing & Payment</h3>
                <p>
                  Prices are quoted in Nigerian Naira and include VAT where applicable. Payment is
                  due at the time of order. We accept card payments through Paystack and cash on
                  pickup.
                </p>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-text mb-2">4. Delivery</h3>
                <p>
                  Delivery times are estimates and not guaranteed. Risk in the goods passes to you
                  on delivery or pickup, as applicable.
                </p>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-text mb-2">5. Account Security</h3>
                <p>
                  You are responsible for maintaining the confidentiality of your account
                  credentials and for all activity under your account.
                </p>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-text mb-2">
                  6. Limitation of Liability
                </h3>
                <p>
                  Nriju's liability is limited to the value of the goods purchased. We are not
                  liable for indirect or consequential losses.
                </p>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-text mb-2">7. Governing Law</h3>
                <p>
                  These terms are governed by the laws of the Federal Republic of Nigeria. Any
                  dispute shall be resolved in the courts of Lagos.
                </p>
              </div>
              <p className="text-xs text-text-muted pt-4 border-t border-border">
                Last updated: October 2026.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm text-text-muted">
          <Gavel className="w-4 h-4 text-primary" />
          Questions about these terms? Email{" "}
          <a href="mailto:legal@nriju.com" className="text-primary hover:underline ml-1">
            legal@nriju.com
          </a>
        </div>
      </section>
    </div>
  );
};

export default TermsPage;
