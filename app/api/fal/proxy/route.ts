import { route } from "@fal-ai/server-proxy/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const POST = async (req: NextRequest) => {
  // 1. Authenticate (Optional but recommended)
  // Prevent random people from uploading files to your Fal bucket
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // 2. Check the Target URL
  // The Fal client sends the destination URL in this header
  const targetUrl = req.headers.get("x-fal-target-url");

  // 3. ✅ ALLOW Storage Uploads
  // fal.storage.upload() usually hits endpoints containing "/storage/" or "fal.media"
  if (targetUrl?.includes("/storage/") || targetUrl?.includes("fal.media")) {
    return route.POST(req);
  }

  // 4. 🛑 BLOCK Model Inference
  // If the target is a model (e.g., "fal-ai/flux..."), block it.
  // This forces the frontend to use your /api/fal/generate route (which handles credits).
  return NextResponse.json(
    {
      message:
        "Direct model access blocked. Use the dedicated /api/fal endpoints.",
    },
    { status: 403 },
  );
};

// 5. Handle GET requests (Status checks)
// We generally allow GET requests so the client can check job status if needed,
// though your custom routes handle most of that.
export const GET = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return route.GET(req);
};
