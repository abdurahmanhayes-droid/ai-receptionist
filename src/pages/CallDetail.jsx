import { useParams, useNavigate } from "react-router-dom";
import { getCall } from "../services/api";
import { useFetch } from "../hooks/useFetch";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { formatDate, formatTime, formatDuration, formatPhone } from "../utils/formatters";
import { ArrowLeft, Phone, Clock, Calendar } from "lucide-react";

export default function CallDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useFetch(() => getCall(id), [id]);

  const call = data?.call || data || null;

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate("/calls")}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Calls
      </button>

      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} /> : !call ? (
        <ErrorState message="Call not found" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="glass rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-zinc-100 mb-6">Call Details</h1>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Caller</span>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-brand" />
                  <span className="text-sm text-zinc-200">{formatPhone(call.caller_number)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Duration</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-brand" />
                  <span className="text-sm text-zinc-200">{formatDuration(call.duration)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Date</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-brand" />
                  <span className="text-sm text-zinc-200">{formatDate(call.created_at)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Status</span>
                <span className={`text-xs px-2.5 py-1 rounded-full w-fit ${
                  call.status === "completed" ? "bg-brand/10 text-brand" : "bg-red-500/10 text-red-400"
                }`}>
                  {call.status}
                </span>
              </div>
            </div>
          </div>

          {call.summary && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-zinc-300 mb-3">AI Summary</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">{call.summary}</p>
            </div>
          )}

          {call.transcript && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-zinc-300 mb-3">Transcript</h2>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{call.transcript}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
