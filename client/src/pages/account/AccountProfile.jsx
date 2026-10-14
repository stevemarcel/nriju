import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { setUser } from "../../slices/authSlice";
import api from "../../services/api";
import { toast } from "sonner";
import CropAvatar from "../../components/CropAvatar";
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Plus,
  MapPin,
  Home as HomeIcon,
  Building2,
  Trash2,
  Star,
} from "lucide-react";

const AccountProfile = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

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

  // Address management
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "home",
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    isDefault: false,
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressSuccess, setAddressSuccess] = useState(false);

  const addresses = user?.addresses || [];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await api.put("/auth/me", form);
      dispatch(setUser(res.data.data));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSourceLoad = async () => {
    const res = await api.get("/auth/me/avatar/source", { responseType: "blob" });
    return res.data;
  };

  const handleAvatarUpload = async (file) => {
    setAvatarUploading(true);
    setAvatarError("");

    try {
      const formData = new FormData();
      formData.append("avatar", file, file.name || "avatar.webp");

      const res = await api.post("/auth/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      dispatch(setUser(res.data.data));
      toast.success("Profile photo updated successfully.");
      return true;
    } catch (err) {
      const message = err.response?.data?.message || "Failed to upload profile photo.";
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
      const res = await api.delete("/auth/me/avatar");
      dispatch(setUser(res.data.data));
      toast.success("Profile photo deleted.");
      return true;
    } catch (err) {
      const message = err.response?.data?.message || "Failed to delete profile photo.";
      setAvatarError(message);
      toast.error(message);
      return false;
    } finally {
      setAvatarDeleting(false);
    }
  };

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setAddressError("");
    setAddressSaving(true);
    try {
      const res = await api.post("/auth/me/addresses", addressForm);
      dispatch(setUser(res.data.data));
      setAddressForm({
        label: "home",
        name: "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        isDefault: false,
      });
      setShowAddressForm(false);
      setAddressSuccess(true);
      setTimeout(() => setAddressSuccess(false), 3000);
      toast.success("Address added successfully!");
    } catch (err) {
      setAddressError(err.response?.data?.message || "Failed to add address.");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!confirm("Remove this address?")) return;
    try {
      const res = await api.delete(`/auth/me/addresses/${addressId}`);
      dispatch(setUser(res.data.data));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove address.");
    }
  };

  return (
    <div className="min-h-screen bg-background-soft">
      {/* Top bar */}
      <div className="bg-surface border-b border-border-soft">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/account"
            className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Account</span>
          </Link>
          <span className="text-text-muted text-sm hidden sm:inline">/</span>
          <span className="text-sm text-text-muted hidden sm:inline">Profile</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-text sm:text-3xl">
            Profile & Settings
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Update your personal details and account settings.
          </p>
        </div>

        {/* Profile card with avatar */}
        <div className="bg-surface rounded-xl border border-border-soft p-6 mb-6">
          <div className="flex items-center gap-5">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-primary/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-heading text-2xl font-bold text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
            )}
            <div>
              <h2 className="font-heading text-lg font-bold text-text">{user?.name}</h2>
              <p className="text-sm text-text-muted">{user?.email}</p>
              <span
                className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  user?.role === "superAdmin"
                    ? "bg-purple-100 text-purple-700"
                    : user?.role === "admin"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-background text-text-muted"
                }`}
              >
                {user?.role?.replace("superAdmin", "Super Admin").replace("admin", "Admin") ||
                  "Customer"}
              </span>
            </div>
          </div>
        </div>

        {/* Avatar Upload Section */}
        <div className="bg-surface rounded-xl border border-border-soft p-6 mb-6">
          <h3 className="font-heading font-semibold text-text mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Profile Photo
          </h3>
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
        </div>

        {/* Form */}
        <div className="bg-surface rounded-xl border border-border-soft p-6">
          <form onSubmit={handleSave} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Changes saved successfully.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border-soft rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border-soft rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border-soft rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border-soft">
              <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Change Password
              </h3>
              <Link
                to="/account/change-password"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
              >
                Update your password →
              </Link>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-primary/95 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <span className="text-xs text-text-muted">
                {saving ? "Please wait..." : "Last saved: recently"}
              </span>
            </div>
          </form>
        </div>

        {/* Addresses Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-bold text-text">Shipping Addresses</h2>
            <button
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/95 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Address
            </button>
          </div>

          {showAddressForm && (
            <div className="bg-surface rounded-xl border border-border-soft p-6 mb-4">
              <h3 className="font-heading font-semibold text-text mb-4">New Address</h3>
              <form onSubmit={handleAddAddress} className="space-y-4">
                {addressError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {addressError}
                  </div>
                )}
                {addressSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Address added successfully.
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Label</label>
                    <select
                      name="label"
                      value={addressForm.label}
                      onChange={handleAddressChange}
                      className="w-full px-3 py-2.5 bg-background border border-border-soft rounded-lg focus:outline-none focus:border-primary text-sm"
                    >
                      <option value="home">Home</option>
                      <option value="work">Work</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">
                      Full Name (recipient)
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={addressForm.name}
                      onChange={handleAddressChange}
                      required
                      placeholder="John Doe"
                      className="w-full px-3 py-2.5 bg-background border border-border-soft rounded-lg focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={addressForm.phone}
                      onChange={handleAddressChange}
                      required
                      placeholder="+234 800 000 0000"
                      className="w-full px-3 py-2.5 bg-background border border-border-soft rounded-lg focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">City</label>
                    <input
                      type="text"
                      name="city"
                      value={addressForm.city}
                      onChange={handleAddressChange}
                      required
                      placeholder="Lagos"
                      className="w-full px-3 py-2.5 bg-background border border-border-soft rounded-lg focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="line1"
                    value={addressForm.line1}
                    onChange={handleAddressChange}
                    required
                    placeholder="123 Main Street, Victoria Island"
                    className="w-full px-3 py-2.5 bg-background border border-border-soft rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Apt / Suite / Floor (optional)
                  </label>
                  <input
                    type="text"
                    name="line2"
                    value={addressForm.line2}
                    onChange={handleAddressChange}
                    placeholder="Apt 4B"
                    className="w-full px-3 py-2.5 bg-background border border-border-soft rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">State</label>
                    <input
                      type="text"
                      name="state"
                      value={addressForm.state}
                      onChange={handleAddressChange}
                      required
                      placeholder="Lagos"
                      className="w-full px-3 py-2.5 bg-background border border-border-soft rounded-lg focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-7">
                    <input
                      type="checkbox"
                      name="isDefault"
                      id="isDefault"
                      checked={addressForm.isDefault}
                      onChange={handleAddressChange}
                      className="w-4 h-4 rounded border-border-soft text-primary focus:ring-primary"
                    />
                    <label htmlFor="isDefault" className="text-sm text-text">
                      Set as default address
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={addressSaving}
                    className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-primary/95 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {addressSaving ? "Adding..." : "Add Address"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="px-5 py-2.5 bg-surface border border-border-soft text-text text-sm font-medium rounded-lg hover:bg-background transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Address list */}
          {addresses.length === 0 ? (
            <div className="bg-surface rounded-xl border border-dashed border-border-soft p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-background flex items-center justify-center">
                <MapPin className="w-6 h-6 text-text-muted opacity-40" />
              </div>
              <p className="text-sm font-medium text-text">No addresses yet</p>
              <p className="text-xs text-text-muted mt-1">
                Add your first address to speed up checkout
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr._id}
                  className={`bg-surface rounded-xl border p-4 hover:shadow-sm transition-shadow ${
                    addr.isDefault
                      ? "border-primary/30 ring-1 ring-primary/20"
                      : "border-border-soft"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                          addr.label === "home"
                            ? "bg-blue-100 text-blue-700"
                            : addr.label === "work"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-background text-text-muted border border-border-soft"
                        }`}
                      >
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <span className="text-xs font-medium text-primary flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-primary" /> Default
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteAddress(addr._id)}
                      className="text-text-muted hover:text-red-500 transition-colors"
                      aria-label="Delete address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm text-text font-medium">{addr.name}</div>
                  <div className="text-xs text-text-muted mt-1">{addr.phone}</div>
                  <div className="text-xs text-text-muted mt-2">
                    {addr.line1}
                    {addr.line2 && <>, {addr.line2}</>}
                    <br />
                    {addr.city}, {addr.state}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountProfile;
