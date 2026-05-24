export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-700"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand animate-spin"></div>
      </div>
    </div>
  );
}
