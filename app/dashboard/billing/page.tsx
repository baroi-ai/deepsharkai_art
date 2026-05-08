import { Metadata } from "next";
// ✅ 1. Rename import to avoid the TypeScript naming conflict
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ 2. THE MAGIC BULLET: Skip static rendering to fix the useSearchParams error
export const dynamic = "force-dynamic";

// ✅ Use nextDynamic here
const BillingPageClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Billing...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Billing & Credits | DeepShark AI",
  description:
    "Manage your AI credits, view transaction history, and securely top up your wallet using PayPal or Razorpay.",
  // ⚠️ CRITICAL: Keeps this private page out of Google Search results
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Billing & Credits - DeepShark AI",
    description: "Manage your DeepShark AI wallet and credits.",
  },
};

export default function BillingPage() {
  return <BillingPageClient />;
}
