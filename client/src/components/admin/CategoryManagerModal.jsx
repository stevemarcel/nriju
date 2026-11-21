import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  Edit3,
  FolderOpen,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import usePageScrollLock from "../../hooks/usePageScrollLock";
import api from "../../services/api";
import { getCategoryIcon } from "../../utils/categoryIcons";
import ImageUpload from "../ui/ImageUpload";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SECONDARY_BUTTON_CLASS,
  AdminModalHeader,
} from "./AdminModalPrimitives";

// * Default form shape for category creation and reset state.
const EMPTY_FORM = {
  name: "",
  description: "",
  image: "",
  sortOrder: "0",
};

// ? Sorts categories by numeric sortOrder ascending, then alphabetically by name.
const sortCategories = (categories) =>
  [...categories].sort(
    (first, second) =>
      (first.sortOrder ?? 0) - (second.sortOrder ?? 0) || first.name.localeCompare(second.name),
  );

// ? Maps a category model object onto form state shape for the category editor.
const formFromCategory = (category) => ({
  name: category?.name ?? "",
  description: category?.description ?? "",
  image: category?.image ?? "",
  sortOrder: String(category?.sortOrder ?? 0),
});

// ? Maps HTTP status codes onto human-readable user messages for category operations.
const getCategoryErrorMessage = (error, action) => {
  const status = error?.response?.status;

  if (error?.code === "ERR_NETWORK") {
    return `We couldn't ${action} the category. Check your connection and try again.`;
  }

  if (status === 401) return "Your session has expired. Sign in and try again.";
  if (status === 403) return "You don't have permission to manage categories.";
  if (status === 404) return "This category is no longer available. Refresh and try again.";
  if (status === 409) return "A category with this name already exists.";
  if (status >= 500) return `We couldn't ${action} the category right now. Try again shortly.`;

  return error?.response?.data?.message || `We couldn't ${action} the category. Try again.`;
};

const CategoryManagerModal = ({ categories, onClose, onCategoryRemoved }) => {
  // * Locks page scroll until component unmounts.
  usePageScrollLock(true);

  // * React Query hook to invalidate category cache on save/remove.
  const queryClient = useQueryClient();
  // * Refs for managing focus containment within the modal.
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  // * UI state: editor mode ("edit"/"create"), form data, and error message.
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const [uploading, setUploading] = useState(false);

  // * Focus management effect: traps focus on mount, restores focus on unmount.
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus?.();
    };
  }, []);

  // * Mutation for creating or updating a category; uses FormData to support file uploads.
  const saveMutation = useMutation({
    mutationFn: async ({ payload, imageFile }) => {
      const requestData = new FormData();
      requestData.append("payload", JSON.stringify(payload));
      if (imageFile) requestData.append("images", imageFile);

      if (editor?.mode === "edit") {
        return api.put(`/categories/${editor.category._id}`, requestData, {
          skipGlobalErrorToast: true,
        });
      }

      return api.post("/categories", requestData, { skipGlobalErrorToast: true });
    },
    onSuccess: (response) => {
      const savedCategory = response.data.data;

      queryClient.setQueryData(["categories"], (current = []) => {
        const next = current.some((category) => category._id === savedCategory._id)
          ? current.map((category) =>
              category._id === savedCategory._id ? savedCategory : category,
            )
          : [...current, savedCategory];

        return sortCategories(next);
      });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(editor?.mode === "edit" ? "Category updated." : "Category added.");
      setEditor(null);
      setForm(EMPTY_FORM);
      setFormError("");
    },
    onError: (error) => {
      setFormError(getCategoryErrorMessage(error, editor?.mode === "edit" ? "update" : "add"));
    },
  });

  // * Mutation for permanent category deletion.
  const removeMutation = useMutation({
    mutationFn: (category) =>
      api.delete(`/categories/${category._id}`, { skipGlobalErrorToast: true }),
    onSuccess: (_response, category) => {
      queryClient.setQueryData(["categories"], (current = []) =>
        current.filter((item) => item._id !== category._id),
      );
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      onCategoryRemoved?.(category._id);
      toast.success("Category removed.");
      setRemoveTarget(null);
    },
    onError: (error) => {
      toast.error(getCategoryErrorMessage(error, "remove"));
      setRemoveTarget(null);
    },
  });

  // * Derived state: true if any background network or file-upload operation is active.
  const isBusy = uploading || saveMutation.isPending || removeMutation.isPending;

  // ? Switches the modal to create or edit mode, re-populating form state.
  const openEditor = (category = null) => {
    setEditor(category ? { mode: "edit", category } : { mode: "create" });
    setForm(category ? formFromCategory(category) : EMPTY_FORM);
    setFormError("");
  };

  // ? Clears editor state and closes the form panel, if not currently busy saving.
  const closeEditor = () => {
    if (isBusy) return;
    setEditor(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  // ? Validates and submits category form data via saveMutation.
  const handleSubmit = (event) => {
    event.preventDefault();
    if (uploading) return;
    const name = form.name.trim();
    const sortOrder = Number(form.sortOrder);

    // ! Edge case: prevent submission with empty category name.
    if (!name) {
      setFormError("Enter a category name.");
      return;
    }

    // ! Edge case: sort order must be a non-negative integer.
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setFormError("Display order must be a whole number of 0 or more.");
      return;
    }

    setFormError("");
    const imageFile = form.image instanceof File ? form.image : null;
    saveMutation.mutate({
      payload: {
        name,
        description: form.description.trim(),
        image: typeof form.image === "string" ? form.image.trim() : "",
        sortOrder,
      },
      imageFile,
    });
  };

  // ? Implements focus containment: traps Tab/Shift+Tab navigation inside the modal.
  const handleDialogKeyDown = (event) => {
    // ! If user hits Escape, close active view (remove-target > editor > main).
    if (event.key === "Escape" && !isBusy) {
      if (removeTarget) setRemoveTarget(null);
      else if (editor) closeEditor();
      else onClose();
      return;
    }

    if (event.key !== "Tab") return;

    // ! Focus-trap logic: query all focusable elements; if list is empty, force focus to modal root.
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => element.getClientRects().length > 0);

    if (!focusable.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // ! Focus-wrap logic: if at first and Shift+Tab, wrap to last; if at last and Tab, wrap to first.
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // * Derived state: sorted view of the categories list.
  const titleId = "category-manager-title";
  const sortedCategories = sortCategories(categories);

  return (
    // * Outer overlay — catches clicks on backdrop to dismiss when idle.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onClose();
      }}
    >
      {/* Modal dialog root — contains focus trap and ARIA dialog role. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-card border border-border/60 bg-background text-text shadow-soft focus:outline-none"
      >
        {/* Modal header with close button */}
        <AdminModalHeader
          icon={FolderOpen}
          eyebrow="Product catalogue"
          title="Manage categories"
          titleId={titleId}
          onClose={onClose}
          closeLabel="Close category manager"
          closeDisabled={isBusy}
        />

        {!editor && !removeTarget ? (
          // * Main view: lists all categories with action buttons per item.
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="font-semibold text-text">
                  {sortedCategories.length} active categor
                  {sortedCategories.length === 1 ? "y" : "ies"}
                </p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  These options appear in product forms and storefront navigation.
                </p>
              </div>
              {/* Primary action: opens create form */}
              <button
                type="button"
                onClick={() => openEditor()}
                className={`${ADMIN_PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add category
              </button>
            </div>

            {/* Category list scroll area */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {sortedCategories.length ? (
                <ul className="space-y-3" aria-label="Active categories">
                  {sortedCategories.map((category) => {
                    const { Icon } = getCategoryIcon(category.name);

                    return (
                      <li
                        key={category._id}
                        className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background-soft/50 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {category.image ? (
                            // * Image thumbnail — use original asset or placeholder icon.
                            <img
                              src={category.image}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
                            />
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-text">{category.name}</p>
                            <p className="mt-0.5 line-clamp-1 text-sm text-text-secondary">
                              {category.description || "No description"}
                            </p>
                            <p className="mt-1 text-xs text-text-muted">
                              Display order {category.sortOrder ?? 0}
                            </p>
                          </div>
                        </div>

                        {/* Item actions — edit and remove triggers */}
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditor(category)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                          >
                            <Edit3 className="h-4 w-4" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(category)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-background px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-error-soft hover:text-destructive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                // * Empty state when no categories exist yet.
                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center">
                  <FolderOpen className="h-8 w-8 text-text-muted" aria-hidden="true" />
                  <h3 className="mt-4 font-heading text-lg font-bold text-text">
                    No categories yet
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-text-secondary">
                    Add the first category so products can be organised in the store.
                  </p>
                  <button
                    type="button"
                    onClick={() => openEditor()}
                    className={`${ADMIN_PRIMARY_BUTTON_CLASS} mt-5`}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add category
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : editor ? (
          // * Editor view: creates or updates a single category via form submission.
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6">
              {/* Back-button to return to main list */}
              <button
                type="button"
                onClick={closeEditor}
                disabled={isBusy}
                className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                All categories
              </button>

              {/* Form heading + context copy */}
              <div className="mb-6">
                <h3 className="font-heading text-xl font-bold text-text">
                  {editor.mode === "edit" ? "Edit category" : "Add category"}
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {editor.mode === "edit"
                    ? "Update how this category appears across the store."
                    : "Create a new category for products and storefront navigation."}
                </p>
              </div>

              {/* Two-column form fields: name, description, sort order, image */}
              <div className="grid items-start gap-5 sm:grid-cols-2">
                <div className="min-w-0 sm:col-span-2">
                  <label htmlFor="category-name" className="mb-1.5 block text-sm font-semibold">
                    Category name
                  </label>
                  <input
                    id="category-name"
                    type="text"
                    required
                    autoFocus
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    aria-invalid={Boolean(formError) || undefined}
                    className={ADMIN_FIELD_CLASS}
                  />
                </div>

                <div className="min-w-0 sm:col-span-2">
                  <label
                    htmlFor="category-description"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Description
                  </label>
                  <textarea
                    id="category-description"
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Optional short description"
                    className={`${ADMIN_FIELD_CLASS} resize-y`}
                  />
                </div>

                <div className="min-w-0 sm:max-w-xs">
                  <label
                    htmlFor="category-sort-order"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Display order
                  </label>
                  <input
                    id="category-sort-order"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                    aria-describedby="category-sort-order-hint"
                    className={ADMIN_FIELD_CLASS}
                  />
                  <p id="category-sort-order-hint" className="mt-1.5 text-xs text-text-secondary">
                    Lower numbers appear first.
                  </p>
                </div>

                <div className="min-w-0 sm:col-span-2">
                  <p className="mb-1.5 text-sm font-semibold">Category image</p>
                  <ImageUpload
                    initialImages={form.image ? [form.image] : []}
                    onChange={(images) =>
                      setForm((current) => ({
                        ...current,
                        image: images[0] ?? "",
                      }))
                    }
                    maxImages={1}
                    disabled={isBusy}
                    onUpload={setUploading}
                    imageLabel="Category image"
                    cropAspect={4 / 3}
                  />
                  <p className="mt-1.5 text-xs text-text-secondary">
                    Upload one JPG, PNG, or WebP image up to 10 MB.
                  </p>
                </div>
              </div>

              {/* Inline validation error — surfaces server-side message when present. */}
              {formError ? (
                <p
                  role="alert"
                  className="mt-5 rounded-xl border border-error-border bg-error-soft px-4 py-3 text-sm text-error"
                >
                  {formError}
                </p>
              ) : null}
            </div>

            {/* Footer: cancel and submit/save actions */}
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-border/60 bg-background px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeEditor}
                disabled={isBusy}
                className={ADMIN_SECONDARY_BUTTON_CLASS}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy}
                aria-busy={isBusy}
                className={ADMIN_PRIMARY_BUTTON_CLASS}
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {uploading
                  ? "Uploading image..."
                  : saveMutation.isPending
                    ? "Saving..."
                    : editor.mode === "edit"
                      ? "Save changes"
                      : "Add category"}
              </button>
            </div>
          </form>
        ) : (
          // * Remove confirmation view: asks before permanently deleting the target category.
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-error-soft text-destructive">
                <AlertTriangle className="h-8 w-8" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-heading text-xl font-bold text-text">Remove category?</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
                Remove &quot;{removeTarget.name}&quot; from category menus and new product
                selection? Products already assigned to it will not be deleted.
              </p>
            </div>

            {/* Footer: keep or confirm-remove actions */}
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-border/60 bg-background px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                autoFocus
                onClick={() => setRemoveTarget(null)}
                disabled={removeMutation.isPending}
                className={ADMIN_SECONDARY_BUTTON_CLASS}
              >
                Keep category
              </button>
              <button
                type="button"
                onClick={() => removeMutation.mutate(removeTarget)}
                disabled={removeMutation.isPending}
                aria-busy={removeMutation.isPending}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-destructive px-5 py-2 text-sm font-semibold text-on-accent shadow-sm transition-colors hover:bg-destructive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
                {removeMutation.isPending ? "Removing..." : "Remove category"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagerModal;
