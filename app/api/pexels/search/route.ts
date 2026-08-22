import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "PEXELS_API_KEY is not configured in Vercel." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ error: "A search query is required." }, { status: 400 });
  }

  const pexelsResponse = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=9&orientation=landscape`,
    {
      headers: { Authorization: apiKey },
      next: { revalidate: 3600 },
    },
  );

  if (!pexelsResponse.ok) {
    return NextResponse.json(
      { error: "Pexels photo search is currently unavailable." },
      { status: 502 },
    );
  }

  const payload = await pexelsResponse.json();

  const photos = (payload.photos ?? []).map(
    (photo: {
      id: number;
      alt?: string;
      photographer: string;
      photographer_url: string;
      src: { large: string; medium: string };
    }) => ({
      id: photo.id,
      imageUrl: photo.src.large,
      thumbnailUrl: photo.src.medium,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      alt: photo.alt || query,
    }),
  );

  return NextResponse.json({ photos });
}
