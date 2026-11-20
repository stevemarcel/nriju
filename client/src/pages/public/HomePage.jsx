import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Headphones,
  PackageCheck,
  PlayCircle,
  ShieldCheck,
  Truck,
} from "lucide-react";
import ProductCard from "../../components/ui/ProductCard";
import api from "../../services/api";
import { getCategoryIcon } from "../../utils/categoryIcons";

const HERO_SLIDES = [
  {
    image: "/assets/hero/hero-home-01.webp",
    title: "Authentic Nigerian flavours, delivered.",
    description:
      "From local delicacies to pantry essentials, get the best of Nigerian food fresh and delivered to your doorstep.",
  },
  {
    image: "/assets/hero/hero-home-02.webp",
    title: "Everyday favourites, made for sharing.",
    description:
      "Chilled zobo, crisp plantain chips and familiar treats for every gathering and every craving.",
  },
  {
    image: "/assets/hero/hero-home-03.webp",
    title: "Nigerian pantry, all in one place.",
    description:
      "Stock your kitchen with oils, spices and seasonings selected for the meals you love.",
  },
];

const HERO_ROTATION_DELAY = 6500;

const TRUST_ITEMS = [
  {
    Icon: ShieldCheck,
    title: "100% Secure Payment",
    description: "Your transactions are safe and encrypted.",
  },
  {
    Icon: Truck,
    title: "Nationwide Delivery",
    description: "Get your food items delivered anywhere in Nigeria.",
  },
  {
    Icon: PackageCheck,
    title: "Fresh & Hygienic Packaging",
    description: "Carefully packed to keep your food fresh and safe.",
  },
  {
    Icon: Headphones,
    title: "Reliable Customer Support",
    description: "We're here to help before and after your order.",
  },
  {
    Icon: BadgeCheck,
    title: "Quality Guarantee",
    description: "Authentic Nigerian products from trusted sources.",
  },
];

const ViewAllLink = () => (
  <Link
    to="/shop"
    className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
  >
    View all
    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
  </Link>
);

const ProductShelf = ({ id, title, products }) => {
  if (!products?.length) return null;

  return (
    <section
      aria-labelledby={id}
      className="bg-background px-3 py-6 sm:px-4 sm:py-8"
    >
      <div className="mx-auto w-full max-w-screen-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 id={id} className="font-heading text-2xl font-bold">
            {title}
          </h2>
          <ViewAllLink />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.slice(0, 5).map((product, index) => (
            <div
              key={product._id}
              className={index === 4 ? "hidden h-full md:block" : "h-full"}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
};

const HeroCarousel = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const activeSlide = HERO_SLIDES[activeIndex];
  const isPaused = prefersReducedMotion || userPaused || interactionPaused;

  useEffect(() => {
    const nextSlide = HERO_SLIDES[(activeIndex + 1) % HERO_SLIDES.length];
    const image = new window.Image();
    image.src = nextSlide.image;
  }, [activeIndex]);

  useEffect(() => {
    if (isPaused) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % HERO_SLIDES.length);
    }, HERO_ROTATION_DELAY);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  const showSlide = (index) => {
    setHasInteracted(true);
    setActiveIndex((index + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const showPrevious = () => showSlide(activeIndex - 1);
  const showNext = () => showSlide(activeIndex + 1);

  return (
    <section className="px-3 pt-3 sm:px-4 sm:pt-4" aria-label="Featured offers">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Nriju featured food and pantry offers"
        onMouseEnter={() => setInteractionPaused(true)}
        onMouseLeave={() => setInteractionPaused(false)}
        onFocusCapture={() => setInteractionPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setInteractionPaused(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            showPrevious();
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            showNext();
          }
        }}
        className="relative mx-auto min-h-128 w-full max-w-screen-2xl overflow-hidden rounded-card bg-text text-on-accent lg:aspect-hero lg:min-h-0"
      >
        <img
          key={activeSlide.image}
          src={activeSlide.image}
          alt=""
          width="2172"
          height="724"
          loading={activeIndex === 0 ? "eager" : "lazy"}
          fetchPriority={activeIndex === 0 ? "high" : "auto"}
          className="absolute inset-0 h-full w-full object-cover object-center"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-linear-to-t from-text/95 via-text/45 to-text/10 sm:bg-linear-to-r sm:from-text/85 sm:via-text/30 sm:to-transparent"
          aria-hidden="true"
        />

        <div
          role="group"
          aria-roledescription="slide"
          aria-label={`${activeIndex + 1} of ${HERO_SLIDES.length}`}
          aria-live={hasInteracted ? "polite" : "off"}
          className="relative flex min-h-128 items-end px-6 pb-16 pt-8 sm:items-center sm:px-20 sm:py-16 lg:min-h-full lg:px-24 lg:py-8 xl:py-10"
        >
          <div className="max-w-3xl">
            <h1 className="max-w-2xl font-heading text-3xl font-bold leading-tight tracking-tight text-on-accent sm:text-5xl lg:text-5xl xl:text-7xl">
              {activeSlide.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-accent/85 sm:mt-5 sm:text-lg xl:text-xl">
              {activeSlide.description}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <Link
                to="/shop"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-button bg-primary px-8 py-4 font-bold text-on-accent transition-colors hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Shop now
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <a
                href="#categories"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-button border-2 border-on-accent bg-text/20 px-8 py-4 font-bold text-on-accent transition-colors hover:bg-on-accent/15 active:bg-on-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-accent"
              >
                <PlayCircle className="h-5 w-5" aria-hidden="true" />
                Explore foods
              </a>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={showPrevious}
          aria-label="Show previous banner"
          className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-primary shadow-soft transition-colors hover:bg-background-soft active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-accent sm:flex"
        >
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={showNext}
          aria-label="Show next banner"
          className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-primary shadow-soft transition-colors hover:bg-background-soft active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-accent sm:flex"
        >
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </button>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 sm:bottom-5">
          {HERO_SLIDES.map((slide, index) => (
            <button
              key={slide.image}
              type="button"
              onClick={() => showSlide(index)}
              aria-label={`Show banner ${index + 1}`}
              aria-current={activeIndex === index ? "true" : undefined}
              className={`h-3 w-3 rounded-full border border-on-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-accent focus-visible:ring-offset-2 focus-visible:ring-offset-text ${
                activeIndex === index
                  ? "bg-on-accent"
                  : "bg-on-accent/35 hover:bg-on-accent/70"
              }`}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              setHasInteracted(true);
              setUserPaused((current) => !current);
            }}
            aria-label={
              userPaused ? "Resume banner rotation" : "Pause banner rotation"
            }
            aria-pressed={userPaused}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-on-accent transition-colors hover:bg-on-accent/15 active:bg-on-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-accent"
          >
            {userPaused ? (
              <CirclePlay className="h-5 w-5" aria-hidden="true" />
            ) : (
              <CirclePause className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

const HomePage = () => {
  const { data: featured } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const res = await api.get("/products/featured");
      return res.data.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data.data;
    },
  });

  const { data: newArrivals } = useQuery({
    queryKey: ["products", "new-arrivals"],
    queryFn: async () => {
      const res = await api.get("/products", {
        params: { sort: "newest", limit: 5 },
      });
      return res.data.data;
    },
  });

  const { data: bestSellers } = useQuery({
    queryKey: ["products", "best-sellers"],
    queryFn: async () => {
      const res = await api.get("/products", {
        params: { sort: "popular", limit: 5 },
      });
      return res.data.data;
    },
  });

  return (
    <div className="bg-background">
      <HeroCarousel />

      {categories && categories.length > 0 && (
        <section
          id="categories"
          className="scroll-mt-6 bg-background px-3 py-8 sm:px-4 sm:py-10"
        >
          <div className="mx-auto w-full max-w-screen-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold">Categories</h2>
              <ViewAllLink />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
              {categories.map((category) => {
                const { Icon } = getCategoryIcon(category.name);

                return (
                  <Link
                    key={category._id}
                    to={`/shop?category=${category.slug}`}
                    className="group block overflow-hidden rounded-card border border-border transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <div className="relative aspect-4/3 bg-background-soft">
                      {category.image ? (
                        <img
                          src={category.image}
                          alt={category.name}
                          width="1200"
                          height="900"
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-primary">
                          <Icon className="h-8 w-8" aria-hidden="true" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-end bg-linear-to-t from-text/80 via-text/20 to-transparent">
                        <span className="w-full py-3 text-center text-sm font-semibold text-on-accent drop-shadow">
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section
        aria-label="Why shop with Nriju"
        className="bg-background px-3 py-5 sm:px-4 sm:py-6"
      >
        <div className="mx-auto w-full max-w-screen-2xl overflow-hidden rounded-card border border-border bg-surface shadow-soft">
          <ul className="grid grid-cols-1 divide-y divide-border lg:grid-cols-5 lg:divide-x lg:divide-y-0">
            {TRUST_ITEMS.map(({ Icon, title, description }) => (
              <li
                key={title}
                className="flex min-h-24 items-start gap-3 px-5 py-5"
              >
                <Icon
                  className="mt-0.5 h-7 w-7 shrink-0 text-primary"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-bold leading-snug text-text">
                    {title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ProductShelf
        id="featured-products"
        title="Featured Products"
        products={featured}
      />
      <ProductShelf
        id="new-arrivals"
        title="New Arrivals"
        products={newArrivals}
      />
      <ProductShelf
        id="best-sellers"
        title="Best Sellers"
        products={bestSellers}
      />

      <section className="bg-background py-16">
        <div className="container mx-auto max-w-xl px-4 text-center">
          <h2 className="mb-3 font-heading text-3xl font-bold">
            Craving something special?
          </h2>
          <p className="caption-text mb-6">
            Explore our full menu of swallows, soups, proteins, and snacks.
          </p>
          <Link
            to="/shop"
            className="inline-flex min-h-12 items-center justify-center rounded-button bg-primary px-8 py-3.5 font-semibold text-on-accent transition-colors hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Explore menu
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
