import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Plus, Save, X, Search } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api";
import { AdminPageHeader, EmptyState, TableSkeleton } from "../../components/admin/AdminPrimitives";
import { useAdminRealtimeRefresh } from "../../hooks/useAdminRealtimeRefresh";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SECONDARY_BUTTON_CLASS,
} from "../../components/admin/AdminModalPrimitives";

const EMPTY_LOCATION = {
  name: "",
  code: "",
  addressLine: "",
  city: "",
  state: "",
  landmark: "",
  phone: "",
  openingHours: "",
  coordinates: { latitude: null, longitude: null },
  sortOrder: 0,
  isActive: true,
};

const LOCATION_FIELDS = [
  ["name", "Location name", "e.g. Nriju Lekki"],
  ["code", "Short code", "e.g. NRJ-LEK"],
  ["addressLine", "Street address", "Street and building"],
  ["city", "City", "City"],
  ["state", "State", "State"],
  ["landmark", "Landmark", "Optional"],
  ["phone", "Contact phone", "Optional"],
  ["openingHours", "Opening hours", "e.g. Mon–Sat, 9am–6pm"],
  ["coordinates", "Coordinates", "Auto-filled from address"],
];

const LocationForm = ({
  initialValue = EMPTY_LOCATION,
  submitLabel,
  onSubmit,
  pending,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const [geocoding, setGeocoding] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ ...value, sortOrder: Number(value.sortOrder) || 0 });
  };

  const geocodeAddress = async () => {
    const { addressLine, city, state } = value;
    if (!addressLine || !city || !state) {
      toast.error("Please fill in address, city, and state first.");
      return;
    }
    setGeocoding(true);
    try {
      const query = encodeURIComponent([addressLine, city, state].filter(Boolean).join(", "));
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      );
      const data = await response.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setValue((current) => ({
          ...current,
          coordinates: { latitude: lat, longitude: lon },
        }));
        toast.success("Coordinates filled from address.");
      } else {
        toast.error("Could not find coordinates for this address.");
      }
    } catch {
      toast.error("Geocoding failed. Please try again.");
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      {LOCATION_FIELDS.map(([key, label, placeholder]) => {
        const isCoordinates = key === "coordinates";
        const isWide = key === "addressLine" || key === "instructions";

        return (
          <div key={key} className={isWide ? "sm:col-span-2" : ""}>
            <label htmlFor={`${initialValue._id || "new"}-${key}`} className={ADMIN_LABEL_CLASS}>
              {label}
            </label>
            {isCoordinates ? (
              <div className="flex gap-2 mt-1.5">
                <input
                  id={`${initialValue._id || "new"}-latitude`}
                  type="number"
                  step="0.000001"
                  placeholder="Latitude"
                  value={value.coordinates?.latitude ?? ""}
                  onChange={(event) =>
                    setValue((current) => ({
                      ...current,
                      coordinates: {
                        ...current.coordinates,
                        latitude: event.target.value ? parseFloat(event.target.value) : null,
                      },
                    }))
                  }
                  className={`${ADMIN_FIELD_CLASS} flex-1`}
                />
                <input
                  id={`${initialValue._id || "new"}-longitude`}
                  type="number"
                  step="0.000001"
                  placeholder="Longitude"
                  value={value.coordinates?.longitude ?? ""}
                  onChange={(event) =>
                    setValue((current) => ({
                      ...current,
                      coordinates: {
                        ...current.coordinates,
                        longitude: event.target.value ? parseFloat(event.target.value) : null,
                      },
                    }))
                  }
                  className={`${ADMIN_FIELD_CLASS} flex-1`}
                />
                <button
                  type="button"
                  onClick={geocodeAddress}
                  disabled={geocoding || pending}
                  className={`${ADMIN_SECONDARY_BUTTON_CLASS} h-10 flex items-center gap-2`}
                  title="Auto-fill coordinates from address, city, and state"
                >
                  {geocoding ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-on-accent/30 border-t-on-accent rounded-full" />
                      Geocoding...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Fill from address
                    </>
                  )}
                </button>
              </div>
            ) : (
              <input
                id={`${initialValue._id || "new"}-${key}`}
                value={value[key] || ""}
                required={["name", "code", "addressLine", "city", "state", "openingHours"].includes(
                  key,
                )}
                placeholder={placeholder}
                onChange={(event) =>
                  setValue((current) => ({ ...current, [key]: event.target.value }))
                }
                className={`${ADMIN_FIELD_CLASS} mt-1.5`}
              />
            )}
          </div>
        );
      })}
      <div>
        <label htmlFor={`${initialValue._id || "new"}-sortOrder`} className={ADMIN_LABEL_CLASS}>
          Display order
        </label>
        <input
          id={`${initialValue._id || "new"}-sortOrder`}
          type="number"
          min="0"
          step="1"
          value={value.sortOrder}
          onChange={(event) =>
            setValue((current) => ({
              ...current,
              sortOrder: event.target.value,
            }))
          }
          className={`${ADMIN_FIELD_CLASS} mt-1.5`}
        />
      </div>
      <div>
        <div>
          <span className={ADMIN_LABEL_CLASS}>Availability</span>
          <p className="mt-0.5 text-xs text-text-muted">
            Select so customers can see this location for pickup at checkout
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.isActive}
          aria-label="Toggle availability"
          onClick={() => setValue((current) => ({ ...current, isActive: !current.isActive }))}
          className={`relative mt-2 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
            value.isActive ? "bg-primary" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white transition-transform duration-200 ${
              value.isActive ? "translate-x-6" : "translate-x-1"
            }`}
          >
            {value.isActive ? (
              <Check className="h-3 w-3 text-on-accent" />
            ) : (
              <X className="h-3 w-3 text-slate-500" />
            )}
          </span>
        </button>
      </div>
      <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className={ADMIN_SECONDARY_BUTTON_CLASS}>
            Cancel
          </button>
        ) : null}
        <button type="submit" disabled={pending} className={ADMIN_PRIMARY_BUTTON_CLASS}>
          <Save className="h-4 w-4" /> {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

const AdminPickupLocationsPage = () => {
  useAdminRealtimeRefresh();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const locationsQuery = useQuery({
    queryKey: ["admin", "pickup-locations"],
    queryFn: async () => (await api.get("/pickup-locations/all")).data.data || [],
  });
  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? api.patch(`/pickup-locations/${id}`, payload) : api.post("/pickup-locations", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "pickup-locations"],
      });
      queryClient.invalidateQueries({ queryKey: ["pickup-locations"] });
      setAdding(false);
      setEditingId(null);
      toast.success("Pickup location saved.");
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || "Could not save pickup location."),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pickup locations"
        subtitle="Manage the collection points customers can choose during checkout."
        action={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={ADMIN_PRIMARY_BUTTON_CLASS}
          >
            <Plus className="h-4 w-4" />
            Add location
          </button>
        }
      />

      {adding ? (
        <section className="rounded-card border border-border-soft bg-surface p-5 shadow-sm">
          <h2 className="mb-5 font-heading text-lg font-bold text-text">New pickup location</h2>
          <LocationForm
            submitLabel="Create location"
            onSubmit={(payload) => saveMutation.mutate({ payload })}
            pending={saveMutation.isPending}
            onCancel={() => setAdding(false)}
          />
        </section>
      ) : null}

      {locationsQuery.isPending ? <TableSkeleton rows={5} cols={3} /> : null}
      {locationsQuery.isSuccess && !locationsQuery.data.length ? (
        <EmptyState
          icon={<MapPin className="mx-auto h-10 w-10 text-primary" />}
          title="No pickup locations"
          description="Add the first collection point before enabling pickup at checkout."
        />
      ) : null}

      <div className="space-y-4">
        {locationsQuery.data?.map((location) => (
          <section
            key={location._id}
            className="rounded-card border border-border-soft bg-surface p-5 shadow-sm"
          >
            {editingId === location._id ? (
              <LocationForm
                initialValue={location}
                submitLabel="Save changes"
                onSubmit={(payload) => saveMutation.mutate({ id: location._id, payload })}
                pending={saveMutation.isPending}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading font-bold text-text">{location.name}</h2>
                      <span
                        className={`rounded-chip px-2 py-0.5 text-xs font-semibold ${location.isActive ? "bg-success-soft text-success" : "bg-background-soft text-text-muted"}`}
                      >
                        {location.isActive ? "Active" : "Hidden"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {location.addressLine}, {location.city}, {location.state}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {location.code} · {location.openingHours}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(location._id)}
                  className={ADMIN_SECONDARY_BUTTON_CLASS}
                >
                  Edit location
                </button>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default AdminPickupLocationsPage;
