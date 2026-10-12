import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqs = [
  {
    q: "How do I place an order?",
    a: "Browse the menu on the Shop page, add items to your cart, and proceed to checkout. You'll need an account (or a guest checkout) and a working email for order updates.",
  },
  {
    q: "Do I need an account to order?",
    a: "No. You can check out as a guest, but creating an account lets you track your orders, save addresses, and get loyalty benefits.",
  },
  {
    q: "How long does delivery take?",
    a: "Cooked items are delivered same-day via our own fleet. Packaged items typically arrive within 3–4 working days. You can also choose free pickup for any order.",
  },
  {
    q: "What are the delivery areas?",
    a: "We deliver across Lagos and surrounding areas. If your address is outside our service zone, we'll let you know at checkout and offer pickup instead.",
  },
  {
    q: "How do I pay?",
    a: "We accept card payments through Paystack (Visa, Mastercard, Verve) and cash on delivery for pickup orders.",
  },
  {
    q: "Can I cancel or modify an order after placing it?",
    a: "Once an order is placed and payment is confirmed, we can cancel it before dispatch. Modifications depend on how far along preparation is — contact us as soon as you need to change something.",
  },
  {
    q: "What if my food arrives cold or wrong?",
    a: "We take freshness seriously. If your order arrives cold, incomplete, or incorrect, contact us within 30 minutes of delivery and we'll remake it or refund you.",
  },
  {
    q: "Do you offer catering or bulk orders?",
    a: "Yes. For events, office lunches, or large gatherings, email us at orders@nriju.com and we'll build a custom menu and quote.",
  },
];

const FAQPage = () => {
  const [open, setOpen] = useState(null);

  return (
    <div>
      <section className="bg-primary text-white py-16 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-4 tracking-wide uppercase">
            Help Center
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-white/80 text-lg">
            Everything you need to know about ordering from Nriju.
          </p>
        </div>
      </section>

      <section className="py-16 container mx-auto px-4 max-w-3xl">
        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                className={`rounded-xl border border-border bg-surface overflow-hidden transition-all ${
                  isOpen ? "shadow-sm" : ""
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-medium text-text">{f.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-text-muted shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-text-muted leading-relaxed">{f.a}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center bg-surface rounded-2xl border border-border p-8">
          <h3 className="font-heading text-xl font-bold mb-2">Still have a question?</h3>
          <p className="text-text-muted text-sm mb-6">
            Our team is here to help — drop us a line anytime.
          </p>
          <a
            href="mailto:orders@nriju.com"
            className="inline-block px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/95 transition-colors"
          >
            Email Us
          </a>
        </div>
      </section>
    </div>
  );
};

export { FAQPage };
