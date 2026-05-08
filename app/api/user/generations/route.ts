import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "../../../db";
import { imageGenerations } from "../../../db/schema";
import { eq, desc, lt, and, ilike, SQL } from "drizzle-orm";
// ✅ We MUST use getSignedViewUrl for privacy
import { deleteFromR2, getSignedViewUrl } from "@/lib/r2";

// GET: Fetch User's Generations with PRIVATE Signed URLs
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const search = searchParams.get("search") || "";
    const limit = 20;

    const filters: SQL[] = [eq(imageGenerations.userId, session.user.id)];
    if (search) filters.push(ilike(imageGenerations.prompt, `%${search}%`));
    if (cursor) filters.push(lt(imageGenerations.createdAt, new Date(cursor)));

    const data = await db
      .select()
      .from(imageGenerations)
      .where(and(...filters))
      .orderBy(desc(imageGenerations.createdAt))
      .limit(limit + 1);

    // 🔒 PRIVATE MAPPING: Generate a unique signature for every image
    const generationsWithSignedUrls = await Promise.all(
      data.map(async (gen) => {
        let rawPath = gen.imageUrl || "";
        let displayUrl = gen.fallbackUrl || ""; // Default to fallback if R2 fails

        if (rawPath) {
          let fileKey = "";

          // Case A: It's a Key (e.g., 'users/...')
          if (!rawPath.startsWith("http")) {
            fileKey = rawPath;
          }
          // Case B: It's an old full URL (e.g., 'r2.dev')
          else if (rawPath.includes("r2.dev")) {
            try {
              const urlObj = new URL(rawPath);
              fileKey = urlObj.pathname.startsWith("/")
                ? urlObj.pathname.substring(1)
                : urlObj.pathname;
            } catch (e) {
              console.error("URL Parsing failed:", rawPath);
            }
          }

          // 🌟 THE SIGNING STEP: This is what makes it private
          if (fileKey) {
            try {
              const signed = await getSignedViewUrl(fileKey);
              if (signed) displayUrl = signed;
            } catch (err) {
              console.error("Signing failed for:", fileKey);
            }
          }
        }

        return {
          ...gen,
          previewUrl: displayUrl, // This link works for 1 hour ONLY
        };
      }),
    );

    let nextCursor: string | null = null;
    if (generationsWithSignedUrls.length > limit) {
      const nextItem = generationsWithSignedUrls.pop();
      nextCursor = nextItem?.createdAt
        ? new Date(nextItem.createdAt).toISOString()
        : null;
    }

    return NextResponse.json({
      generations: generationsWithSignedUrls,
      nextCursor,
    });
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// DELETE: Remove a Generation
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    const lookupCondition = and(
      eq(imageGenerations.id, id),
      eq(imageGenerations.userId, session.user.id),
    );

    const items = await db
      .select()
      .from(imageGenerations)
      .where(lookupCondition)
      .limit(1);
    const item = items[0];

    if (!item)
      return NextResponse.json({ error: "Item not found" }, { status: 404 });

    if (item.imageUrl) {
      let fileKey = item.imageUrl;
      if (item.imageUrl.startsWith("http")) {
        try {
          const urlObj = new URL(item.imageUrl);
          fileKey = urlObj.pathname.startsWith("/")
            ? urlObj.pathname.substring(1)
            : urlObj.pathname;
        } catch (e) {}
      }

      if (fileKey.includes("users/")) {
        await deleteFromR2(fileKey);
      }
    }

    await db.delete(imageGenerations).where(lookupCondition);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
