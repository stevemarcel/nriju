import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import {
  AdminPageHeader,
  TableSkeleton,
  EmptyState,
  StatusPill,
  formatDate,
} from "../../components/admin/AdminPrimitives";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import Dropdown from "../../components/ui/Dropdown";
import CropAvatar from "../../components/ui/CropAvatar";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle,
  Edit3,
  Home,
  Loader2,
  Mail,
  Map,
  MapPin,
  MapPinned,
  Phone,
  Plus,
  Save,
  Shield,
  ShieldCheck,
  Star,
  Trash2,
  User,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

const ROLE_MAP = {
  superAdmin: {
    label: "Super Admin",
    cls: "bg-amber-100 text-amber-800",
    icon: <ShieldCheck className="w-3 h-3" />,
  },
  admin: {
    label: "Admin",
    cls: "bg-blue-100 text-blue-700",
    icon: <Shield className="w-3 h-3" />,
  },
  customer: {
    label: "Customer",
    cls: "bg-slate-100 text-slate-700",
    icon: <User className="w-3 h-3" />,
  },
};

const ACTIVE_STATUS_MAP = {
  true: {
    label: "Active",
    cls: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  false: {
    label: "Inactive",
    cls: "bg-slate-100 text-slate-600",
    dotColor: "bg-slate-500",
  },
};

const VERIFIED_STATUS_MAP = {
  true: {
    label: "Verified",
    cls: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  false: {
    label: "Unverified",
    cls: "bg-rose-100 text-rose-700",
    dotColor: "bg-rose-500",
  },
};

const ADDRESS_LABELS = {
  home: { label: "Home", Icon: Home },
  work: { label: "Work", Icon: Building2 },
  other: { label: "Other", Icon: MapPin },
};

// Super Admin promotion is intentionally not offered here because this page
// does not have the current administrator's permission context. Enforce all
// role changes, especially Super Admin changes, in the backend as well.
const ROLE_OPTIONS = [
  { value: "customer", label: "Customer", icon: User },
  { value: "admin", label: "Admin", icon: Shield },
];

const createClientId = () => {
  const id = globalThis.crypto?.randomUUID?.();
  return id ? `address-${id}` : `address-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createEmptyAddress = (isDefault = false) => ({
  clientId: createClientId(),
  label: "home",
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  isDefault,
});

const normalizeAddress = (address) => ({
  ...address,
  clientId: address.clientId || (address._id ? `address-${address._id}` : createClientId()),
  label: address.label || "home",
  name: address.name || "",
  phone: address.phone || "",
  line1: address.line1 || "",
  line2: address.line2 || "",
  city: address.city || "",
  state: address.state || "",
  isDefault: Boolean(address.isDefault),
});

const createFormState = (user) => ({
  name: user?.name || "",
  email: user?.email || "",
  phone: user?.phone || "",
  role: user?.role || "customer",
  isActive: user?.isActive ?? true,
  isVerified: user?.isVerified ?? false,
  addresses: Array.isArray(user?.addresses) ? user.addresses.map(normalizeAddress) : [],
});

const toApiAddresses = (addresses) => addresses.map(({ clientId, ...address }) => address);

const getAddressSummary = (address) =>
  [address.line1, address.line2, address.city, address.state].filter(Boolean).join(", ");

const validateAddress = (address) => {
  const errors = {};
  const requiredFields = ["name", "phone", "line1", "city", "state"];

  requiredFields.forEach((field) => {
    if (!String(address[field] || "").trim()) {
      errors[field] = "This field is required.";
    }
  });

  return errors;
};

// These components live outside the page so their component identities stay
// stable across parent renders (preventing inputs from losing focus).

const UserProfileField = ({
  label,
  name,
  value,
  onChange,
  icon: Icon,
  type = "text",
  required = true,
  disabled = false,
  placeholder,
  autoComplete,
}) => {
  const generatedId = useId();
  const inputId = `profile-field-${generatedId}`;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text">
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          />
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          required={required}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={onChange}
          className={`w-full rounded-lg border border-border bg-background py-2.5 pr-3 text-sm transition-colors placeholder:text-text-muted/70 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
            Icon ? "pl-10" : "pl-3"
          }`}
        />
      </div>
    </div>
  );
};

const UserProfileToggle = ({ label, checked, onChange, onIcon, offIcon, disabled = false }) => {
  const generatedId = useId();
  const labelId = `profile-toggle-${generatedId}`;

  return (
    <div className="flex items-center justify-between gap-3">
      <span id={labelId} className="text-sm font-medium text-text">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-labelledby={labelId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        >
          {checked ? onIcon : offIcon}
        </span>
      </button>
    </div>
  );
};

const UserMeta = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
    <div className="mt-1">{value}</div>
  </div>
);

const AddressEditor = ({
  draft,
  errors,
  disabled = false,
  onChange,
  onSave,
  onCancel,
  onDelete,
}) => {
  const generatedId = useId();
  const idFor = (field) => `address-${generatedId}-${field}`;

  const fields = [
    {
      name: "name",
      label: "Recipient name",
      icon: User,
      placeholder: "Full name",
      required: true,
    },
    {
      name: "phone",
      label: "Phone",
      icon: Phone,
      type: "tel",
      placeholder: "Phone number",
      required: true,
    },
    {
      name: "line1",
      label: "Street address",
      icon: MapPin,
      placeholder: "House number and street",
      required: true,
    },
    {
      name: "line2",
      label: "Address line 2",
      icon: MapPinned,
      placeholder: "Apartment, suite, landmark (optional)",
      required: false,
    },
    {
      name: "city",
      label: "City",
      icon: Building2,
      placeholder: "City",
      required: true,
    },
    {
      name: "state",
      label: "State",
      icon: Map,
      placeholder: "State",
      required: true,
    },
  ];

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-medium text-text">
          {draft.isNew ? "New shipping address" : "Edit shipping address"}
        </h3>
        {draft.address.isDefault && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
            <Star className="h-3 w-3" /> Default address
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <span className="mb-1 block text-xs font-medium text-text">Address label</span>
          <div className="flex gap-1">
            {Object.entries(ADDRESS_LABELS).map(([key, { label, Icon }]) => (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onChange("label", key)}
                aria-pressed={draft.address.label === key}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  draft.address.label === key
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-text-muted hover:bg-background-soft"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {fields.map(({ name, label, icon: Icon, type = "text", placeholder, required }) => {
          const inputId = idFor(name);
          const errorId = `${inputId}-error`;

          return (
            <div key={name}>
              <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-text">
                {label}
                {!required && <span className="ml-1 font-normal text-text-muted">(optional)</span>}
              </label>

              <div className="relative">
                <Icon
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                />

                <input
                  id={inputId}
                  type={type}
                  value={draft.address[name] || ""}
                  placeholder={placeholder}
                  disabled={disabled}
                  required={required}
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={errors[name] ? errorId : undefined}
                  onChange={(event) => onChange(name, event.target.value)}
                  className={`w-full rounded-lg border bg-background py-2.5 pl-10 pr-3 text-sm placeholder:text-text-muted/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    errors[name]
                      ? "border-rose-400 focus:border-rose-500"
                      : "border-border focus:border-primary"
                  }`}
                />
              </div>

              {errors[name] && (
                <p id={errorId} className="mt-1 text-xs text-rose-600">
                  {errors[name]}
                </p>
              )}
            </div>
          );
        })}

        <div className="flex items-center justify-between gap-3 md:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={Boolean(draft.address.isDefault)}
              disabled={disabled}
              onChange={(event) => onChange("isDefault", event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed"
            />
            Set as default shipping address
          </label>

          <div className="flex items-center gap-2">
            {!draft.isNew && onDelete && (
              <button
                type="button"
                disabled={disabled}
                onClick={onDelete}
                aria-label="Remove this shipping address"
                title="Remove address"
                className="rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={onCancel}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Save address
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminUserDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const detailQueryKey = ["admin", "user", id];

  const [form, setForm] = useState(() => createFormState(null));
  const initialFormRef = useRef(createFormState(null));
  const hydratedUserIdRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [addressDraft, setAddressDraft] = useState(null);
  const [addressErrors, setAddressErrors] = useState({});
  const [confirmTarget, setConfirmTarget] = useState(null);

  const { data, isPending, isError, error } = useQuery({
    queryKey: detailQueryKey,
    queryFn: async () => (await api.get(`/admin/users/${id}`)).data,
    enabled: Boolean(id),
  });

  const user = data?.data;
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
  const hasUnsavedChanges = isDirty || Boolean(addressDraft);
  const isProtectedSuperAdmin = user?.role === "superAdmin";

  // Hydrate once per user ID. A background refetch of the same user must not
  // replace a profile draft that the administrator is currently editing.
  useEffect(() => {
    if (!user || hydratedUserIdRef.current === id) return;

    const initialForm = createFormState(user);
    setForm(initialForm);
    initialFormRef.current = initialForm;
    setAddressDraft(null);
    setAddressErrors({});
    setConfirmTarget(null);
    hydratedUserIdRef.current = id;
  }, [user, id]);

  // Warn before refreshing, closing the tab, or leaving the document while
  // profile/address changes are still unsaved.
  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleRequestLeave = () => {
    if (saving) return;

    if (
      hasUnsavedChanges &&
      !window.confirm("You have unsaved changes. Leave this page and discard them?")
    ) {
      return;
    }

    navigate("/admin/users");
  };

  // ── Profile fields ─────────────────────────────────────────────
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelect = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  // ── Address draft workflow ─────────────────────────────────────
  const startAddress = (address) => {
    if (addressDraft || saving) return;

    setAddressDraft({
      clientId: address.clientId,
      isNew: false,
      address: { ...address },
    });
    setAddressErrors({});
  };

  const newAddress = () => {
    if (addressDraft || saving) return;

    setAddressDraft({
      clientId: null,
      isNew: true,
      address: createEmptyAddress(form.addresses.length === 0),
    });
    setAddressErrors({});
  };

  const cancelAddressDraft = () => {
    setAddressDraft(null);
    setAddressErrors({});
  };

  const addressDraftChange = (field, value) => {
    setAddressDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        address: { ...current.address, [field]: value },
      };
    });

    setAddressErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const saveAddressDraft = () => {
    if (!addressDraft) return;

    const errors = validateAddress(addressDraft.address);
    if (Object.keys(errors).length) {
      setAddressErrors(errors);
      return;
    }

    setForm((current) => {
      const addressToSave = {
        ...addressDraft.address,
        // The first saved address becomes the default automatically.
        isDefault: current.addresses.length === 0 || Boolean(addressDraft.address.isDefault),
      };

      let addresses = addressDraft.isNew
        ? [...current.addresses, addressToSave]
        : current.addresses.map((address) =>
            address.clientId === addressDraft.clientId ? addressToSave : address,
          );

      // Only one address can be the default at a time.
      if (addressToSave.isDefault) {
        addresses = addresses.map((address) => ({
          ...address,
          isDefault: address.clientId === addressToSave.clientId,
        }));
      }

      return { ...current, addresses };
    });

    setAddressDraft(null);
    setAddressErrors({});
  };

  const handleRemoveAddress = (address) => {
    if (saving) return;
    setConfirmTarget({
      clientId: address.clientId,
      name: address.name || "this address",
      summary: getAddressSummary(address),
    });
  };

  const confirmRemoveAddress = () => {
    if (!confirmTarget) return;

    setForm((current) => {
      const removedAddress = current.addresses.find(
        (address) => address.clientId === confirmTarget.clientId,
      );
      let addresses = current.addresses.filter(
        (address) => address.clientId !== confirmTarget.clientId,
      );

      // Keep a default selected when the removed address was the default.
      if (removedAddress?.isDefault && addresses.length > 0) {
        addresses = addresses.map((address, index) => ({
          ...address,
          isDefault: index === 0,
        }));
      }

      return { ...current, addresses };
    });

    if (addressDraft?.clientId === confirmTarget.clientId) {
      setAddressDraft(null);
      setAddressErrors({});
    }

    setConfirmTarget(null);
  };

  // ── Save profile ───────────────────────────────────────────────
  const handleSave = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (addressDraft) {
      toast.error("Save or cancel the address you're editing before saving the profile.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      isActive: form.isActive,
      isVerified: form.isVerified,
      addresses: toApiAddresses(form.addresses),
    };

    setSaving(true);

    try {
      const response = await api.patch(`/admin/users/${id}`, payload);
      const returnedUser = response.data?.data || {};
      const savedUser = { ...user, ...payload, ...returnedUser };
      const savedForm = createFormState(savedUser);

      // Update the detail cache immediately so the header and metadata match
      // the saved form without waiting for another network request.
      queryClient.setQueryData(detailQueryKey, (old) => ({
        ...(old || {}),
        ...(response.data || {}),
        data: savedUser,
      }));

      // Update any already-cached user lists, then refresh them in the
      // background (role changes may affect which filtered list contains them).
      queryClient.setQueriesData({ queryKey: ["admin", "users"] }, (old) => {
        if (!old || !Array.isArray(old.data)) return old;

        return {
          ...old,
          data: old.data.map((cachedUser) =>
            cachedUser._id === id ? { ...cachedUser, ...savedUser } : cachedUser,
          ),
        };
      });

      setForm(savedForm);
      initialFormRef.current = savedForm;
      toast.success("User profile updated.");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // ── Avatar ────────────────────────────────────────────────────
  const handleAvatarSourceLoad = async () =>
    (await api.get(`/admin/users/${id}/avatar/source`, { responseType: "blob" })).data;

  const handleAvatarUpload = async (file) => {
    setAvatarUploading(true);
    setAvatarError("");

    try {
      const formData = new FormData();
      formData.append("avatar", file, file.name || "avatar.webp");
      await api.post(`/admin/users/${id}/avatar`, formData);

      await queryClient.invalidateQueries({ queryKey: detailQueryKey });
      toast.success("Profile photo updated.");
      return true;
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to upload profile photo.";
      setAvatarError(message);
      toast.error(message);
      return false;
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarDeleting(true);
    setAvatarError("");

    try {
      await api.delete(`/admin/users/${id}/avatar`);
      await queryClient.invalidateQueries({ queryKey: detailQueryKey });
      toast.success("Profile photo deleted.");
      return true;
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete profile photo.";
      setAvatarError(message);
      toast.error(message);
      return false;
    } finally {
      setAvatarDeleting(false);
    }
  };

  if (isPending) {
    return (
      <div className="p-4 sm:p-6">
        <AdminPageHeader title="User Profile" subtitle="Loading user details…" />
        <TableSkeleton rows={8} cols={4} />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="p-4 sm:p-6">
        <AdminPageHeader title="User Profile" subtitle="Could not load this user." />
        <EmptyState
          icon={<User className="mx-auto h-10 w-10 text-text-muted" />}
          title="User not found"
          description={
            error?.response?.data?.message || "The user you are looking for does not exist."
          }
          action={
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to users
            </button>
          }
        />
      </div>
    );
  }

  const avatarSrc = user.avatar || "";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleRequestLeave}
          disabled={saving}
          className="rounded-lg p-2 transition-colors hover:bg-background-soft disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Back to users"
        >
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </button>
        <div className="min-w-0 flex-1">
          <AdminPageHeader
            title={form.name || user.name}
            subtitle={
              <span className="flex flex-wrap items-center gap-2">
                <StatusPill status={form.role} map={ROLE_MAP} />
                <span className="text-text-muted">·</span>
                <StatusPill status={String(form.isActive)} map={ACTIVE_STATUS_MAP} dot />
                {isDirty && (
                  <span className="text-xs font-medium text-amber-600">Unsaved changes</span>
                )}
              </span>
            }
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Identity and profile ─────────────────────────────── */}
        <section className="rounded-[20px] border border-border/60 bg-surface p-4 shadow-sm sm:p-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <div className="flex flex-col items-center gap-2">
              <CropAvatar
                key={avatarSrc || "no-avatar"}
                initialSrc={avatarSrc}
                name={user.name}
                onLoadSource={handleAvatarSourceLoad}
                onCropped={handleAvatarUpload}
                onDeleted={handleAvatarDelete}
                isSaving={avatarUploading}
                isDeleting={avatarDeleting}
                error={avatarError}
                onClearError={() => setAvatarError("")}
              />
              <span className="text-xs text-text-muted">Click to crop and upload</span>
            </div>

            <div className="grid w-full flex-1 grid-cols-1 gap-4 md:grid-cols-2">
              <UserProfileField
                label="Full name"
                name="name"
                icon={User}
                placeholder="Full name"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                disabled={saving}
              />

              <UserProfileField
                label="Email"
                name="email"
                icon={Mail}
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                disabled={saving}
              />

              <UserProfileField
                label="Phone"
                name="phone"
                icon={Phone}
                type="tel"
                placeholder="Phone number"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                disabled={saving}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text">Role</label>
                {isProtectedSuperAdmin ? (
                  <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-muted">
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                    {ROLE_MAP[user.role]?.label || user.role}
                  </div>
                ) : (
                  <div className={saving ? "pointer-events-none opacity-60" : ""}>
                    <Dropdown
                      trigger={
                        <span className="flex w-full items-center gap-2">
                          {(() => {
                            const Icon =
                              ROLE_OPTIONS.find((option) => option.value === form.role)?.icon ||
                              User;
                            return <Icon className="h-4 w-4 text-text-muted" />;
                          })()}
                          <span className="flex-1 text-left">
                            {ROLE_OPTIONS.find((option) => option.value === form.role)?.label ||
                              ROLE_MAP[form.role]?.label ||
                              "Select role"}
                          </span>
                        </span>
                      }
                      color="muted"
                      noBorder
                      fullWidth
                      menuClassName="w-full"
                    >
                      {ROLE_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelect("role", option.value)}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-background ${
                              form.role === option.value
                                ? "bg-primary/5 font-semibold text-primary"
                                : "text-text"
                            }`}
                          >
                            <Icon className="h-4 w-4 text-text-muted" />
                            <span className="flex-1">{option.label}</span>
                            {form.role === option.value && <Check className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })}
                    </Dropdown>
                  </div>
                )}
                {isProtectedSuperAdmin && (
                  <p className="mt-1 text-xs text-text-muted">
                    Super Admin role changes are restricted to a separately authorised workflow.
                  </p>
                )}
              </div>

              <UserProfileToggle
                label="Account active"
                checked={form.isActive}
                onChange={(checked) => handleSelect("isActive", checked)}
                onIcon={<UserCheck className="h-4 w-4 text-emerald-600" />}
                offIcon={<UserX className="h-4 w-4 text-rose-600" />}
                disabled={saving}
              />
              <UserProfileToggle
                label="Email verified"
                checked={form.isVerified}
                onChange={(checked) => handleSelect("isVerified", checked)}
                onIcon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
                offIcon={<X className="h-4 w-4 text-rose-600" />}
                disabled={saving}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-4 text-sm md:grid-cols-4">
            <UserMeta value={<StatusPill status={form.role} map={ROLE_MAP} />} label="Role" />
            <UserMeta
              value={<StatusPill status={String(form.isActive)} map={ACTIVE_STATUS_MAP} dot />}
              label="Status"
            />
            <UserMeta
              value={<StatusPill status={String(form.isVerified)} map={VERIFIED_STATUS_MAP} dot />}
              label="Verification"
            />
            <UserMeta label="Joined" value={formatDate(user.createdAt)} />
          </div>
        </section>

        {/* ── Shipping addresses ───────────────────────────────── */}
        <section className="rounded-[20px] border border-border/60 bg-surface p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-text">
              <MapPin className="h-5 w-5 text-primary" />
              Shipping addresses
            </h2>
            <button
              type="button"
              onClick={newAddress}
              disabled={saving || Boolean(addressDraft)}
              title={addressDraft ? "Save or cancel the current address first" : "Add address"}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
            >
              <Plus className="h-4 w-4" />
              Add address
            </button>
          </div>

          {addressDraft?.isNew && (
            <div className="mb-3">
              <AddressEditor
                draft={addressDraft}
                errors={addressErrors}
                disabled={saving}
                onChange={addressDraftChange}
                onSave={saveAddressDraft}
                onCancel={cancelAddressDraft}
              />
            </div>
          )}

          {form.addresses.length === 0 && !addressDraft?.isNew ? (
            <EmptyState
              icon={<MapPin className="mx-auto h-10 w-10 text-text-muted" />}
              title="No addresses yet"
              description="This user has not saved any shipping addresses."
              action={
                <button
                  type="button"
                  onClick={newAddress}
                  disabled={saving || Boolean(addressDraft)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add first address
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {form.addresses.map((address) => {
                const LabelIcon = ADDRESS_LABELS[address.label]?.Icon || MapPin;
                const isEditing =
                  !addressDraft?.isNew && addressDraft?.clientId === address.clientId;

                return (
                  <div
                    key={address.clientId}
                    className={`rounded-xl border p-4 ${
                      isEditing ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    {isEditing ? (
                      <AddressEditor
                        draft={addressDraft}
                        errors={addressErrors}
                        disabled={saving}
                        onChange={addressDraftChange}
                        onSave={saveAddressDraft}
                        onCancel={cancelAddressDraft}
                        onDelete={() => handleRemoveAddress(address)}
                      />
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <LabelIcon className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-text">
                                {address.name || "Untitled address"}
                              </p>
                              <span className="rounded bg-background-soft px-1.5 py-0.5 text-xs text-text-muted">
                                {ADDRESS_LABELS[address.label]?.label || "Other"}
                              </span>
                              {address.isDefault && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                                  <Star className="h-3 w-3" /> Default
                                </span>
                              )}
                            </div>
                            <p className="mt-1 wrap-break-word text-sm text-text-muted">
                              {address.line1}
                              {address.line2 ? `, ${address.line2}` : ""}
                            </p>
                            <p className="text-sm text-text-muted">
                              {[address.city, address.state].filter(Boolean).join(", ")}
                            </p>
                            {address.phone && (
                              <p className="mt-1 text-sm text-text-muted">{address.phone}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startAddress(address)}
                            disabled={saving || Boolean(addressDraft)}
                            aria-label={`Edit ${address.name || "shipping"} address`}
                            title="Edit address"
                            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAddress(address)}
                            disabled={saving || Boolean(addressDraft)}
                            aria-label={`Remove ${address.name || "shipping"} address`}
                            title="Remove address"
                            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {addressDraft && (
            <p className="mt-3 text-xs text-text-muted">
              Save or cancel the address draft before saving the user profile.
            </p>
          )}
        </section>

        {/* ── Page actions ─────────────────────────────────────── */}
        <div className="flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleRequestLeave}
            disabled={saving}
            className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !isDirty || Boolean(addressDraft)}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors ${
              saving || !isDirty || addressDraft
                ? "cursor-not-allowed bg-primary/60"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Address removal confirmation ───────────────────────── */}
      <ConfirmModal
        open={confirmTarget !== null}
        title="Remove shipping address?"
        description={
          confirmTarget
            ? `Remove ${confirmTarget.name} from this user's profile?${
                confirmTarget.summary ? ` Address: ${confirmTarget.summary}.` : ""
              } This change will be included the next time you save the user profile.`
            : ""
        }
        variant="destructive"
        confirmLabel="Remove address"
        onConfirm={confirmRemoveAddress}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
};

export default AdminUserDetailPage;
