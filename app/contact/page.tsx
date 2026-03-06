import { Metadata } from "next";
import ContactPageClient from "./client"; // Import your renamed client component

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Us | Support & Inquiries - DeepShark AI",
  description:
    "Get in touch with the DeepShark AI team. Whether you have questions about our AI tools, billing, or technical support, we're here to help.",
  keywords: [
    "contact deepshark ai",
    "ai support",
    "customer service",
    "deepshark email",
    "help center",
    "inquiries",
  ],
  openGraph: {
    title: "Contact DeepShark AI - We're Here to Help",
    description: "Need assistance? Reach out to our support team directly.",
    type: "website",
    // images: ["/og-contact.jpg"], // Optional
  },
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
