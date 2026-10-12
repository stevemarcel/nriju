import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { AdminPageHeader, TableSkeleton, EmptyState } from "../../components/admin/AdminPrimitives";
import { Save, RotateCcw } from "lucide-react";

// Every key the public settings endpoint returns — pre-seeded so the
// editor shows a field for each, even before the DB has a row for it.
const SETTINGS_KEYS = [
  { key: "business_name", label: "Business Name", type: "text" },
  { key: "business_phone", label: "Business Phone", type: "text" },
  { key: "business_email", label: "Business Email", type: "text" },
  { key: "business_address", label: "Business Address", type: "text" },
  { key: "delivery_fee_own", label: "Own-fleet delivery fee (₦)", type: "money" },
  { key: "delivery_fee_thirdparty", label: "Third-party delivery fee (₦)", type: "money" },
  { key: "pickup_available", label: "Pickup available", type: "boolean" },
  { key: "whatsapp_number", label: "WhatsApp number", type: "text" },
  { key: "instagram_handle", label: "Instagram handle", type: "text" },
  { key: "facebook_page", label: "Facebook page", type: "text" },
  { key: "opening_hours", label: "Opening hours", type: "text" },
  { key: "return_policy", label: "Return policy", type: "textarea" },
  { key: "privacy_policy", label: "Privacy policy", type: "textarea" },
  { key: "terms_and_conditions", label: "Terms & conditions", type: "textarea" },
];

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const { data: settings, isPending } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => (await api.get("/settings")).data.data,
  });

  const [values, setValues] = useState({});
  const [savedAt, setSavedAt] = useState(null);

  // Merge server data with the known key list so every field renders.
  const merged = SETTINGS_KEYS.map((k) => {
    const existing = (settings || []).find((s) => s.key === k.key);
    return { ...k, value: existing ? existing.value : "" };
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put("/settings", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      setSavedAt(new Date().toLocaleTimeString());
    },
  });

  const handleChange = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
  };

  const handleSave = () => {
    const payload = {};
    merged.forEach((k) => {
      const v = values[k.key] !== undefined ? values[k.key] : k.value;
      if (k.type === "boolean") payload[k.key] = v === true || v === "true";
      else if (k.type === "money")
        payload[k.key] = v === "" || v == null ? null : Math.round(Number(v) * 100);
      else payload[k.key] = v;
    });
    updateMutation.mutate(payload);
  };

  const handleReset = () => {
    setValues({});
    setSavedAt(null);
  };

  if (isPending) {
    return (
      <div>
        <AdminPageHeader title="Settings" subtitle="Loading application settings..." />
        <TableSkeleton rows={14} cols={3} />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Settings"
        subtitle="Business details, delivery fees, and policy text."
        action={
          <div className="flex items-center gap-2">
            {savedAt && (
              <span className="text-xs text-emerald-600 font-medium">Saved at {savedAt}</span>
            )}
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-text-muted border border-border rounded-lg hover:bg-background inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-primary text-white font-medium rounded-lg inline-flex items-center gap-2 hover:bg-primary/95 disabled:opacity-60 transition-colors"
            >
              <Save className="w-4 h-4" /> {updateMutation.isPending ? "Saving..." : "Save All"}
            </button>
          </div>
        }
      />

      <div className="bg-surface rounded-2xl border border-border divide-y divide-border">
        {merged.map((k) => {
          const current = values[k.key] !== undefined ? values[k.key] : k.value;
          return (
            <div key={k.key} className="p-5 grid sm:grid-cols-3 gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-text">{k.label}</label>
                <span className="block text-xs text-text-muted font-mono mt-0.5">{k.key}</span>
              </div>
              <div className="sm:col-span-2">
                {k.type === "textarea" ? (
                  <textarea
                    value={current ?? ""}
                    onChange={(e) => handleChange(k.key, e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm resize-y"
                  />
                ) : k.type === "boolean" ? (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={current === true || current === "true"}
                      onChange={(e) => handleChange(k.key, e.target.checked)}
                    />
                    Enabled
                  </label>
                ) : (
                  <input
                    type={k.type === "money" ? "number" : "text"}
                    step={k.type === "money" ? "0.01" : undefined}
                    value={current ?? ""}
                    onChange={(e) => handleChange(k.key, e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { AdminSettings };
