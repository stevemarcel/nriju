import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { setUser } from "../../slices/authSlice";
import api from "../../services/api";
import { User, Mail, Phone, Lock, Save, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

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
          <p className="text-text-muted mt-1 text-sm">Update your personal details and account settings.</p>
        </div>

        {/* Profile card with avatar */}
        <div className="bg-surface rounded-xl border border-border-soft p-6 mb-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="font-heading text-2xl font-bold text-primary">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
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
                {user?.role?.replace("superAdmin", "Super Admin").replace("admin", "Admin") || "Customer"}
              </span>
            </div>
          </div>
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
      </div>
    </div>
  );
};

export default AccountProfile;
