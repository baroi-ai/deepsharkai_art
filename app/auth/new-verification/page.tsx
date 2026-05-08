import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ THE MAGIC BULLET (This is why we moved it to a Server Component!)
export const dynamic = "force-dynamic";

const NewVerificationClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: "Verify Email | DeepShark AI",
  robots: { index: false, follow: false },
};

export default function NewVerificationPage() {
  return <NewVerificationClient />;
}
