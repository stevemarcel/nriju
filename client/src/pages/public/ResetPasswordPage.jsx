import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { Lock, ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

const ResetPasswordPage = () => {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="text-center mb-8">
        <h1 className="font-heading text-3xl font-bold text-text">Reset Your Password</h1>
        <p className="text-text-muted mt-1">Enter your new password below</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-8">
        {done ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-bold mb-2">Password Reset!</h2>
            <p className="text-text-muted text-sm mb-6">
              Your password has been updated. You can now sign in.
            </p>
            <Link
              to="/login"
              className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg inline-block"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text mb-2">Reset Token</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                  placeholder="Paste your reset token"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-primary/95 disabled:opacity-50 transition-colors"
              >
                {loading ? "Resetting..." : "Reset Password"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-text-muted hover:text-primary"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export { ResetPasswordPage };
