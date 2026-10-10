import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { Mail, ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="text-center mb-8">
        <h1 className="font-heading text-3xl font-bold text-text">Reset Your Password</h1>
        <p className="text-text-muted mt-1">We'll send a reset link to your email</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-8">
        {sent ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-bold mb-2">Check Your Email</h2>
            <p className="text-text-muted text-sm mb-6">
              If <strong>{email}</strong> is registered, you'll receive a password reset link
              shortly.
            </p>
            <Link to="/login" className="text-primary font-medium hover:underline">
              Back to Login
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
                <label className="block text-sm font-medium text-text mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-primary/95 disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending..." : "Send Reset Link"}
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

export { ForgotPasswordPage };
