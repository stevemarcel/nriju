import { useQuery } from "@tanstack/react-query";
import api from "../services/api";

// Public settings (delivery fees, business info, policy text) are the same
// for every visitor, so cache them at the QueryClient level rather than
// refetching on every page.
export const usePublicSettings = () => {
  return useQuery({
    queryKey: ["settings", "public"],
    queryFn: async () => {
      const res = await api.get("/settings/public");
      return res.data.data || {};
    },
  });
};

export default usePublicSettings;
