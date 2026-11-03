import {
  Utensils,
  Soup,
  Drumstick,
  Croissant,
  Coffee,
  Wine,
  Nut,
  Apple,
  Carrot,
  Cake,
  Milk,
  Pizza,
} from "lucide-react";

export const getCategoryIcon = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("soup")) return <Soup className="w-4 h-4 text-text-muted" />;
  if (
    n.includes("swallow") ||
    n.includes("fufu") ||
    n.includes("yam") ||
    n.includes("amala") ||
    n.includes("eba") ||
    n.includes("garri") ||
    n.includes("semo")
  )
    return <Utensils className="w-4 h-4 text-text-muted" />;
  if (
    n.includes("protein") ||
    n.includes("beef") ||
    n.includes("chicken") ||
    n.includes("fish") ||
    n.includes("meat") ||
    n.includes("suya")
  )
    return <Drumstick className="w-4 h-4 text-text-muted" />;
  if (
    n.includes("snack") ||
    n.includes("boli") ||
    n.includes("groundnut") ||
    n.includes("akara") ||
    n.includes("puff")
  )
    return <Croissant className="w-4 h-4 text-text-muted" />;
  if (
    n.includes("drink") ||
    n.includes("zobo") ||
    n.includes("tea") ||
    n.includes("coffee") ||
    n.includes("malt")
  )
    return <Coffee className="w-4 h-4 text-text-muted" />;
  if (n.includes("oil") || n.includes("fat")) return <Wine className="w-4 h-4 text-text-muted" />;
  if (n.includes("season") || n.includes("spice") || n.includes("salt") || n.includes("pepper"))
    return <Nut className="w-4 h-4 text-text-muted" />;
  if (n.includes("fruit") || n.includes("plantain") || n.includes("banana") || n.includes("mango"))
    return <Apple className="w-4 h-4 text-text-muted" />;
  if (n.includes("vegetable") || n.includes("leaf") || n.includes("spinach"))
    return <Carrot className="w-4 h-4 text-text-muted" />;
  if (n.includes("dessert") || n.includes("sweet") || n.includes("cake"))
    return <Cake className="w-4 h-4 text-text-muted" />;
  if (n.includes("dairy") || n.includes("milk") || n.includes("yogurt"))
    return <Milk className="w-4 h-4 text-text-muted" />;
  if (n.includes("bread") || n.includes("pie"))
    return <Pizza className="w-4 h-4 text-text-muted" />;
  return <Utensils className="w-4 h-4 text-text-muted" />;
};
