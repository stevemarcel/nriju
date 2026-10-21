import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { setUser } from "../../slices/authSlice";
import api from "../../services/api";
import { toast } from "sonner";
import CropAvatar from "../../components/ui/CropAvatar";
import formatTimeAgo from "../../utils/formatTimeAgo";
import { Breadcrumb } from "../../components/shared/Navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Home,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Star,
  Trash2,
  User,
} from "lucide-react";

const LABELS = {
  home: { label: "Home", Icon: Home },
  work: { label: "Work", Icon: Building2 },
  other: { label: "Other", Icon: MapPin },
};

const AccountProfilePage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const addresses = user?.addresses || [];
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const handleChange = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await api.put("/auth/me", form);
      dispatch(setUser(response.data.data));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSourceLoad = async () =>
    (await api.get("/auth/me/avatar/source", { responseType: "blob" })).data;

  const handleAvatarUpload = async (file) => {
    setAvatarUploading(true);
    setAvatarError("");
    try {
      const formData = new FormData();
      formData.append("avatar", file, file.name || "avatar.webp");
      const response = await api.post("/auth/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      dispatch(setUser(response.data.data));
      toast.success("Profile photo updated successfully.");
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
      const response = await api.delete("/auth/me/avatar");
      dispatch(setUser(response.data.data));
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

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Remove this address?")) return;
    try {
      const response = await api.delete(`/auth/me/addresses/${addressId}`);
      dispatch(setUser(response.data.data));
      toast.success("Address removed.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Failed to remove address.");
    }
  };

  return (
    <div className="min-h-screen bg-background-soft">
      <div className="border-b border-border-soft bg-surface">
        <div className="container mx-auto px-4 py-4">
          <Breadcrumb crumbs={[{ label: "Account", to: "/account" }, { label: "Profile" }]} />
        </div>
      </div>
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-text sm:text-3xl">
            Profile & Settings
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Update your personal details and account settings.
          </p>
        </div>
        <section className="mb-6 rounded-xl border border-border-soft bg-surface p-6">
          <div className="flex items-center gap-5">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="font-heading text-2xl font-bold text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
            )}
            <div>
              <h2 className="font-heading text-lg font-bold text-text">{user?.name}</h2>
              <p className="text-sm text-text-muted">{user?.email}</p>
            </div>
          </div>
        </section>
        <section className="mb-6 rounded-xl border border-border-soft bg-surface p-6">
          <h2 className="mb-5 flex items-center gap-2 font-heading font-semibold text-text">
            <User className="h-5 w-5 text-primary" aria-hidden="true" />
            Profile photo
          </h2>
          <CropAvatar
            initialSrc={user?.avatar || ""}
            name={user?.name || ""}
            onLoadSource={handleAvatarSourceLoad}
            onCropped={handleAvatarUpload}
            onDeleted={handleAvatarDelete}
            isSaving={avatarUploading}
            isDeleting={avatarDeleting}
            error={avatarError}
            onClearError={() => setAvatarError("")}
          />
        </section>
        <section className="rounded-xl border border-border-soft bg-surface p-6">
          <form onSubmit={handleSave} className="space-y-5">
            {error && (
              <Notice icon={AlertCircle} className="bg-red-50 text-red-600" message={error} />
            )}
            {saved && (
              <Notice
                icon={CheckCircle}
                className="bg-emerald-50 text-emerald-600"
                message="Changes saved successfully."
              />
            )}
            <ProfileField
              label="Full Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              icon={User}
              autoComplete="name"
              required
            />
            <ProfileField
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              icon={Mail}
              autoComplete="email"
              required
            />
            <ProfileField
              label="Phone Number"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              icon={Phone}
              autoComplete="tel"
            />
            <div className="border-t border-border-soft pt-4">
              <h2 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold text-text">
                <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
                Change password
              </h2>
              <Link
                to="/account/change-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Update your password
              </Link>
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={saving}
                aria-busy={saving}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <span className="text-xs text-text-muted">
                {saving ? "Saving..." : `Last saved: ${formatTimeAgo(user?.updatedAt)}`}
              </span>
            </div>
          </form>
        </section>
        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-text">
                <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                Shipping Addresses
              </h2>
              <p className="mt-1 text-sm text-text-muted">Manage your saved delivery details.</p>
            </div>
            <Link
              to="/account/addresses"
              state={{ addAddress: true }}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/95"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Address
            </Link>
          </div>
          {addresses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-soft bg-surface p-8 text-center">
              <MapPin className="mx-auto mb-3 h-6 w-6 text-text-muted" aria-hidden="true" />
              <p className="text-sm font-medium text-text">No addresses yet</p>
              <p className="mt-1 text-xs text-text-muted">
                Add your first address to speed up checkout.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((address) => (
                <AddressCard key={address._id} address={address} onDelete={handleDeleteAddress} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const Notice = ({ icon: Icon, className, message }) => (
  <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${className}`} role="status">
    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
    {message}
  </div>
);
const ProfileField = ({
  label,
  name,
  value,
  onChange,
  icon: Icon,
  type = "text",
  autoComplete,
  required = false,
}) => (
  <div>
    <label htmlFor={`profile-${name}`} className="mb-2 block text-sm font-medium text-text">
      {label}
    </label>
    <div className="relative">
      <Icon
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      <input
        id={`profile-${name}`}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        className="min-h-10 w-full rounded-lg border border-border-soft bg-background py-2.5 pl-10 pr-4 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  </div>
);
const AddressCard = ({ address, onDelete }) => {
  const { Icon, label } = LABELS[address.label] || LABELS.other;
  return (
    <article
      className={`rounded-xl border bg-surface p-4 transition-shadow hover:shadow-sm ${address.isDefault ? "border-primary/30 ring-1 ring-primary/20" : "border-border-soft"}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-text-muted">
            <Icon className="h-3 w-3" aria-hidden="true" />
            {label}
          </span>
          {address.isDefault && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              Default
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/account/addresses"
            state={{ editAddressId: address._id }}
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background hover:text-primary"
            aria-label={`Edit ${label} address`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(address._id)}
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${label} address`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <address className="not-italic">
        <p className="text-sm font-medium text-text">{address.name}</p>
        <p className="mt-1 text-xs text-text-muted">{address.phone}</p>
        <p className="mt-2 text-xs text-text-muted">
          {address.line1}
          {address.line2 && `, ${address.line2}`}
          <br />
          {address.city}, {address.state}
        </p>
      </address>
    </article>
  );
};

export default AccountProfilePage;
