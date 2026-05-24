import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Lock, Save } from "lucide-react";

export default function UserSettings() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your account preferences.</p>
      </div>

      <div className="glass rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center gap-4 pb-4 border-b border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center">
            <User className="w-6 h-6 text-brand" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-200">{user?.email || "admin@protechgarage.com"}</div>
            <div className="text-xs text-zinc-500">Administrator</div>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="email"
              defaultValue={user?.email || "admin@protechgarage.com"}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-brand/50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">Current Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-zinc-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-brand/50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-zinc-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-brand/50"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 bg-brand text-zinc-900 font-semibold py-2.5 rounded-xl text-sm hover:bg-brand-dim transition-colors mt-2"
        >
          <Save className="w-4 h-4" />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Account Info</h2>
        <div className="flex flex-col gap-3">
          {[
            { label: "Plan", value: "Pro" },
            { label: "Backend", value: "ai-receptionist-app-sy82.onrender.com" },
            { label: "Version", value: "1.0.0" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-xs text-zinc-500">{label}</span>
              <span className="text-xs text-zinc-300 font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
