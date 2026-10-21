import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Home } from "lucide-react";

// One-step-back button. Falls back to `to` when there is no history to
// step back through (direct access, first load) — otherwise the browser's
// back button would do nothing and the user would be stuck.
const BackButton = ({ to, label = "Back" }) => {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(to);
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors whitespace-nowrap"
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
};

// Breadcrumb trail, e.g. <Breadcrumb crumbs={[{label:"Account",to:"/account"},{label:"Orders"}]} />
const Breadcrumb = ({ crumbs }) => {
  if (!crumbs?.length) return null;

  const trail = crumbs.filter((crumb, index) => !(index === 0 && crumb.to === "/"));

  return (
    <nav className="flex min-w-0 items-center gap-1.5" aria-label="Breadcrumb">
      <Link
        to="/"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-soft text-text-muted transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Home"
      >
        <Home className="size-4" aria-hidden="true" />
      </Link>
      {trail.length > 0 && (
        <ChevronRight className="size-3.5 shrink-0 text-text-muted/60" aria-hidden="true" />
      )}
      <ol className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        {trail.map((crumb, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={crumb.label + i} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="size-3.5 shrink-0 text-text-muted/60" aria-hidden="true" />
              )}
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  className="max-w-32 truncate rounded-md bg-background-soft px-2.5 py-1 text-sm font-medium text-text-muted transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:max-w-48"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="max-w-36 truncate px-1 text-sm font-semibold text-primary sm:max-w-56"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export { BackButton, Breadcrumb };
