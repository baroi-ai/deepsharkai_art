import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-gray-100 px-4">
      <div className="text-center max-w-md w-full">
        <h1 className="text-8xl md:text-9xl font-bold text-teal-500 mb-4 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]">
          404
        </h1>

        <p className="text-xl md:text-2xl text-gray-400 mb-8">
          Oops! Page Not Found
        </p>
        <p className="text-base text-gray-500 mb-8">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>

        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-medium rounded-md transition-colors duration-200"
        >
          <Home className="mr-2 h-5 w-5 " />
          Return to Home
        </Link>
      </div>
    </div>
  );
}
