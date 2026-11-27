import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Headset,
  HelpCircle,
  RotateCcw,
  Search,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { usePublicSettings } from "../../hooks/usePublicSettings";
import { whatsappHref } from "../../utils/contactLinks";
import { CATEGORY_META, FAQ_SECTIONS } from "../../data/faqData";

// * Declarations
const HERO_IMAGE = "/assets/faq/faq-hero.webp";

const QUICK_LINKS = [
  { label: "Shop", to: "/shop", icon: ShoppingCart, primary: true },
  { label: "Delivery Info", to: "/delivery", icon: Truck },
  { label: "FAQ", to: "/faq", icon: HelpCircle, active: true },
  { label: "Returns", to: "/returns", icon: RotateCcw },
];

const POPULAR_SEARCHES = ["Delivery", "Refunds", "Food storage"];

const SUPPORT_HOURS = "Mon – Sat, 8 AM – 8 PM";

// Flattened list with category context, used for search and the "Popular" view.
const ALL_QUESTIONS = CATEGORY_META.flatMap((cat) =>
  (FAQ_SECTIONS[cat.id] || []).map((item) => ({
    ...item,
    categoryId: cat.id,
    categoryLabel: cat.label,
  })),
);

const POPULAR_QUESTIONS = [
  "How do I place an order?",
  "Where does Nriju deliver?",
  "How long does delivery take?",
  "How should I store my products after delivery?",
  "What payment methods do you accept?",
  "What if I receive a damaged or incorrect product?",
  "How long does it take to receive a refund?",
  "Do you accept bulk orders?",
];

const FAQPage = () => {
  const { data: s } = usePublicSettings();

  // * Declarations
  const [heroImageAvailable, setHeroImageAvailable] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("popular");
  const [openKey, setOpenKey] = useState(null);

  const whatsapp = s?.whatsapp_number || s?.business_phone || "+234 903 495 1027";

  // ? Normalised search across question, answer and category label.
  const trimmedQuery = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];
    return ALL_QUESTIONS.filter(
      (item) =>
        item.q.toLowerCase().includes(trimmedQuery) ||
        item.a.toLowerCase().includes(trimmedQuery) ||
        item.categoryLabel.toLowerCase().includes(trimmedQuery),
    );
  }, [trimmedQuery]);

  // ! Search overrides category navigation; otherwise the active section is shown.
  const isSearching = trimmedQuery.length > 0;

  const activeMeta = CATEGORY_META.find((c) => c.id === activeCategory) || null;

  const visibleQuestions = isSearching
    ? searchResults
    : activeCategory === "popular"
      ? POPULAR_QUESTIONS.map((q) => ALL_QUESTIONS.find((item) => item.q === q)).filter(Boolean)
      : ALL_QUESTIONS.filter((item) => item.categoryId === activeCategory);

  const visibleHeading = isSearching
    ? `Search results`
    : activeCategory === "popular"
      ? "Popular questions"
      : activeMeta?.label || "Questions";

  const visibleCaption = isSearching
    ? `${searchResults.length} ${searchResults.length === 1 ? "result" : "results"} for "${query.trim()}"`
    : activeCategory === "popular"
      ? "Quick answers to our most common enquiries."
      : activeMeta?.label || "";

  // ? Navigation handlers
  const selectCategory = (id) => {
    setQuery("");
    setActiveCategory(id);
    setOpenKey(null);
  };

  const runPopularSearch = (term) => {
    setActiveCategory("popular");
    setQuery(term);
    setOpenKey(null);
  };

  const resetFilters = () => {
    setQuery("");
    setActiveCategory("popular");
    setOpenKey(null);
  };

  const toggleQuestion = (key) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

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
          className="absolute inset-0 bg-linear-to-t from-text/95 via-text/60 to-text/30"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-screen-2xl px-6 py-10 text-center sm:py-16 lg:py-20">
          <span className="inline-block px-3 py-1 bg-primary/20 rounded-full text-xs font-semibold mb-4 tracking-wide uppercase text-on-accent">
            Nriju Help Centre
          </span>
          <h1 className="mt-2 max-w-3xl mx-auto font-heading text-3xl font-bold leading-tight text-on-accent sm:text-5xl">
            How can we help you?
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-on-accent/80 text-base sm:text-lg">
            Everything you need to know about shopping with Nriju.
          </p>

          {/* Search */}
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="mx-auto mt-8 max-w-2xl"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a question or topic..."
                aria-label="Search frequently asked questions"
                className="h-14 w-full rounded-full border border-border bg-background pl-12 pr-12 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-base [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden appearance-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-accent-soft hover:text-text"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </form>

          {/* Popular searches */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-on-accent/70">
            <span className="font-medium">Popular:</span>
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => runPopularSearch(term)}
                className="rounded-chip border border-on-accent/25 px-3 py-1 font-medium text-on-accent transition-colors hover:border-on-accent/60 hover:bg-on-accent/10"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by topic */}
      <section className="px-3 pt-16 sm:px-4 sm:pt-20">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-primary">
              Browse by topic
            </p>
            <h2 className="mt-3 font-heading text-2xl font-bold text-text sm:text-3xl">
              Pick a category to get started
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
            {CATEGORY_META.map(({ id, label, icon: Icon }) => {
              const isActive = activeCategory === id && !isSearching;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectCategory(id)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-3 rounded-card border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                    isActive
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-surface text-text hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isActive ? "bg-primary text-on-accent" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 text-sm font-semibold leading-snug">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ content */}
      <section className="px-3 pt-10 pb-16 sm:px-4 sm:py-20">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            {/* Sidebar navigation (desktop) */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 overflow-hidden rounded-card border border-border bg-surface p-3">
                <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  All topics
                </p>
                <nav className="flex flex-col gap-1" aria-label="FAQ categories">
                  <button
                    type="button"
                    onClick={() => selectCategory("popular")}
                    aria-current={activeCategory === "popular" && !isSearching ? "true" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                      activeCategory === "popular" && !isSearching
                        ? "bg-primary/10 text-primary"
                        : "text-text-secondary hover:bg-accent-soft hover:text-text"
                    }`}
                  >
                    <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Popular questions
                  </button>
                  {CATEGORY_META.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectCategory(id)}
                      aria-current={activeCategory === id && !isSearching ? "true" : undefined}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                        activeCategory === id && !isSearching
                          ? "bg-primary/10 text-primary"
                          : "text-text-secondary hover:bg-accent-soft hover:text-text"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Questions panel */}
            <div>
              {/* Panel header */}
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-text">{visibleHeading}</h2>
                  <p className="mt-1 text-sm text-text-muted">{visibleCaption}</p>
                </div>
                {isSearching || activeCategory !== "popular" ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="shrink-0 text-xs font-semibold text-primary transition-colors hover:underline"
                  >
                    Reset
                  </button>
                ) : null}
              </div>

              {/* Accordion list */}
              {visibleQuestions.length === 0 ? (
                <div className="rounded-card border border-border bg-surface p-10 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Search className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-text">
                    No matching questions
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
                    We couldn't find an answer for "{query.trim()}". Try a different term or browse
                    the topics above — our team is also happy to help directly.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-primary/90"
                    >
                      Clear search
                    </button>
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-2 rounded-button border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      Contact us
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleQuestions.map((item) => {
                    const key = `${item.categoryId}:${item.q}`;
                    const isOpen = openKey === key;
                    return (
                      <div
                        key={key}
                        className={`overflow-hidden rounded-xl border bg-surface transition-all ${
                          isOpen ? "border-primary/30 shadow-sm" : "border-border"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleQuestion(key)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                        >
                          <span className="min-w-0">
                            {isSearching ? (
                              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary">
                                {item.categoryLabel}
                              </span>
                            ) : null}
                            <span className="font-medium text-text">{item.q}</span>
                          </span>
                          {isOpen ? (
                            <ChevronDown
                              className="h-5 w-5 shrink-0 rotate-180 text-primary transition-transform"
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronDown
                              className="h-5 w-5 shrink-0 text-text-muted transition-transform"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                        {isOpen ? (
                          <div className="px-5 pb-5 text-sm leading-relaxed text-text-secondary">
                            {item.a}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Support card */}
      <section className="px-3 pb-16 sm:px-4 sm:pb-20">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="overflow-hidden rounded-card border border-border bg-surface p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Headset className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-text sm:text-3xl">
              Still need a hand?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted sm:text-base">
              Our team is here to help you with your questions.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-button bg-primary px-6 py-3 text-sm font-semibold text-on-accent transition-colors hover:bg-primary/90"
              >
                Contact Us
              </Link>
              <a
                href={whatsappHref(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-button border border-border px-6 py-3 text-sm font-semibold text-text transition-colors hover:border-primary/30 hover:text-primary"
              >
                <FaWhatsapp className="h-4 w-4" aria-hidden="true" />
                Chat on WhatsApp
              </a>
            </div>
            <p className="mt-4 text-xs text-text-muted">{SUPPORT_HOURS}</p>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="px-3 pb-16 sm:px-4 sm:pb-20">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="overflow-hidden rounded-[20px] border border-border/60 bg-surface shadow-sm">
            <div className="p-4 sm:px-5">
              <h2 className="font-heading text-lg font-semibold text-text">Quick Links</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 sm:pt-0 lg:grid-cols-4">
              {QUICK_LINKS.map(({ label, to, icon: Icon, primary, active }) => (
                <Link
                  key={label}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                    primary
                      ? "border-primary bg-primary text-on-accent hover:bg-primary/90"
                      : active
                        ? "border-primary/40 bg-primary/5 text-primary"
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

export default FAQPage;
