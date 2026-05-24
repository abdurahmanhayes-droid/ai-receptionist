import { useState, useEffect } from "react";
import { getConfig, updateConfig } from "../services/api";
import { useFetch } from "../hooks/useFetch";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { Bot, Save } from "lucide-react";

const FAKE_CONFIG = {
  greeting: "Thank you for calling ProTech Garage! How can I help you today?",
  business_name: "ProTech Garage",
  business_hours: "Monday to Friday, 8am to 6pm",
  services: "Oil changes, brake inspection, tire rotation, engine diagnostics",
  voicemail_enabled: true,
  appointment_booking: true,
};

export default function AISettings() {
  const { data, loading, error } = useFetch(getConfig, []);
  const [form, setForm] = useState(FAKE_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm({ ...FAKE_CONFIG, ...data });
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">AI Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">Configure how your AI receptionist behaves.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand text-zinc-900 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-brand-dim transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saved ? "Saved!" : saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="glass rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-brand" />
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-200">AI Receptionist Config</div>
            <div className="text-xs text-zinc-500">Changes apply to all future calls</div>
          </div>
        </div>

        {[
          { label: "Business Name", key: "business_name", type: "text", placeholder: "ProTech Garage" },
          { label: "Business Hours", key: "business_hours", type: "text", placeholder: "Mon-Fri 8am-6pm" },
          { label: "Services Offered", key: "services", type: "text", placeholder: "Oil change, brakes..." },
        ].map(({ label, key, type, placeholder }) => (
          <div key={key}>
            <label className="text-xs text-zinc-400 mb-1.5 block">{label}</label>
            <input
              type={type}
              placeholder={placeholder}
              value={form[key] || ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-brand/50"
            />
          </div>
        ))}

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">Greeting Message</label>
          <textarea
            rows={3}
            value={form.greeting || ""}
            onChange={(e) => setForm({ ...form, greeting: e.target.value })}
            className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-brand/50 resize-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          {[
            { label: "Enable Voicemail", key: "voicemail_enabled" },
            { label: "Enable Appointment Booking", key: "appointment_booking" },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <span className="text-sm text-zinc-300">{label}</span>
              <button
                onClick={() => setForm({ ...form, [key]: !form[key] })}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  form[key] ? "bg-brand" : "bg-zinc-700"
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form[key] ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
