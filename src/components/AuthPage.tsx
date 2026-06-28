import React, { useState } from "react";
import { Shield, Mail, Lock, User, HelpCircle, Info } from "lucide-react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../firebase";

interface AuthPageProps {
  onLoginSuccess: (user: { email: string; name: string; role: "citizen" | "authority"; userId: string }) => void;
}

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!isFirebaseConfigured) {
      // Simulating authentication directly during local setup phase
      setTimeout(() => {
        const isAuthorityEmail = email.toLowerCase().includes("authority") || 
                                email.toLowerCase().includes("gov") || 
                                email.toLowerCase().includes("admin");
        onLoginSuccess({
          email: email || "citizen@example.com",
          name: name || (isAuthorityEmail ? "Officer Smith" : "John Citizen"),
          role: isAuthorityEmail ? "authority" : "citizen",
          userId: email || "citizen@example.com"
        });
        setLoading(false);
      }, 600);
      return;
    }

    try {
      if (!auth) {
        throw new Error("Firebase Auth is uninitialized.");
      }

      if (isSignUp) {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: name || "Anonymous Citizen"
        });
        
        // Infer role from email address (contains "authority" or "gov" or "admin")
        const isAuthorityEmail = email.toLowerCase().includes("authority") || 
                                email.toLowerCase().includes("gov") || 
                                email.toLowerCase().includes("admin");
        
        onLoginSuccess({
          email: userCredential.user.email || email,
          name: name || "Anonymous Citizen",
          role: isAuthorityEmail ? "authority" : "citizen",
          userId: userCredential.user.uid
        });
      } else {
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const isAuthorityEmail = (userCredential.user.email || "").toLowerCase().includes("authority") || 
                                (userCredential.user.email || "").toLowerCase().includes("gov") || 
                                (userCredential.user.email || "").toLowerCase().includes("admin");
        
        onLoginSuccess({
          email: userCredential.user.email || email,
          name: userCredential.user.displayName || "Active Citizen",
          role: isAuthorityEmail ? "authority" : "citizen",
          userId: userCredential.user.uid
        });
      }
    } catch (err: any) {
      console.warn("Authentication failed:", err);
      setError(err.message || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: "citizen" | "authority") => {
    setError("");
    setLoading(true);
    const email = role === "citizen" ? "citizen@example.com" : "authority@example.com";
    const name = role === "citizen" ? "John Citizen" : "Officer Smith (Public Works)";
    const password = "Password123!";

    if (!isFirebaseConfigured) {
      // Local simulation bypass
      setTimeout(() => {
        onLoginSuccess({
          email,
          name,
          role,
          userId: email
        });
        setLoading(false);
      }, 300);
      return;
    }

    try {
      if (!auth) {
        throw new Error("Firebase Auth is uninitialized.");
      }

      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        if (
          signInErr.code === "auth/user-not-found" || 
          signInErr.code === "auth/invalid-credential" ||
          signInErr.code === "auth/invalid-login-credentials"
        ) {
          // If user doesn't exist, create it
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(userCredential.user, {
            displayName: name
          });
        } else {
          throw signInErr;
        }
      }

      onLoginSuccess({
        email: userCredential.user.email || email,
        name: userCredential.user.displayName || name,
        role: role,
        userId: userCredential.user.uid
      });
    } catch (err: any) {
      console.warn("Firebase quick login failed:", err);
      setError(err.message || "Quick login failed. Please ensure Firebase services are active and reachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-6" id="auth-page-container">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden" id="auth-card">
        {/* Header decoration */}
        <div className="bg-slate-900 px-8 py-8 text-center text-white" id="auth-header">
          <div className="mx-auto w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-teal-500/20" id="auth-logo-bg">
            <Shield className="w-6 h-6 text-slate-950" id="auth-shield-icon" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" id="auth-title">CommunityHeroAI</h1>
          <p className="text-slate-400 text-sm mt-1" id="auth-subtitle">AI-powered Civic Issue Reporting Platform</p>
        </div>

        <div className="p-8" id="auth-body">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm" id="auth-error-msg">
              {error}
            </div>
          )}

          {!isFirebaseConfigured && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-slate-800 rounded-xl text-xs space-y-2.5 shadow-sm animate-pulse-slow" id="firebase-guide-banner">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <HelpCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>Connect your "community-hero-ai" project</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                This application is set up for your Firebase project <strong>community-hero-ai</strong>. To enable cloud database synchronizations:
              </p>
              <ol className="list-decimal list-inside pl-1 text-slate-600 space-y-1">
                <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline text-amber-800 font-semibold hover:text-amber-950">Firebase Console</a>.</li>
                <li>Create/Select the project: <strong>community-hero-ai</strong>.</li>
                <li>Go to <strong>Project Settings</strong>, and register a Web App.</li>
                <li>Copy the configuration keys and replace the placeholder object in <code>src/firebase.ts</code>.</li>
              </ol>
              <div className="pt-2 border-t border-amber-200/50 text-[10px] text-amber-800 leading-normal font-medium">
                💡 Currently running in <strong>Local Simulation Mode</strong>. Any email/password will work. Your reports will persist in local storage.
              </div>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4" id="auth-form">
            {isSignUp && (
              <div id="auth-name-group">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="auth-name-input">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="auth-name-input"
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div id="auth-email-group">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="auth-email-input">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>
            </div>

            <div id="auth-pass-group">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="auth-password-input">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15 disabled:opacity-50"
            >
              {loading ? "Processing..." : isSignUp ? "Create Citizen Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center" id="auth-toggle-container">
            <button
              id="auth-toggle-btn"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-slate-500 hover:text-teal-600 transition-colors underline underline-offset-4"
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Create one"}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100" id="quick-login-section">
            <span className="block text-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Developer Quick Entry
            </span>
            <div className="grid grid-cols-2 gap-3" id="quick-login-grid">
              <button
                id="quick-login-citizen-btn"
                onClick={() => handleQuickLogin("citizen")}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 text-xs font-medium rounded-lg transition-all"
              >
                <User className="w-3.5 h-3.5" />
                Citizen Portal
              </button>
              <button
                id="quick-login-authority-btn"
                onClick={() => handleQuickLogin("authority")}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 text-xs font-medium rounded-lg transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                Authority Portal
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Note: Quick login bypasses server auth for frictionless local testing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
