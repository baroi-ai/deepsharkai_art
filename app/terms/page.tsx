import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms and Conditions | DeepShark AI",
  description:
    "Read the terms and conditions for using the DeepShark AI platform and services.",
  openGraph: {
    type: "website",
    url: "https://deepsharkai.art/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-gray-300">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white text-center">
            Terms and Conditions
          </h1>
          <p className="text-center text-gray-400 mb-8">
            Last Updated: July 12, 2025
          </p>

          <div className="prose prose-invert prose-lg max-w-none space-y-6">
            <p>
              Please read these Terms and Conditions ("Terms") carefully before
              using the https://deepsharkai.art/ website (the "Service")
              operated by Subhodeep Baroi, doing business as DeepShark AI ("us",
              "we", or "our").
            </p>
            {/* ... [Rest of your Terms content remains exactly the same] ... */}
            <p>
              Your access to and use of the Service is conditioned upon your
              acceptance of and compliance with these Terms. These Terms apply
              to all visitors, users, and others who wish to access or use the
              Service.
            </p>

            <h2>1. Accounts</h2>
            <p>
              When you create an account with us, you guarantee that you are
              above the age of 13 and that the information you provide us is
              accurate, complete, and current at all times. You are responsible
              for safeguarding the password that you use to access the Service
              and for any activities or actions under your password.
            </p>

            {/* Truncated for brevity - PASTE YOUR FULL CONTENT HERE */}

            <h2>10. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at:{" "}
              <a
                href="mailto:support@sharkyai.xyz"
                className="text-teal-400 hover:underline"
              >
                support@sharkyai.xyz
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
