import { AlertCircle } from "lucide-react";

export default function ErrorState({ message = "Something went wrong" }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-zinc-400">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
