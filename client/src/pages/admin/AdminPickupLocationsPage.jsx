import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api";
import { AdminPageHeader, EmptyState, TableSkeleton } from "../../components/admin/AdminPrimitives";
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
  instructions: "",
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
  ["instructions", "Pickup instructions", "What customers should know"],
];

const LocationForm = ({
  initialValue = EMPTY_LOCATION,
  submitLabel,
  onSubmit,
  pending,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ ...value, sortOrder: Number(value.sortOrder) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      {LOCATION_FIELDS.map(([key, label, placeholder]) => (
        <div
          key={key}
          className={key === "addressLine" || key === "instructions" ? "sm:col-span-2" : ""}
        >
          <label htmlFor={`${initialValue._id || "new"}-${key}`} className={ADMIN_LABEL_CLASS}>
            {label}
          </label>
          <input
            id={`${initialValue._id || "new"}-${key}`}
            value={value[key] || ""}
            required={["name", "code", "addressLine", "city", "state", "openingHours"].includes(
              key,
            )}
            placeholder={placeholder}
            onChange={(event) => setValue((current) => ({ ...current, [key]: event.target.value }))}
            className={`${ADMIN_FIELD_CLASS} mt-1.5`}
          />
        </div>
      ))}
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
            setValue((current) => ({ ...current, sortOrder: event.target.value }))
          }
          className={`${ADMIN_FIELD_CLASS} mt-1.5`}
        />
      </div>
      <div>
        <span className={ADMIN_LABEL_CLASS}>Availability</span>
        <button
          type="button"
          aria-pressed={value.isActive}
          onClick={() => setValue((current) => ({ ...current, isActive: !current.isActive }))}
          className={`${ADMIN_SECONDARY_BUTTON_CLASS} mt-1.5 w-full`}
        >
          {value.isActive ? "Active for checkout" : "Hidden from checkout"}
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
      queryClient.invalidateQueries({ queryKey: ["admin", "pickup-locations"] });
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
        actions={
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
