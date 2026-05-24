import { useState } from "react";
import { getAppointments, createAppointment } from "../services/api";
import { useFetch } from "../hooks/useFetch";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { formatDate, formatTime } from "../utils/formatters";
import { Calendar, Plus, X } from "lucide-react";

const FAKE_APPTS = [
  { id: 1, customer_name: "James Rivera", service: "Oil Change", appointment_time: new Date().toISOString(), phone: "+15550123456" },
  { id: 2, customer_name: "Sarah Kim", service: "Brake Inspection", appointment_time: new Date().toISOString(), phone: "+15559876543" },
  { id: 3, customer_name: "Mike Torres", service: "Tire Rotation", appointment_time: new Date().toISOString(), phone: "+15554567890" },
];

export default function Appointments() {
  const { data, loading, error } = useFetch(getAppointments, []);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customer_name: "", service: "", appointment_time: "", phone: "" });

  const appointments = data?.appointments || data || FAKE_APPTS;

  const handleSave = async () => {
    setSaving(true);
    try {
      await createAppointment(form);
      setShowForm(false);
      setForm({ customer_name: "", service: "", appointment_time: "", phone: "" });
    } catch (e) {
      alert("Failed to save appointment");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: "Customer Name", key: "customer_name", type: "text", placeholder: "James Rivera" },
    { label: "Service", key: "service", type: "text", placeholder: "Oil Change" },
    { label: "Phone", key: "phone", type: "tel", placeholder: "+1 555 000 0000" },
    { label: "Date and Time", key: "appointment_time", type: "datetime-local", placeholder: "" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Appointments</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage all scheduled appointments.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand text-zinc-900 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-brand-dim transition-colors"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-zinc-200">New Appointment</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-zinc-400" /></button>
            </div>
            <div className="flex flex-col gap-3">
              {fields.map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-zinc-400 mb-1.5 block">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-brand/50"
                  />
                </div>
              ))}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-brand text-zinc-900 font-semibold py-2.5 rounded-xl text-sm mt-2 hover:bg-brand-dim transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} /> : (
          <div className="divide-y divide-white/5">
            {appointments.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">No appointments yet.</div>
            )}
            {appointments.map((appt) => (
              <div key={appt.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{appt.customer_name}</div>
                    <div className="text-xs text-zinc-500">{appt.service}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-300">{formatDate(appt.appointment_time)}</div>
                  <div className="text-xs text-zinc-500">{formatTime(appt.appointment_time)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
