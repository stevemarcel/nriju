import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import ProductCard from "../../components/sections/ProductCard";
import { ArrowRight, Truck, Clock, ShieldCheck, Wheat, Soup, Beef } from "lucide-react";

const HERO_IMAGE = "/assets/hero/hero-home.webp";

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

  return (
    <div>
      {/* Hero — full-bleed food photo, 40% dark overlay, white text */}
      <section className="relative min-h-[70vh] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        <div className="relative container mx-auto px-4 py-20 md:py-28 text-center max-w-3xl">
          <span className="inline-block px-3 py-1 bg-accent-soft text-primary text-xs font-semibold rounded-chip mb-6 tracking-wide uppercase">
            Fresh Nigerian Food
          </span>
          <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight text-white mb-4">
            Cooked fresh daily.
          </h1>
          <p className="text-white/90 text-lg md:text-xl mb-8">True taste of home.</p>
          <p className="text-white/80 text-base md:text-lg mb-10 max-w-2xl mx-auto">
            Stews, swallows, soups and snacks — delivered hot or ready to pick up.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/shop"
              className="px-6 py-3 bg-primary text-on-accent font-semibold rounded-button hover:opacity-90 transition-opacity"
            >
              Order now
            </Link>
            <Link
              to="/about"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-button transition-colors"
            >
              Our story
            </Link>
          </div>
        </div>
      </section>

      {/* Value props — same-day prep, never reheated */}
      <section className="py-8 bg-surface border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <Clock className="w-6 h-6 text-primary" />
              <div className="text-left">
                <h4 className="font-semibold text-sm">Cooked fresh daily</h4>
                <p className="caption-text">Same-day prep, never reheated</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Truck className="w-6 h-6 text-primary" />
              <div className="text-left">
                <h4 className="font-semibold text-sm">Same-day or pickup</h4>
                <p className="caption-text">Delivered hot or ready to collect</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <div className="text-left">
                <h4 className="font-semibold text-sm">From home kitchens</h4>
                <p className="caption-text">Authentic Nigerian recipes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories — icon + name, photo as card background */}
      {categories && categories.length > 0 && (
        <section className="py-12 container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold">Categories</h2>
            <Link
              to="/shop"
              className="text-primary hover:underline text-sm font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/shop?category=${cat.slug}`}
                className="group block rounded-card border border-border overflow-hidden hover:border-primary transition-all"
              >
                <div className="aspect-4/3 bg-background relative">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🍲
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent flex items-end">
                    <span className="w-full text-center text-white text-sm font-semibold py-3 drop-shadow">
                      {cat.name}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products — customer favorites */}
      {featured && featured.length > 0 && (
        <section className="py-12 bg-surface">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading text-2xl font-bold">Popular Dishes</h2>
                <p className="caption-text">Customer favorites, cooked to perfection</p>
              </div>
              <Link
                to="/shop"
                className="text-primary hover:underline text-sm font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="font-heading text-3xl font-bold mb-3">Craving something special?</h2>
          <p className="caption-text mb-6">
            Explore our full menu of swallows, soups, proteins, and snacks.
          </p>
          <Link
            to="/shop"
            className="inline-block px-8 py-3.5 bg-primary text-on-accent font-semibold rounded-button hover:opacity-90 transition-opacity"
          >
            Explore menu
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
