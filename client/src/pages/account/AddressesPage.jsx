import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { setUser } from "../../slices/authSlice";
import api from "../../services/api";
import { toast } from "sonner";
import { Breadcrumb } from "../../components/shared/Navigation";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import {
  AlertCircle,
  Building2,
  Check,
  Home,
  MapPin,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
} from "lucide-react";

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
const LABELS = [
  { value: "home", label: "Home", Icon: Home },
  { value: "work", label: "Work", Icon: Building2 },
  { value: "other", label: "Other", Icon: MapPin },
];

const Field = ({ label, name, value, onChange, type = "text", required = true, autoComplete }) => (
  <div>
    <label htmlFor={`address-${name}`} className="mb-1.5 block text-sm font-medium text-text">
      {label}
    </label>
    <input
      id={`address-${name}`}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      autoComplete={autoComplete}
      className="min-h-10 w-full rounded-lg border border-border-soft bg-background px-3 py-2.5 text-sm text-text transition-colors placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  </div>
);

const AddressesPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const addresses = user?.addresses || [];
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [error, setError] = useState("");

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_ADDRESS);
    setError("");
  };

  const openNewAddressForm = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_ADDRESS,
      name: user?.name || "",
      phone: user?.phone || "",
      isDefault: addresses.length === 0,
    });
    setError("");
    setFormOpen(true);
  };

  const openEditAddressForm = (address) => {
    setEditingId(address._id);
    setForm({
      label: address.label || "home",
      name: address.name || "",
      phone: address.phone || "",
      line1: address.line1 || "",
      line2: address.line2 || "",
      city: address.city || "",
      state: address.state || "",
      isDefault: Boolean(address.isDefault),
    });
    setError("");
    setFormOpen(true);
  };

  useEffect(() => {
    const { addAddress, editAddressId } = location.state || {};
    if (!addAddress && !editAddressId) return;

    if (addAddress) {
      openNewAddressForm();
    } else {
      const address = addresses.find((item) => item._id === editAddressId);
      if (address) openEditAddressForm(address);
    }

    navigate("/account/addresses", { replace: true, state: null });
  }, [addresses, location.state, navigate]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = editingId
        ? await api.put(`/auth/me/addresses/${editingId}`, form)
        : await api.post("/auth/me/addresses", form);
      dispatch(setUser(response.data.data));
      toast.success(editingId ? "Address updated." : "Address added.");
      closeForm();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save this address.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addressId) => {
    setSettingDefaultId(addressId);
    try {
      const response = await api.patch(`/auth/me/addresses/${addressId}/default`);
      dispatch(setUser(response.data.data));
      toast.success("Default address updated.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to set the default address.");
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDelete = async () => {
    if (!addressToDelete) return;
    const { _id: addressId } = addressToDelete;
    setDeletingId(addressId);
    try {
      const response = await api.delete(`/auth/me/addresses/${addressId}`);
      dispatch(setUser(response.data.data));
      toast.success("Address removed.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to remove this address.");
    } finally {
      setDeletingId(null);
      setAddressToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background-soft">
      <div className="border-b border-border-soft bg-surface">
        <div className="container mx-auto px-4 py-4">
          <Breadcrumb crumbs={[{ label: "Account", to: "/account" }, { label: "Addresses" }]} />
        </div>
      </div>
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-text sm:text-3xl">
              Shipping Addresses
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Save delivery details for a faster checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewAddressForm}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add address
          </button>
        </div>

        {formOpen && (
          <section
            className="mb-6 rounded-xl border border-border-soft bg-surface p-5 sm:p-6"
            aria-labelledby="address-form-title"
          >
            <div className="mb-5">
              <h2 id="address-form-title" className="font-heading text-lg font-bold text-text">
                {editingId ? "Edit address" : "New address"}
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                All fields except address line 2 are required.
              </p>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-text">Address label</legend>
                <div className="flex flex-wrap gap-2">
                  {LABELS.map(({ value, label, Icon }) => {
                    const selected = form.label === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, label: value }))}
                        aria-pressed={selected}
                        className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${selected ? "border-primary bg-primary/10 text-primary" : "border-border-soft bg-background text-text-muted hover:border-primary hover:text-text"}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Recipient name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                />
                <Field
                  label="Phone number"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>
              <Field
                label="Street address"
                name="line1"
                value={form.line1}
                onChange={handleChange}
                autoComplete="address-line1"
              />
              <Field
                label="Address line 2"
                name="line2"
                value={form.line2}
                onChange={handleChange}
                autoComplete="address-line2"
                required={false}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="City"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  autoComplete="address-level2"
                />
                <Field
                  label="State"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  autoComplete="address-level1"
                />
              </div>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-text">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={form.isDefault}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-border-soft text-primary focus:ring-primary"
                />
                Use as my default delivery address
              </label>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="min-h-10 rounded-lg border border-border-soft bg-surface px-5 py-2.5 text-sm font-medium text-text transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  aria-busy={saving}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {saving ? "Saving..." : editingId ? "Save changes" : "Save address"}
                </button>
              </div>
            </form>
          </section>
        )}

        {addresses.length === 0 ? (
          <section className="rounded-xl border border-dashed border-border-soft bg-surface px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-background">
              <MapPin className="h-7 w-7 text-text-muted" aria-hidden="true" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-text">No saved addresses</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
              Add a shipping address now to make your next checkout quicker.
            </p>
          </section>
        ) : (
          <section aria-label="Saved addresses" className="grid gap-4 sm:grid-cols-2">
            {addresses.map((address) => {
              const LabelIcon = LABELS.find((item) => item.value === address.label)?.Icon || MapPin;
              const isSettingDefault = settingDefaultId === address._id;
              const isDeleting = deletingId === address._id;
              return (
                <article
                  key={address._id}
                  className={`rounded-xl border bg-surface p-5 transition-shadow hover:shadow-sm ${address.isDefault ? "border-primary/40 ring-1 ring-primary/15" : "border-border-soft"}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-medium capitalize text-text-muted">
                        <LabelIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {address.label}
                      </span>
                      {address.isDefault && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditAddressForm(address)}
                        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label={`Edit ${address.label} address`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddressToDelete(address)}
                        disabled={isDeleting}
                        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label={`Remove ${address.label} address`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <address className="not-italic">
                    <p className="font-medium text-text">{address.name}</p>
                    <p className="mt-1 text-sm text-text-muted">{address.phone}</p>
                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      {address.line1}
                      {address.line2 && (
                        <>
                          <br />
                          {address.line2}
                        </>
                      )}
                      <br />
                      {address.city}, {address.state}
                    </p>
                  </address>
                  {!address.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(address._id)}
                      disabled={isSettingDefault}
                      aria-busy={isSettingDefault}
                      className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-soft px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      {isSettingDefault ? "Updating..." : "Set as default"}
                    </button>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>
      <ConfirmModal
        open={Boolean(addressToDelete)}
        title="Remove address?"
        description="This saved address will be permanently removed from your account."
        confirmLabel="Remove address"
        onConfirm={handleDelete}
        onCancel={() => setAddressToDelete(null)}
      />
    </div>
  );
};

export default AddressesPage;
