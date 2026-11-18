import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Truck, FileText, RotateCcw, Save, Check } from "lucide-react";

import api from "../../services/api";
import { AdminPageHeader, StatusPill, TableSkeleton } from "../../components/admin/AdminPrimitives";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SECONDARY_BUTTON_CLASS,
} from "../../components/admin/AdminModalPrimitives";
import Dropdown from "../../components/ui/Dropdown";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { toKobo } from "../../utils/formatMoney";

const SECTIONS = [
  {
    id: "business",
    title: "Business Details",
    description: "Store identity, contact details and public-facing business information.",
    icon: Building2,
    keys: [
      { key: "business_name", label: "Business Name", type: "text" },
      { key: "business_phone", label: "Business Phone", type: "tel" },
      { key: "business_email", label: "Business Email", type: "email" },
      { key: "business_address", label: "Business Address", type: "text" },
      { key: "whatsapp_number", label: "WhatsApp number", type: "tel" },
      { key: "instagram_handle", label: "Instagram handle", type: "text" },
      { key: "facebook_page", label: "Facebook page", type: "text" },
      { key: "opening_hours", label: "Opening hours", type: "text" },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    description: "Delivery pricing and fulfilment options used across the storefront.",
    icon: Truck,
    keys: [
      { key: "delivery_fee_own", label: "Own-fleet delivery fee (₦)", type: "money" },
      { key: "delivery_fee_thirdparty", label: "Third-party delivery fee (₦)", type: "money" },
      { key: "pickup_available", label: "Pickup available", type: "boolean" },
    ],
  },
  {
    id: "policies",
    title: "Store Policies",
    description: "Customer-facing policies and legal information for the store.",
    icon: FileText,
    keys: [
      { key: "return_policy", label: "Return policy", type: "textarea" },
      { key: "privacy_policy", label: "Privacy policy", type: "textarea" },
      { key: "terms_and_conditions", label: "Terms & conditions", type: "textarea" },
    ],
  },
];

const DIRTY_STATUS_MAP = {
  dirty: {
    label: "Unsaved changes",
    className: "bg-amber-100 text-amber-700",
  },
};

const flattenSections = () => SECTIONS.flatMap((section) => section.keys);

const AdminSettingsPage = () => {
  const queryClient = useQueryClient();
  const { data: settings, isPending } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => (await api.get("/settings")).data.data,
  });

  const [values, setValues] = useState({});
  const [confirmReset, setConfirmReset] = useState(false);

  const settingsByKey = new Map((settings || []).map((setting) => [setting.key, setting.value]));

  const merged = flattenSections().map((k) => ({
    ...k,
    value: settingsByKey.has(k.key) ? settingsByKey.get(k.key) : "",
  }));

  const isDirty = merged.some(
    (k) => values[k.key] !== undefined && String(values[k.key]) !== String(k.value),
  );

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put("/settings", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      setValues({});
      toast.success("Settings saved.");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save settings.");
    },
  });

  const handleChange = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSave = (event) => {
    event.preventDefault();

    if (!isDirty || updateMutation.isPending) return;

    const payload = {};

    merged.forEach((k) => {
      const v = values[k.key] !== undefined ? values[k.key] : k.value;

      if (k.type === "boolean") {
        payload[k.key] = v === true || v === "true";
      } else if (k.type === "money") {
        payload[k.key] = v === "" || v == null ? null : toKobo(v);
      } else {
        payload[k.key] = v;
      }
    });

    updateMutation.mutate(payload);
  };

  const handleReset = () => {
    if (!isDirty) return;
    setConfirmReset(true);
  };

  const confirmResetAction = () => {
    setValues({});
    setConfirmReset(false);
  };

  const currentValue = (k) => (values[k.key] !== undefined ? values[k.key] : k.value);

  const renderField = (k) => {
    const id = `setting-${k.key}`;
    const current = currentValue(k);

    if (k.type === "textarea") {
      return (
        <textarea
          id={id}
          rows={4}
          value={current ?? ""}
          onChange={(e) => handleChange(k.key, e.target.value)}
          className={`${ADMIN_FIELD_CLASS} resize-y`}
        />
      );
    }

    if (k.type === "boolean") {
      const enabled = current === true || current === "true";

      return (
        <Dropdown
          color="surface"
          fullWidth
          menuRole="listbox"
          trigger={
            <span className="flex min-w-0 items-center justify-between gap-2 truncate text-left">
              <span>{enabled ? "Enabled" : "Disabled"}</span>
              <Check className="h-4 w-4 shrink-0 text-primary" />
            </span>
          }
        >
          <button
            type="button"
            role="option"
            aria-selected={enabled}
            onClick={() => handleChange(k.key, true)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-background-soft"
          >
            <span>Enabled</span>
            {enabled && <Check className="h-4 w-4 text-primary" />}
          </button>

          <button
            type="button"
            role="option"
            aria-selected={!enabled}
            onClick={() => handleChange(k.key, false)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-background-soft"
          >
            <span>Disabled</span>
            {!enabled && <Check className="h-4 w-4 text-primary" />}
          </button>
        </Dropdown>
      );
    }

    if (k.type === "money") {
      const displayValue = current === "" || current == null ? "" : Number(current) / 100;

      return (
        <input
          id={id}
          type="number"
          step="0.01"
          min="0"
          value={displayValue}
          onChange={(e) => handleChange(k.key, e.target.value)}
          className={ADMIN_FIELD_CLASS}
        />
      );
    }

    return (
      <input
        id={id}
        type={k.type}
        value={current ?? ""}
        onChange={(e) => handleChange(k.key, e.target.value)}
        className={ADMIN_FIELD_CLASS}
      />
    );
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Settings" subtitle="Loading application settings..." />
        <TableSkeleton rows={8} cols={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        subtitle="Manage business details, delivery fees and store policies."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isDirty && <StatusPill status="dirty" map={DIRTY_STATUS_MAP} dot />}

            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || updateMutation.isPending}
              className={ADMIN_SECONDARY_BUTTON_CLASS}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>

            <button
              type="submit"
              form="settings-form"
              disabled={!isDirty || updateMutation.isPending}
              className={ADMIN_PRIMARY_BUTTON_CLASS}
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save All"}
            </button>
          </div>
        }
      />

      <form id="settings-form" onSubmit={handleSave} className="space-y-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon;

          return (
            <section
              key={section.id}
              className="overflow-hidden rounded-[20px] border border-border/60 bg-surface shadow-sm"
            >
              <div className="flex items-start gap-3 border-b border-border/60 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-heading text-base font-semibold text-text">
                    {section.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-text-muted">{section.description}</p>
                </div>
              </div>

              <div className="divide-y divide-border/60">
                {section.keys.map((k) => {
                  const id = `setting-${k.key}`;

                  return (
                    <div key={k.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:gap-6">
                      <div className="sm:w-56 sm:shrink-0">
                        <label htmlFor={id} className={ADMIN_LABEL_CLASS}>
                          {k.label}
                        </label>
                        <span className="mt-1 block font-mono text-[11px] text-text-muted">
                          {k.key}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">{renderField(k)}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </form>

      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={confirmResetAction}
        title="Discard unsaved changes?"
        description="Your unsaved settings changes will be discarded and the saved values will be restored."
        confirmLabel="Discard changes"
        variant="destructive"
        adminStyle
      />
    </div>
  );
};

export default AdminSettingsPage;
