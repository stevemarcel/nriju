import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Truck,
  FileText,
  RotateCcw,
  Save,
  Check,
  CircleAlert,
  Loader2,
  RefreshCw,
} from "lucide-react";

import api from "../../services/api";
import {
  AdminPageHeader,
  EmptyState,
  StatusPill,
  TableSkeleton,
} from "../../components/admin/AdminPrimitives";
import { useAdminRealtimeRefresh } from "../../hooks/useAdminRealtimeRefresh";
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
      {
        key: "business_name",
        label: "Business Name",
        type: "text",
        hint: "Displayed on the dashboard and public store pages.",
      },
      {
        key: "business_phone",
        label: "Business Phone",
        type: "tel",
        hint: "Shown on the Contact page.",
      },
      {
        key: "business_email",
        label: "Business Email",
        type: "email",
        hint: "Shown on the Contact page.",
      },
      {
        key: "business_address",
        label: "Business Address",
        type: "text",
        hint: "Shown on the Contact page.",
      },
      {
        key: "whatsapp_number",
        label: "WhatsApp number",
        type: "tel",
        hint: "Shown on the Contact page.",
      },
      {
        key: "instagram_handle",
        label: "Instagram handle",
        type: "text",
        hint: "Shown on the Contact page.",
      },
      {
        key: "facebook_page",
        label: "Facebook page",
        type: "text",
        hint: "Shown on the Contact page.",
      },
      {
        key: "opening_hours",
        label: "Opening hours",
        type: "text",
        hint: "Shown on the Contact and Delivery pages.",
      },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    description: "Delivery pricing and fulfilment options used across the storefront.",
    icon: Truck,
    keys: [
      {
        key: "delivery_fee_own",
        label: "Own-fleet delivery fee (₦)",
        type: "money",
        hint: "Charge applied to orders delivered by our own drivers.",
      },
      {
        key: "delivery_fee_thirdparty",
        label: "Third-party delivery fee (₦)",
        type: "money",
        hint: "Charge applied to orders fulfilled by an external courier.",
      },
      {
        key: "delivery_fee_increment_per_5000",
        label: "Delivery increase per ₦5,000 band (₦)",
        type: "money",
        hint: "Added for each ₦5,000 band above an order subtotal of ₦10,000.",
      },
      {
        key: "vat_rate_basis_points",
        label: "VAT rate (%)",
        type: "percentage",
        defaultValue: 750,
        hint: "Applied to the discounted merchandise subtotal in cart and checkout.",
      },
      {
        key: "pay_on_delivery_enabled",
        label: "Payment on delivery",
        type: "boolean",
        defaultValue: true,
        hint: "Allow eligible own-fleet and pickup orders to be paid at handoff.",
      },
      {
        key: "pay_on_delivery_max_order_kobo",
        label: "Payment on delivery limit (₦)",
        type: "money",
        defaultValue: 10000000,
        hint: "Orders above this total must be paid online. Set 0 for no limit.",
      },
      {
        key: "handoff_otp_expiry_minutes",
        label: "Handoff code lifetime (minutes)",
        type: "number",
        defaultValue: 240,
        hint: "How long a courier-issued handoff code remains valid.",
      },
      {
        key: "pickup_available",
        label: "Pickup available",
        type: "boolean",
        hint: "Enable or disable the pickup option on the Delivery page.",
      },
    ],
  },
  {
    id: "policies",
    title: "Store Policies",
    description: "Customer-facing policies and legal information for the store.",
    icon: FileText,
    keys: [
      {
        key: "return_policy",
        label: "Return policy",
        type: "textarea",
        hint: "Displayed on the Returns page.",
      },
      {
        key: "privacy_policy",
        label: "Privacy policy",
        type: "textarea",
        hint: "Displayed on the Privacy page.",
      },
      {
        key: "terms_and_conditions",
        label: "Terms & conditions",
        type: "textarea",
        hint: "Displayed on the Terms page.",
      },
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
const FIELDS = flattenSections();
const FIELDS_BY_KEY = new Map(FIELDS.map((field) => [field.key, field]));
const ADMIN_SETTINGS_QUERY_KEY = ["admin", "settings", "keyed-v4"];

const asBoolean = (value) => value === true || value === "true";

const valuesMatch = (field, draftValue, savedValue) => {
  if (field.type === "money") {
    if (draftValue === "" || draftValue == null) {
      return savedValue === "" || savedValue == null;
    }

    return toKobo(draftValue) === Number(savedValue);
  }

  if (field.type === "percentage") {
    if (draftValue === "" || draftValue == null) {
      return savedValue === "" || savedValue == null;
    }

    return Math.round(Number(draftValue) * 100) === Number(savedValue);
  }

  if (field.type === "boolean") {
    return asBoolean(draftValue) === asBoolean(savedValue);
  }

  return String(draftValue ?? "") === String(savedValue ?? "");
};

const normalizeSettings = (payload) => {
  const data = payload?.data?.data ?? payload?.data ?? payload;

  if (Array.isArray(data)) {
    return Object.fromEntries(
      data
        .filter((setting) => setting && typeof setting.key === "string" && "value" in setting)
        .map((setting) => [setting.key, setting.value]),
    );
  }

  if (data && typeof data === "object") {
    return data;
  }

  throw new Error("The settings response has an unexpected format.");
};

const fetchSettings = async () => {
  return normalizeSettings(await api.get("/settings"));
};

const AdminSettingsPage = () => {
  useAdminRealtimeRefresh();
  const queryClient = useQueryClient();
  const {
    data: settingsByKey = {},
    isPending,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: fetchSettings,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const [values, setValues] = useState({});
  const [confirmReset, setConfirmReset] = useState(false);

  const merged = FIELDS.map((k) => ({
    ...k,
    value: Object.hasOwn(settingsByKey, k.key) ? settingsByKey[k.key] : "",
  }));

  const isDirty = Object.entries(values).some(([key, draftValue]) => {
    const field = FIELDS_BY_KEY.get(key);
    return field && !valuesMatch(field, draftValue, settingsByKey[key]);
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put("/settings", payload),
    onSuccess: (response) => {
      const updatedSettings = normalizeSettings(response);
      queryClient.setQueryData(ADMIN_SETTINGS_QUERY_KEY, (current = {}) => ({
        ...current,
        ...updatedSettings,
      }));
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "public"] });
      setValues({});
      toast.success("Settings saved.");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save settings.");
    },
  });

  const handleChange = (key, value) => {
    const field = FIELDS_BY_KEY.get(key);

    setValues((current) => {
      if (field && valuesMatch(field, value, settingsByKey[key])) {
        const next = { ...current };
        delete next[key];
        return next;
      }

      return { ...current, [key]: value };
    });
  };

  const handleSave = (event) => {
    event.preventDefault();

    if (!isDirty || updateMutation.isPending) return;

    const payload = {};

    Object.entries(values).forEach(([key, value]) => {
      const field = FIELDS_BY_KEY.get(key);
      if (!field || valuesMatch(field, value, settingsByKey[key])) return;

      if (field.type === "boolean") {
        payload[key] = asBoolean(value);
      } else if (field.type === "money") {
        payload[key] = value === "" || value == null ? null : toKobo(value);
      } else if (field.type === "percentage") {
        payload[key] = value === "" || value == null ? null : Math.round(Number(value) * 100);
      } else if (field.type === "number") {
        payload[key] = value === "" || value == null ? null : Number(value);
      } else {
        payload[key] = value;
      }
    });

    if (Object.keys(payload).length === 0) return;
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

  const currentValue = (k) => {
    if (values[k.key] !== undefined) return values[k.key];

    const savedValue = Object.hasOwn(settingsByKey, k.key)
      ? settingsByKey[k.key]
      : (k.defaultValue ?? "");

    if (k.type === "money") {
      return savedValue === "" || savedValue == null ? "" : Number(savedValue) / 100;
    }

    if (k.type === "percentage") {
      return savedValue === "" || savedValue == null ? "" : Number(savedValue) / 100;
    }

    return savedValue;
  };

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
          color="muted"
          fullWidth
          portal
          menuRole="listbox"
          triggerClassName="min-h-10 rounded-xl border-primary/20 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
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

    if (k.type === "money" || k.type === "percentage" || k.type === "number") {
      return (
        <input
          id={id}
          type="number"
          step={k.type === "number" ? "1" : "0.01"}
          min="0"
          max={k.type === "percentage" ? "100" : undefined}
          value={current ?? ""}
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

  if (isError) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Settings"
          subtitle="Manage business details, delivery fees and store policies."
        />

        <EmptyState
          icon={<CircleAlert className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />}
          title="Settings could not be loaded"
          description="Check your connection and try loading the saved settings again."
          action={
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-busy={isFetching}
              className={`${ADMIN_PRIMARY_BUTTON_CLASS} mx-auto`}
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
              {isFetching ? "Loading settings..." : "Try again"}
            </button>
          }
        />
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
              className={`${ADMIN_SECONDARY_BUTTON_CLASS} inline-flex items-center justify-center gap-2`}
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
                          {k.hint || k.key}
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
        onCancel={() => setConfirmReset(false)}
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
