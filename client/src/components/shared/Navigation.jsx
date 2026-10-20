import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";

// One-step-back button. Falls back to `to` when there is no history to
// step back through (direct access, first load) — otherwise the browser's
// back button would do nothing and the user would be stuck.
export const BackButton = ({ to, label = "Back" }) => {
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
export const Breadcrumb = ({ crumbs }) => {
  if (!crumbs?.length) return null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        const content = (
          <span
            className={`text-sm font-medium truncate ${isLast ? "text-text" : "text-text-muted"}`}
          >
            {crumb.label}
          </span>
        );

        return (
          <div key={crumb.label + i} className="flex items-center gap-2 min-w-0">
            {i > 0 && <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />}
            {crumb.to && !isLast ? <BackButton to={crumb.to} label="Back" /> : content}
          </div>
        );
      })}
    </div>
  );
};
