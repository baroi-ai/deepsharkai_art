import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

const NewPasswordClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: "Reset Password | DeepShark AI",
  robots: { index: false, follow: false },
};

export default function NewPasswordPage() {
  return <NewPasswordClient />;
}
