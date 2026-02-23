import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading DeepShark AI...
        </p>
      </div>
    </div>
  );
}
