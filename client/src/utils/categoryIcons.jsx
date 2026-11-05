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
  if (n.includes("soup")) return { Icon: Soup, color: "text-text-muted" };
  if (
    n.includes("swallow") ||
    n.includes("fufu") ||
    n.includes("yam") ||
    n.includes("amala") ||
    n.includes("eba") ||
    n.includes("garri") ||
    n.includes("semo")
  )
    return { Icon: Utensils, color: "text-text-muted" };
  if (
    n.includes("protein") ||
    n.includes("beef") ||
    n.includes("chicken") ||
    n.includes("fish") ||
    n.includes("meat") ||
    n.includes("suya")
  )
    return { Icon: Drumstick, color: "text-text-muted" };
  if (
    n.includes("snack") ||
    n.includes("boli") ||
    n.includes("groundnut") ||
    n.includes("akara") ||
    n.includes("puff")
  )
    return { Icon: Croissant, color: "text-text-muted" };
  if (
    n.includes("drink") ||
    n.includes("zobo") ||
    n.includes("tea") ||
    n.includes("coffee") ||
    n.includes("malt")
  )
    return { Icon: Coffee, color: "text-text-muted" };
  if (n.includes("oil") || n.includes("fat")) return { Icon: Wine, color: "text-text-muted" };
  if (n.includes("season") || n.includes("spice") || n.includes("salt") || n.includes("pepper"))
    return { Icon: Nut, color: "text-text-muted" };
  if (n.includes("fruit") || n.includes("plantain") || n.includes("banana") || n.includes("mango"))
    return { Icon: Apple, color: "text-text-muted" };
  if (n.includes("vegetable") || n.includes("leaf") || n.includes("spinach"))
    return { Icon: Carrot, color: "text-text-muted" };
  if (n.includes("dessert") || n.includes("sweet") || n.includes("cake"))
    return { Icon: Cake, color: "text-text-muted" };
  if (n.includes("dairy") || n.includes("milk") || n.includes("yogurt"))
    return { Icon: Milk, color: "text-text-muted" };
  if (n.includes("bread") || n.includes("pie")) return { Icon: Pizza, color: "text-text-muted" };
  return { Icon: Utensils, color: "text-text-muted" };
};
