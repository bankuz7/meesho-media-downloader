"use client";

import { useState } from "react";
import JSZip from "jszip";

type MediaItem = { url: string; type: "image" | "video" };

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [downloading, setDownloading] = useState(false);

  async function extract() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setMedia([]);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.error && (!data.media || data.media.length === 0)) {
        setError(data.error);
      } else if (data.media && data.media.length > 0) {
        const items: MediaItem[] = data.media.map((u: string) => ({
          url: u,
          type: u.includes(".mp4") ? "video" : "image",
        }));
        setMedia(items);
      } else {
        setError("No media found");
      }
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function downloadAll() {
    if (media.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        media.map(async (m, i) => {
          try {
            const r = await fetch(m.url);
            const blob = await r.blob();
            const ext = m.type === "video" ? "mp4" : "jpg";
            zip.file(`meesho_${i + 1}.${ext}`, blob);
          } catch {}
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "meesho-media.zip";
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-fuchsia-50 to-rose-50">
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-fuchsia-600 bg-clip-text text-transparent">
            Meesho Media Downloader
          </h1>
          <p className="text-gray-600 mt-2">
            Paste any Meesho product link and download all photos & videos
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.meesho.com/.../p/xxxxx"
              className="flex-1 px-4 py-3 rounded-xl border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
              onKeyDown={(e) => e.key === "Enter" && extract()}
            />
            <button
              onClick={extract}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Extracting..." : "Extract"}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          {media.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-gray-700">
                  {media.length} media found
                </span>
                <button
                  onClick={downloadAll}
                  disabled={downloading}
                  className="px-4 py-2 rounded-lg bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 disabled:opacity-50"
                >
                  {downloading ? "Zipping..." : "Download All ZIP"}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {media.map((m, i) => (
                  <a
                    key={i}
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl overflow-hidden border border-pink-100 hover:shadow-md"
                  >
                    {m.type === "video" ? (
                      <video src={m.url} className="w-full h-32 object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" className="w-full h-32 object-cover" />
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          Meesho may block cloud servers (Akamai). Python CLI on your PC is more reliable.
        </p>
      </main>
    </div>
  );
}
