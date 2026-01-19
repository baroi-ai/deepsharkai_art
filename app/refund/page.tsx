import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Refund Policy | DeepShark AI",
  description:
    "Review the refund and cancellation policy for credit purchases and subscriptions.",
  openGraph: {
    type: "website",
    url: "https://deepsharkai.art/refund",
  },
};

export default function RefundPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-gray-300">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white text-center">
            Refund Policy
          </h1>
          <p className="text-center text-gray-400 mb-8">
            Last Updated: July 12, 2025
          </p>

          <div className="prose prose-invert prose-lg max-w-none space-y-6">
            {/* ... [Paste your Refund Policy content here] ... */}
            <h2>Overview</h2>
            <p>
              At DeepShark AI, we are committed to customer satisfaction. This
              policy outlines the terms under which refunds may be issued for
              our digital products, including one-time Credit purchases and
              recurring subscriptions.
            </p>
            {/* ... [Rest of your content] ... */}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
