import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

// ✅ THE MAGIC BULLET
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Refund Policy | DeepShark AI",
  description:
    "Review our strict no-refund policy for purchases and our credit protection guarantee for technical errors.",
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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white text-center">
            Refund Policy
          </h1>
          <p className="text-center text-gray-400 mb-12">
            Last Updated: January 23, 2026
          </p>

          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <p className="lead text-xl text-gray-300">
              At DeepShark AI, we strive to provide the best generation
              experience. However, due to the digital nature of our product
              (compute costs), we have a strict refund policy.
            </p>

            {/* --- 1. No Monetary Refunds --- */}
            <section className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
              <h2 className="text-2xl font-bold text-white mt-0">
                1. No Monetary Refunds
              </h2>
              <p>
                <strong>All purchases are final.</strong> We do not offer
                monetary refunds (cash, bank transfers, or card reversals) for
                any credit packages purchased on DeepShark AI.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li>
                  Once you purchase credits, they are immediately available for
                  use and cannot be exchanged back for currency.
                </li>
                <li>
                  Please double-check your order amount before confirming
                  payment.
                </li>
              </ul>
            </section>

            {/* --- 2. Technical Errors & Credit Refunds --- */}
            <section className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
              <h2 className="text-2xl font-bold text-white mt-0">
                2. Generation Errors & Credit Protection
              </h2>
              <p>
                While we do not refund money, we <strong>do</strong> protect
                your credits in the event of a system failure.
              </p>
              <p>
                If you attempt to generate an image or video and the system
                encounters an error (e.g., server timeout, model crash) where{" "}
                <strong>no content is generated</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li>
                  <strong>Automatic Refund:</strong> Our system is designed to
                  detect failures and will automatically refund the credits to
                  your balance instantly.
                </li>
                <li>
                  <strong>Manual Request:</strong> In rare cases where the
                  automatic refund fails, you can contact support (see below).
                  We will review the server logs, and if we confirm the
                  generation failed, we will manually restore your credits.
                </li>
              </ul>
            </section>

            {/* --- 3. Non-Refundable Scenarios --- */}
            <section className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
              <h2 className="text-2xl font-bold text-white mt-0">
                3. Non-Refundable Scenarios
              </h2>
              <p>
                We do <strong>not</strong> refund credits for:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li>
                  <strong>Dissatisfaction with Style:</strong> AI is creative
                  and unpredictable. Credits are charged for the{" "}
                  <em>compute time</em> used, not the artistic result.
                </li>
                <li>
                  <strong>User Prompts:</strong> Errors caused by user input
                  (e.g., typos in prompts) are not eligible for refunds.
                </li>
              </ul>
            </section>

            <hr className="border-white/10 my-8" />

            {/* --- Contact --- */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                Dispute a Transaction
              </h2>
              <p className="mb-4">
                If you believe a generation failed but your credits were not
                returned, please contact us with your account email and the
                approximate time of the error.
              </p>
              <a
                href="mailto:support@deepsharkai.art"
                className="text-xl font-medium text-teal-400 hover:text-teal-300 transition-colors hover:underline"
              >
                support@deepsharkai.art
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
