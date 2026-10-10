import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import ProductCard from "../../components/sections/ProductCard";
import { ArrowRight, Truck, Clock, ShieldCheck } from "lucide-react";

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
      {/* Hero */}
      <section className="bg-primary text-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-4 tracking-wide uppercase">
            Fresh Nigerian Food
          </span>
          <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight mb-4">
            Authentic Taste, Cooked Fresh Daily.
          </h1>
          <p className="text-white/80 text-lg md:text-xl mb-8">
            From slow-cooked stews and pounded yam to seasoned snacks and chilled drinks —
            delivered hot to your door or ready for pickup.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/shop"
              className="px-6 py-3 bg-secondary text-text font-semibold rounded-lg hover:scale-105 transition-transform"
            >
              Order Now
            </Link>
            <Link
              to="/about"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="py-8 bg-surface border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <Clock className="w-6 h-6 text-primary" />
              <div className="text-left">
                <h4 className="font-semibold text-sm">Cooked Fresh Daily</h4>
                <p className="text-xs text-text-muted">Same-day prep, never reheated</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Truck className="w-6 h-6 text-primary" />
              <div className="text-left">
                <h4 className="font-semibold text-sm">Fast Delivery</h4>
                <p className="text-xs text-text-muted">Same-day or pickup available</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <div className="text-left">
                <h4 className="font-semibold text-sm">Quality Guaranteed</h4>
                <p className="text-xs text-text-muted">Authentic Nigerian recipes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="py-12 container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold">Categories</h2>
            <Link to="/shop" className="text-primary hover:underline text-sm font-medium flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/shop?category=${cat.slug}`}
                className="group block p-4 bg-surface rounded-lg border border-border text-center hover:border-primary transition-colors"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-background flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <span className="text-xl">🍲</span>
                </div>
                <h3 className="font-medium text-sm text-text group-hover:text-primary transition-colors">
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featured && featured.length > 0 && (
        <section className="py-12 bg-surface">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading text-2xl font-bold">Popular Dishes</h2>
                <p className="text-text-muted text-sm">Customer favorites, cooked to perfection</p>
              </div>
              <Link to="/shop" className="text-primary hover:underline text-sm font-medium flex items-center gap-1">
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
          <h2 className="font-heading text-3xl font-bold mb-3">Craving Something Special?</h2>
          <p className="text-text-muted mb-6">
            Explore our full menu of swallows, soups, proteins, and snacks.
          </p>
          <Link
            to="/shop"
            className="inline-block px-8 py-3.5 bg-primary text-white font-semibold rounded-lg hover:scale-105 transition-transform"
          >
            Explore Menu
          </Link>
        </div>
      </section>
    </div>
  );
};

export { HomePage };
