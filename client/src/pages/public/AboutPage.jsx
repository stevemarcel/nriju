import { Link } from "react-router-dom";
import { ChefHat, Heart, Truck, Clock } from "lucide-react";

const AboutPage = () => {
  return (
    <div>
      {/* Hero */}
      <section className="bg-primary text-white py-16 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-4 tracking-wide uppercase">
            Our Story
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-4">
            Bringing Lagos to Your Table
          </h1>
          <p className="text-white/80 text-lg">
            Nriju started with one pot and a simple idea: Nigerian food should taste like it came
            from a home kitchen, not a factory.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-heading text-3xl font-bold mb-4">
              Cooked with care, delivered with pride
            </h2>
            <p className="text-text-muted leading-relaxed mb-4">
              Every dish is prepped the same day it goes out. Our stews simmer for hours, our
              swallows are pounded fresh, and our soups are made from recipes passed down through
              generations — not a packet in sight.
            </p>
            <p className="text-text-muted leading-relaxed">
              We source our ingredients locally wherever we can, and we partner with small producers
              across Lagos and beyond. When you order from Nriju, you're supporting real cooks and
              real families.
            </p>
          </div>
          <div className="aspect-square bg-surface rounded-2xl border border-border flex items-center justify-center text-8xl">
            🍲
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-surface">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold">Why Nriju</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: ChefHat,
                title: "Home-Cooked Taste",
                desc: "No shortcuts, no reheated trays. Everything is cooked to order.",
              },
              {
                icon: Heart,
                title: "Family Recipes",
                desc: "Stews, soups and swallows made the way your grandmother taught us.",
              },
              {
                icon: Truck,
                title: "Same-Day Delivery",
                desc: "Hot food, delivered fast across Lagos, or ready for pickup.",
              },
              {
                icon: Clock,
                title: "Made to Order",
                desc: "We prep only what's ordered, so nothing is wasted and everything is fresh.",
              },
            ].map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="p-6 bg-background rounded-xl border border-border text-center"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold mb-2">{v.title}</h3>
                  <p className="text-sm text-text-muted">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 container mx-auto px-4 text-center max-w-2xl">
        <h2 className="font-heading text-3xl font-bold mb-3">Taste the difference</h2>
        <p className="text-text-muted mb-6">
          Explore our menu of swallows, soups, proteins and snacks.
        </p>
        <Link
          to="/shop"
          className="inline-block px-8 py-3.5 bg-primary text-white font-semibold rounded-lg hover:scale-105 transition-transform"
        >
          Explore Menu
        </Link>
      </section>
    </div>
  );
};

export default AboutPage;
