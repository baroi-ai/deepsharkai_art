import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | DeepShark AI",
  description:
    "Understand how DeepShark AI collects, uses, and protects your personal data.",
  openGraph: {
    type: "website",
    url: "https://deepsharkai.art/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-gray-300">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white text-center">
            Privacy Policy
          </h1>
          <p className="text-center text-gray-400 mb-8">
            Last Updated: July 12, 2025
          </p>

          <div className="prose prose-invert prose-lg max-w-none space-y-6">
            <p>
              Welcome to DeepShark AI ("we," "our," or "us"). We are committed
              to protecting your privacy. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you
              use our website and services (collectively, the "Services").
            </p>
            {/* ... [Rest of your Privacy content] ... */}

            <h2>8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us at:{" "}
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
