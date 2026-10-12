import { Shield, Eye, Lock, UserX, Mail } from "lucide-react";
import { usePublicSettings } from "../../hooks/usePublicSettings";

const PrivacyPage = () => {
  const { data: s, isPending } = usePublicSettings();
  const policy = s?.privacy_policy;

  return (
    <div>
      <section className="bg-primary text-white py-16 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-4 tracking-wide uppercase">
            Privacy
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-white/80 text-lg">
            How we handle your data — and how you can control it.
          </p>
        </div>
      </section>

      <section className="py-16 container mx-auto px-4 max-w-3xl">
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: Shield,
              title: "No selling data",
              desc: "We never sell your personal information to third parties.",
            },
            {
              icon: Lock,
              title: "Encrypted",
              desc: "Passwords are hashed; payments are tokenised. Your data is protected in transit and at rest.",
            },
            {
              icon: UserX,
              title: "You control it",
              desc: "Update or delete your account and data at any time from your profile.",
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
            <Eye className="w-5 h-5 text-primary" /> What We Collect
          </h2>
          <ul className="space-y-3 text-sm text-text-muted mb-8">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>
                <strong className="text-text">Account details</strong> — name, email, phone number,
                and hashed password.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>
                <strong className="text-text">Shipping addresses</strong> — so we can deliver your
                order to the right place.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>
                <strong className="text-text">Order history</strong> — to track orders, process
                payments, and send updates.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>
                <strong className="text-text">Payment tokens</strong> — Paystack handles card data;
                we only store the reference and status.
              </span>
            </li>
          </ul>

          <h2 className="font-heading text-2xl font-bold mb-4">How We Use Your Data</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-8">
            We use your information to fulfil orders, communicate with you about your purchases,
            personalise your experience, and keep our service secure. We do not use it for marketing
            without your consent, and we do not share it beyond what's required to deliver your
            food.
          </p>

          <h2 className="font-heading text-2xl font-bold mb-4">Your Rights</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-8">
            You can request a copy of the data we hold about you, ask us to correct it, or request
            its deletion. To exercise any of these rights, email us at privacy@nriju.com.
          </p>

          <div className="pt-6 border-t border-border">
            {isPending ? (
              <div className="h-20 bg-background rounded-lg animate-pulse" />
            ) : policy ? (
              <div className="text-text-muted text-sm leading-relaxed whitespace-pre-line">
                {policy}
              </div>
            ) : (
              <p className="text-text-muted text-sm leading-relaxed">
                Last updated: October 2026. This policy describes how Nriju collects, uses, and
                protects your personal information. We comply with Nigerian data protection
                requirements and industry best practice.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm text-text-muted">
          <Mail className="w-4 h-4 text-primary" />
          Privacy questions? Email{" "}
          <a href="mailto:privacy@nriju.com" className="text-primary hover:underline ml-1">
            privacy@nriju.com
          </a>
        </div>
      </section>
    </div>
  );
};

export { PrivacyPage };
