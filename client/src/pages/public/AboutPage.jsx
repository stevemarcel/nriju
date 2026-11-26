import { useState } from "react";
import { Link } from "react-router-dom";
import { ChefHat, Heart, Truck, Clock } from "lucide-react";

// * Declarations
const HERO_IMAGE = "/assets/about/about-hero.webp";
const STORY_IMAGE = "/assets/about/about-story.webp";
const CTA_IMAGE = "/assets/about/about-cta.webp";

const ABOUT_VALUES = [
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
];

const AboutPage = () => {
  // * Derived values
  const heroHeading = "Our Story";
  const heroSubheading = "Bringing Lagos to Your Table";
  const heroDescription =
    "Nriju started with one pot and a simple idea: Nigerian food should taste like it came from a home kitchen, not a factory.";

  // * Declarations
  const [storyImageAvailable, setStoryImageAvailable] = useState(true);
  const [heroImageAvailable, setHeroImageAvailable] = useState(true);
  const [ctaImageAvailable, setCtaImageAvailable] = useState(true);

  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="relative bg-text">
        <img
          src={HERO_IMAGE}
          alt=""
          onError={() => setHeroImageAvailable(false)}
          className="absolute inset-0 h-full w-full object-cover object-center"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-linear-to-t from-text/95 via-text/55 to-text/25"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-screen-2xl px-6 py-20 text-center sm:py-24 lg:py-28">
          <span className="inline-block px-3 py-1 bg-primary/20 rounded-full text-xs font-semibold mb-4 tracking-wide uppercase text-on-accent">
            {heroHeading}
          </span>
          <h1 className="mt-2 max-w-3xl mx-auto font-heading text-3xl font-bold leading-tight text-on-accent sm:text-5xl">
            {heroSubheading}
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-on-accent/80 text-base sm:text-lg">
            {heroDescription}
          </p>
        </div>
      </section>

      {/* Founding story */}
      <section className="py-16 px-3 sm:px-4 sm:py-20">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-primary mb-4">
                Our Story
              </p>
              <h2 className="font-heading text-3xl font-bold leading-tight mb-4">
                Cooked with care, delivered with pride
              </h2>
              <p className="text-text-muted leading-relaxed mb-4">
                Every dish is prepped the same day it goes out. Our stews simmer for hours, our
                swallows are pounded fresh, and our soups are made from recipes passed down through
                generations — not a packet in sight.
              </p>
              <p className="text-text-muted leading-relaxed">
                We source our ingredients locally wherever we can, and we partner with small
                producers across Lagos and beyond. When you order from Nriju, you're supporting real
                cooks and real families.
              </p>
            </div>
            <div className="relative aspect-4/3 lg:aspect-video overflow-hidden rounded-card border border-border bg-surface">
              {storyImageAvailable ? (
                <img
                  src={STORY_IMAGE}
                  alt="Freshly prepared Nigerian dishes at Nriju"
                  onError={() => setStoryImageAvailable(false)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-background-soft">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <ChefHat className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-heading text-lg font-bold text-text">
                    Fresh, Authentic, Local
                  </p>
                  <p className="mt-2 text-xs text-text-muted max-w-xs">
                    Every dish is prepped to order using traditional recipes and locally sourced
                    ingredients.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Why Nriju */}
      <section className="py-16 px-3 sm:px-4 bg-surface">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-primary mb-4">
              Why Nriju
            </p>
            <h2 className="font-heading text-3xl font-bold">Why Nriju</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ABOUT_VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="flex flex-col items-center rounded-card border border-border bg-background p-6 text-center shadow-soft"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-text-muted">{value.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="relative bg-text">
        {ctaImageAvailable ? (
          <img
            src={CTA_IMAGE}
            alt=""
            onError={() => setCtaImageAvailable(false)}
            className="absolute inset-0 h-full w-full object-cover object-center"
            aria-hidden="true"
          />
        ) : null}
        <div
          className="absolute inset-0 bg-linear-to-t from-text/95 via-text/60 to-text/40"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-screen-2xl px-6 py-20 text-center sm:py-24 lg:py-28">
          <h2 className="font-heading text-3xl font-bold leading-tight text-on-accent sm:text-4xl lg:text-5xl">
            Taste the difference
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-on-accent/85 sm:text-lg">
            Explore our menu of swallows, soups, proteins and snacks.
          </p>
          <Link
            to="/shop"
            className="mt-8 inline-flex min-h-14 items-center justify-center rounded-button bg-primary px-8 py-4 text-base font-bold text-on-accent transition-colors hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            Explore Menu
          </Link>
        </div>
      </section>
    </main>
  );
};

export default AboutPage;
