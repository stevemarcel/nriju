import { Link } from "react-router-dom";
import { Phone, MapPin, Clock, Instagram, Facebook } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-text text-white/90">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="font-heading text-xl font-bold">Nriju</span>
            </div>
            <p className="text-white/60 text-sm">
              Fresh Nigerian meals, soups, swallows, proteins and snacks — delivered or ready for
              pickup.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-secondary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-secondary transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=soups-stews"
                  className="hover:text-secondary transition-colors"
                >
                  Soups & Stews
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=swallows"
                  className="hover:text-secondary transition-colors"
                >
                  Swallows
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=proteins"
                  className="hover:text-secondary transition-colors"
                >
                  Proteins
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Information</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/delivery" className="hover:text-secondary transition-colors">
                  Delivery Info
                </Link>
              </li>
              <li>
                <Link to="/returns" className="hover:text-secondary transition-colors">
                  Returns
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-secondary transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-secondary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-secondary" />
                <span className="text-white/80">Lagos, Nigeria</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 text-secondary" />
                <span className="text-white/80">+234 800 000 0000</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0 text-secondary" />
                <span className="text-white/80">Mon - Sat, 8am - 8pm</span>
              </li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener"
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener"
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-white/50">
          <p>© 2026 Nriju. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
