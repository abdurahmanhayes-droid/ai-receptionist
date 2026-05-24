import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCalls } from "../services/api";
import { useFetch } from "../hooks/useFetch";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { formatDate, formatTime, formatDuration, formatPhone } from "../utils/formatters";
import { Phone, PhoneMissed, Search } from "lucide-react";

const FAKE_CALLS = [
  { id: 1, caller_number: "+15550123456", duration: 142, status: "completed", created_at: new Date().toISOString(), summary: "Customer inquired about oil change pricing." },
  { id: 2, caller_number: "+15559876543", duration: 87, status: "completed", created_at: new Date().toISOString(), summary: "Appointment booked for brake inspection." },
  { id: 3, caller_number: "+15554567890", duration: 0, status: "missed", created_at: new Date().toISOString(), summary: "" },
  { id: 4, caller_number: "+15551234567", duration: 203, status: "completed", created_at: new Date().toISOString(), summary: "Customer asked about tire rotation." },
];

export default function Calls() {
  const navigate = useNavigate();
  const { data, loading, error } = useFetch(getCalls, []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const calls = data?.calls || data || FAKE_CALLS;

  const filtered = calls.filter((c) => {
    const matchSearch = (c.caller_number || "").includes(search);
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Calls</h1>
        <p className="text-sm text-zinc-500 mt-1">All inbound calls handled by your AI receptionist.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-brand/50"
          />
        </div>
        <div className="flex gap-2">
          {["all", "completed", "missed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm capitalize transition-all ${
                filter === f
                  ? "bg-brand text-zinc-900 font-semibold"
                  : "glass text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} /> : (
          <div className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">No calls found.</div>
            )}
            {filtered.map((call) => (
              <div
                key={call.id}
                onClick={() => navigate(`/calls/${call.id}`)}
                className="flex items-center justify-between px-5 py-4 hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    call.status === "completed" ? "bg-brand/10" : "bg-red-500/10"
                  }`}>
                    {call.status === "completed"
                      ? <Phone className="w-4 h-4 text-brand" />
                      : <PhoneMissed className="w-4 h-4 text-red-400" />
                    }
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{formatPhone(call.caller_number)}</div>
                    <div className="text-xs text-zinc-500">{formatDate(call.created_at)} · {formatTime(call.created_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-400 hidden sm:block">{formatDuration(call.duration)}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${
                    call.status === "completed" ? "bg-brand/10 text-brand" : "bg-red-500/10 text-red-400"
                  }`}>
                    {call.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
