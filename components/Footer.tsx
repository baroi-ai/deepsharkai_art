"use client";

import React from "react";
import Link from "next/link";
import { Youtube, Linkedin, Twitter, Instagram } from "lucide-react";

const Footer = () => {
  const socialLinks = [
    {
      Icon: Instagram,
      href: "https://www.instagram.com/baroi.ai/",
      label: "Instagram",
    },
    {
      Icon: Youtube,
      href: "https://www.youtube.com/@baroi_ai",
      label: "YouTube",
    },
    {
      Icon: Linkedin,
      href: "https://www.linkedin.com/in/subhodeepbaroi/",
      label: "LinkedIn",
    },
    { Icon: Twitter, href: "https://x.com/baroi_ai", label: "Twitter/X" },
  ];

  const navLinks = [
    { name: "Home", to: "/" },
    { name: "About", to: "/about" },
    { name: "Terms of Service", to: "/terms" },
    { name: "Refund policy", to: "/refund" },
    { name: "Privacy Policy", to: "/privacy" },
  ];

  return (
    <footer className="relative border-t border-white/10 pt-12 pb-8 overflow-hidden bg-slate-950">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold mb-2 text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]">
              Sharky AI
            </h3>
            <div className="flex justify-center md:justify-start space-x-4">
              {socialLinks.map(({ Icon, href, label }, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-slate-800/50 flex items-center justify-center text-gray-400 hover:text-teal-400 hover:bg-slate-800 transition-colors"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} Sharky AI. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 md:gap-x-6 text-sm text-gray-500">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.to}
                className="hover:text-gray-300 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
