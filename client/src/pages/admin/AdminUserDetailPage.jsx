import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  Lock,
  Mail,
  MapPin,
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
  admin: { label: "Admin", cls: "bg-blue-100 text-blue-700", icon: <Shield className="w-3 h-3" /> },
  customer: {
    label: "Customer",
    cls: "bg-slate-100 text-slate-700",
    icon: <User className="w-3 h-3" />,
  },
};

const ACTIVE_STATUS_MAP = {
  true: { label: "Active", cls: "bg-emerald-100 text-emerald-700", dotColor: "bg-emerald-500" },
  false: { label: "Inactive", cls: "bg-slate-100 text-slate-600", dotColor: "bg-slate-500" },
};

const VERIFIED_STATUS_MAP = {
  true: { label: "Verified", cls: "bg-emerald-100 text-emerald-700", dotColor: "bg-emerald-500" },
  false: { label: "Unverified", cls: "bg-rose-100 text-rose-700", dotColor: "bg-rose-500" },
};

const ADDRESS_LABELS = {
  home: { label: "Home", Icon: Home },
  work: { label: "Work", Icon: Building2 },
  other: { label: "Other", Icon: MapPin },
};

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer", icon: User },
  { value: "admin", label: "Admin", icon: Shield },
  { value: "superAdmin", label: "Super Admin", icon: ShieldCheck },
];

const EMPTY_ADDRESS = {
  label: "home",
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  isDefault: false,
};

const getInitials = (name) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const AdminUserDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // ── View state ──────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "customer",
    isActive: true,
    isVerified: false,
    addresses: [],
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [addressIndex, setAddressIndex] = useState(null); // null = new address
  const [confirmTarget, setConfirmTarget] = useState(null); // address delete

  // ── Fetch ───────────────────────────────────────────────────
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: async () => (await api.get(`/admin/users/${id}`)).data,
  });

  const user = data?.data;

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "customer",
        isActive: user.isActive ?? true,
        isVerified: user.isVerified ?? false,
        addresses: user.addresses?.length ? user.addresses.map((a) => ({ ...a })) : [],
      });
      setDirty(false);
    }
  }, [user]);

  // ── Field handlers ──────────────────────────────────────────
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setDirty(true);
  };

  const handleSelect = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setDirty(true);
  };

  // ── Addresses ───────────────────────────────────────────────
  const startAddress = (index) => {
    setAddressIndex(index);
    setDirty(true);
  };

  const newAddress = () => {
    setAddressIndex(form.addresses.length);
    setDirty(true);
  };

  const cancelAddress = () => {
    setAddressIndex(null);
  };

  const addressChange = (index, field, value) => {
    setForm((current) => {
      const addresses = current.addresses.map((a, i) =>
        i === index ? { ...a, [field]: value } : a,
      );
      return { ...current, addresses };
    });
    setDirty(true);
  };

  const handleSetDefault = (index) => {
    setForm((current) => ({
      ...current,
      addresses: current.addresses.map((a, i) => ({
        ...a,
        isDefault: i === index,
      })),
    }));
    setDirty(true);
  };

  const handleRemoveAddress = (index) => {
    setConfirmTarget({ index });
  };

  const confirmRemoveAddress = () => {
    if (confirmTarget === null) return;
    setForm((current) => ({
      ...current,
      addresses: current.addresses.filter((_, i) => i !== confirmTarget.index),
    }));
    setConfirmTarget(null);
    setDirty(true);
  };

  // ── Save profile ────────────────────────────────────────────
  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.patch(`/admin/users/${id}`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        isActive: form.isActive,
        isVerified: form.isVerified,
        addresses: form.addresses,
      });
      setForm((current) => ({
        ...current,
        ...response.data.data,
        addresses: response.data.data.addresses?.length
          ? response.data.data.addresses.map((a) => ({ ...a }))
          : [],
      }));
      setDirty(false);
      toast.success("User profile updated.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // ── Avatar ──────────────────────────────────────────────────
  const handleAvatarSourceLoad = async () =>
    (await api.get(`/admin/users/${id}/avatar/source`, { responseType: "blob" })).data;

  const handleAvatarUpload = async (file) => {
    setAvatarUploading(true);
    setAvatarError("");
    try {
      const formData = new FormData();
      formData.append("avatar", file, file.name || "avatar.webp");
      const response = await api.post(`/admin/users/${id}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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

  // ── Render helpers ──────────────────────────────────────────
  const roleLabel = (role) => ROLE_MAP[role]?.label || role;
  const avatarSrc = user?.avatar || "";

  if (isPending) {
    return (
      <div className="p-6">
        <AdminPageHeader title="User Profile" subtitle="Loading user details…" />
        <TableSkeleton rows={8} cols={4} />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="p-6">
        <AdminPageHeader title="User Profile" subtitle="Could not load this user." />
        <EmptyState
          icon={<User className="mx-auto w-10 h-10 text-text-muted" />}
          title="User not found"
          description={
            error?.response?.data?.message || "The user you are looking for does not exist."
          }
          action={
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to users
            </Link>
          }
        />
      </div>
    );
  }

  const Field = ({ label, name, value, onChange, type = "text", required = true }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-text mb-1.5">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
      />
    </div>
  );

  const Toggle = ({ label, checked, onChange, onIcon, offIcon }) => (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm font-medium text-text">{label}</label>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        >
          {checked ? onIcon : offIcon}
        </span>
      </button>
    </div>
  );

  const Meta = ({ label, value }) => (
    <div>
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</p>
      <div className="mt-1">{value}</div>
    </div>
  );

  const AddressEditor = ({ address, onChange, isDefault, onSetDefault, onCancel, onDelete }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-text mb-1">Label</label>
        <div className="flex gap-1">
          {Object.entries(ADDRESS_LABELS).map(([key, { label, Icon }]) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange("label", key)}
              title={label}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs transition-colors ${
                address.label === key
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-text-muted hover:bg-background-soft"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>
      <Field
        label="Recipient name"
        name="name"
        value={address.name}
        onChange={(e) => onChange("name", e.target.value)}
      />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        value={address.phone}
        onChange={(e) => onChange("phone", e.target.value)}
      />
      <Field
        label="Street address"
        name="line1"
        value={address.line1}
        onChange={(e) => onChange("line1", e.target.value)}
      />
      <Field
        label="Address line 2"
        name="line2"
        value={address.line2}
        onChange={(e) => onChange("line2", e.target.value)}
      />
      <Field
        label="City"
        name="city"
        value={address.city}
        onChange={(e) => onChange("city", e.target.value)}
      />
      <Field
        label="State"
        name="state"
        value={address.state}
        onChange={(e) => onChange("state", e.target.value)}
      />

      <div className="flex items-center justify-between gap-3 md:col-span-2">
        <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => onSetDefault()}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          Set as default shipping address
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-background-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-1.5 text-sm rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate("/admin/users")}
          className="p-2 rounded-lg hover:bg-background-soft transition-colors"
          aria-label="Back to users"
        >
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </button>
        <div>
          <AdminPageHeader
            title={user.name}
            subtitle={
              <span className="flex items-center gap-2 flex-wrap">
                <StatusPill status={user.role} map={ROLE_MAP} />
                <span className="text-text-muted">·</span>
                <StatusPill status={String(user.isActive)} map={ACTIVE_STATUS_MAP} dot />
              </span>
            }
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Identity card ──────────────────────────────────── */}
        <section className="bg-surface rounded-[20px] shadow-sm border border-border/60 p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <CropAvatar
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

            {/* Fields */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <Field label="Full name" name="name" value={form.name} onChange={handleChange} />
              <Field
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
              />

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Role</label>
                {user.role === "superAdmin" ? (
                  <div className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-text-muted flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    {ROLE_MAP[user.role]?.label || user.role}
                  </div>
                ) : (
                  <Dropdown
                    trigger={
                      <span className="flex items-center gap-2 w-full">
                        {(() => {
                          const Icon =
                            ROLE_OPTIONS.find((s) => s.value === form.role)?.icon || User;
                          return <Icon className="w-4 h-4 text-text-muted" />;
                        })()}
                        <span className="flex-1 text-left">
                          {ROLE_OPTIONS.find((s) => s.value === form.role)?.label || "Role"}
                        </span>
                      </span>
                    }
                    color="muted"
                    noBorder
                    fullWidth
                    menuClassName="w-full"
                  >
                    {ROLE_OPTIONS.map((s) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.value}
                          onClick={() => handleSelect("role", s.value)}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-background transition-colors ${
                            form.role === s.value
                              ? "text-primary font-semibold bg-primary/5"
                              : "text-text"
                          }`}
                        >
                          <Icon className="w-4 h-4 text-text-muted" />
                          <span className="flex-1">{s.label}</span>
                          {form.role === s.value && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </Dropdown>
                )}
                {user.role === "superAdmin" && (
                  <p className="text-xs text-text-muted mt-1">
                    Protected — only another super admin can change this.
                  </p>
                )}
              </div>

              <Toggle
                label="Account active"
                checked={form.isActive}
                onChange={(checked) => handleSelect("isActive", checked)}
                onIcon={<UserCheck className="w-4 h-4 text-emerald-600" />}
                offIcon={<UserX className="w-4 h-4 text-rose-600" />}
              />
              <Toggle
                label="Email verified"
                checked={form.isVerified}
                onChange={(checked) => handleSelect("isVerified", checked)}
                onIcon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
                offIcon={<X className="w-4 h-4 text-rose-600" />}
              />
            </div>
          </div>

          {/* Meta row */}
          <div className="mt-6 pt-4 border-t border-border/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Meta label="Role" value={<StatusPill status={user.role} map={ROLE_MAP} />} />
            <Meta
              label="Status"
              value={<StatusPill status={String(user.isActive)} map={ACTIVE_STATUS_MAP} dot />}
            />
            <Meta
              label="Verification"
              value={<StatusPill status={String(user.isVerified)} map={VERIFIED_STATUS_MAP} dot />}
            />
            <Meta label="Joined" value={formatDate(user.createdAt)} />
          </div>
        </section>

        {/* ── Addresses ──────────────────────────────────────── */}
        <section className="bg-surface rounded-[20px] shadow-sm border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-text flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Shipping addresses
            </h2>
            <button
              type="button"
              onClick={newAddress}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Add address
            </button>
          </div>

          {form.addresses.length === 0 ? (
            <EmptyState
              icon={<MapPin className="mx-auto w-10 h-10 text-text-muted" />}
              title="No addresses yet"
              description="This user has not saved any shipping addresses."
              action={
                <button
                  type="button"
                  onClick={newAddress}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Add first address
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {form.addresses.map((address, index) => {
                const LabelIcon = ADDRESS_LABELS[address.label]?.Icon || MapPin;
                const isEditing = addressIndex === index;
                return (
                  <div
                    key={index}
                    className={`rounded-xl border p-4 ${isEditing ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    {isEditing ? (
                      <AddressEditor
                        address={address}
                        onChange={(field, value) => addressChange(index, field, value)}
                        isDefault={address.isDefault}
                        onSetDefault={() => handleSetDefault(index)}
                        onCancel={cancelAddress}
                        onDelete={() => handleRemoveAddress(index)}
                      />
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <LabelIcon className="w-5 h-5 text-text-muted mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-text">
                                {address.name || "Untitled address"}
                              </p>
                              {address.isDefault && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-1">
                                  <Star className="w-3 h-3" /> Default
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-text-muted">
                              {address.line1}
                              {address.line2 ? `, ${address.line2}` : ""}
                            </p>
                            <p className="text-sm text-text-muted">
                              {address.city}, {address.state}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">{address.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startAddress(index)}
                            className="p-2 rounded-lg hover:bg-background-soft text-text-muted hover:text-primary transition-colors"
                            title="Edit address"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAddress(index)}
                            className="p-2 rounded-lg hover:bg-rose-50 text-text-muted hover:text-rose-600 transition-colors"
                            title="Remove address"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Actions ────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/admin/users"
            className="px-5 py-2.5 rounded-lg border border-border bg-surface text-sm font-medium text-text hover:bg-background transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !dirty}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors ${
              saving || !dirty
                ? "bg-primary/60 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Address delete confirmation ─────────────────────── */}
      <ConfirmModal
        open={confirmTarget !== null}
        title="Remove address?"
        description="This address will be removed from the user's profile. You can add it back later."
        variant="destructive"
        confirmLabel="Remove address"
        onConfirm={confirmRemoveAddress}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
};

export default AdminUserDetailPage;
