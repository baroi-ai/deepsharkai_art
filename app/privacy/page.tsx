import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

// ✅ THE MAGIC BULLET
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy | DeepShark AI",
  description:
    "Read our Privacy Policy to understand how DeepShark AI collects, uses, and protects your personal data and creative content.",
  keywords: [
    "privacy policy",
    "data protection",
    "deepshark ai privacy",
    "user data rights",
    "ai security",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Privacy Policy - DeepShark AI",
    description: "How we protect your data and privacy.",
    type: "website",
    url: "https://deepsharkai.art/privacy",
  },
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-gray-300">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white text-center">
            Privacy Policy
          </h1>
          <p className="text-center text-gray-400 mb-12">
            Last Updated: January 23, 2026
          </p>

          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <p className="lead text-xl text-gray-300">
              Welcome to DeepShark AI. We believe in privacy by design. We
              strictly limit the data we collect to the absolute minimum
              required to provide our services.
            </p>

            {/* --- 1. Data Collection --- */}
            <section className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
              <h2 className="text-2xl font-bold text-white mt-0">
                1. Information We Collect
              </h2>
              <p>
                We value your anonymity. When you create an account, we only
                collect:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li>
                  <strong className="text-teal-400">Name:</strong> To address
                  you within the app.
                </li>
                <li>
                  <strong className="text-teal-400">Email Address:</strong> For
                  authentication and account recovery purposes only.
                </li>
              </ul>
              <p className="mt-4">
                We <strong>do not</strong> collect phone numbers, physical
                addresses, or unnecessary logs of your browsing activity.
              </p>
            </section>

            {/* --- 2. Content Storage --- */}
            <section className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
              <h2 className="text-2xl font-bold text-white mt-0">
                2. Your Generated Content
              </h2>
              <p>
                When you generate images or videos using DeepShark AI, we save
                these files
                <strong>
                  {" "}
                  solely for the purpose of displaying them in your history
                </strong>
                . This allows you to easily access, download, or share your past
                creations.
              </p>
              <p className="mt-4">
                We do not use your private generations to train public models
                without your explicit consent.
              </p>
            </section>

            {/* --- 3. Deletion Policy --- */}
            <section className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
              <h2 className="text-2xl font-bold text-white mt-0">
                3. Permanent Deletion Policy
              </h2>
              <p>
                You have full control over your data. If you choose to delete a
                generated image or video from your dashboard:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li>
                  It is <strong>permanently deleted</strong> from our servers
                  immediately.
                </li>
                <li>
                  We <strong>do not</strong> keep backups, shadow copies, or
                  "trash cans" for deleted files.
                </li>
                <li>
                  Once you delete a file, it is gone forever and cannot be
                  recovered by us.
                </li>
              </ul>
            </section>

            <hr className="border-white/10 my-8" />

            {/* --- Contact --- */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please
                contact us at:
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
