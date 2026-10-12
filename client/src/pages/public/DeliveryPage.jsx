import { Truck, MapPin, Clock, Package, CheckCircle } from "lucide-react";
import { usePublicSettings } from "../../hooks/usePublicSettings";

const DeliveryPage = () => {
  const { data: s, isPending } = usePublicSettings();

  const ownFee = s?.delivery_fee_own;
  const thirdFee = s?.delivery_fee_thirdparty;
  const pickupAvailable = s?.pickup_available !== "false";
  const hours = s?.opening_hours || "Mon - Sat, 8am - 8pm";

  const formatFee = (kobo) => {
    if (kobo == null || kobo === "") return null;
    const n = Number(kobo) / 100;
    return `₦${n.toLocaleString("en-NG")}`;
  };

  return (
    <div>
      <section className="bg-primary text-white py-16 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-4 tracking-wide uppercase">
            Get It There
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-4">
            Delivery & Pickup
          </h1>
          <p className="text-white/80 text-lg">How we get your food to you, hot and on time.</p>
        </div>
      </section>

      <section className="py-16 container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: Truck,
              title: "Own Fleet",
              desc: "Our own drivers handle cooked orders — same day, hot to your door.",
            },
            {
              icon: Package,
              title: "Third-Party",
              desc: "Shelf-stable packaged items can ship wider via our delivery partners.",
            },
            {
              icon: MapPin,
              title: "Pickup",
              desc: "Skip the delivery fee and collect your order fresh from the kitchen.",
            },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="p-6 bg-surface rounded-xl border border-border text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold mb-2">{m.title}</h3>
                <p className="text-sm text-text-muted">{m.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Pricing */}
          <div className="bg-surface rounded-2xl border border-border p-8">
            <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Delivery Fees
            </h2>
            {isPending ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-background rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Own-fleet delivery</p>
                    <p className="text-xs text-text-muted">Same-day, cooked & packaged</p>
                  </div>
                  <span className="font-heading font-bold text-text">
                    {formatFee(ownFee) || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Third-party delivery</p>
                    <p className="text-xs text-text-muted">Packaged items only</p>
                  </div>
                  <span className="font-heading font-bold text-text">
                    {formatFee(thirdFee) || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Pickup</p>
                    <p className="text-xs text-text-muted">Collect from our kitchen</p>
                  </div>
                  <span className="font-heading font-bold text-emerald-600">Free</span>
                </div>
              </div>
            )}
          </div>

          {/* Service info */}
          <div className="space-y-6">
            <div className="bg-surface rounded-2xl border border-border p-8">
              <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Service Areas
              </h2>
              <p className="text-text-muted text-sm leading-relaxed mb-4">
                We deliver across Lagos and surrounding areas. For addresses outside our coverage
                zone, we'll notify you at checkout and offer pickup as an alternative.
              </p>
              <div className="flex items-center gap-2 text-sm text-text">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Address lookup at checkout confirms availability before you pay</span>
              </div>
            </div>

            <div className="bg-surface rounded-2xl border border-border p-8">
              <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Opening Hours
              </h2>
              <p className="text-text-muted text-sm leading-relaxed">{hours}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export { DeliveryPage };
