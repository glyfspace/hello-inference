"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { z } from "zod";

const MAX_BYTES = 10 * 1024 * 1024;

const MetadataSchema = z.object({
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  durationSeconds: z.number().nonnegative(),
  frameRate: z.number().nonnegative(),
});

const AnalyzeResponseSchema = z.object({
  id: z.string().min(1),
  metadata: MetadataSchema,
});

type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

const HealthResponseSchema = z.object({
  status: z.literal("ok"),
});

const FileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_BYTES, {
    message: "Video must be 10MB or less.",
  })
  .refine((file) => file.type.startsWith("video/") || file.name.endsWith(".mp4"), {
    message: "Please upload a video file.",
  });

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

const formatNumber = (value: number, fractionDigits = 2) =>
  Number.isFinite(value) ? value.toFixed(fractionDigits) : "—";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AnalyzeResponse | null>(null);
  const [isModalUp, setIsModalUp] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const baseUrl = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_MODAL_BASE_URL ?? "";
    return raw.replace(/\/$/, "");
  }, []);

  const videoUrl = response ? `${baseUrl}/video/${response.id}` : null;

  useEffect(() => {
    if (!baseUrl) {
      setIsModalUp(false);
      return;
    }

    let isMounted = true;

    const checkHealth = async () => {
      setIsChecking(true);
      try {
        const res = await fetch(`${baseUrl}/health`, { cache: "no-store" });
        if (!res.ok) throw new Error("Health check failed");
        const json = await res.json();
        const parsed = HealthResponseSchema.safeParse(json);
        if (isMounted) setIsModalUp(parsed.success);
      } catch {
        if (isMounted) setIsModalUp(false);
      } finally {
        if (isMounted) {
          setLastCheckedAt(new Date());
          setIsChecking(false);
        }
      }
    };

    void checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [baseUrl]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResponse(null);

    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }

    const parsed = FileSchema.safeParse(selected);
    if (!parsed.success) {
      setFile(null);
      setError(parsed.error.errors[0]?.message ?? "Invalid file.");
      return;
    }

    setFile(selected);
  };

  const onUpload = async () => {
    if (!file) return;
    if (!baseUrl) {
      setError("Missing NEXT_PUBLIC_MODAL_BASE_URL env var.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${baseUrl}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed with status ${res.status}`);
      }

      const json = await res.json();
      const parsed = AnalyzeResponseSchema.safeParse(json);

      if (!parsed.success) {
        throw new Error("Modal response failed validation.");
      }

      setResponse(parsed.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <span className="badge badge-outline badge-lg w-fit">Styleframe</span>
          <div className="flex items-center gap-2 text-sm text-base-content/70">
            <span
              className={`h-2 w-2 rounded-full ${isModalUp ? "bg-success" : "bg-error"
                }`}
            />
            <span>{isModalUp ? "Modal up" : "Modal offline"}</span>
            {isChecking ? (
              <span className="flex items-center gap-1">
                <span className="loading loading-spinner loading-xs" />
                <span>Checking...</span>
              </span>
            ) : null}
            <span className="text-xs text-base-content/50">
              {lastCheckedAt
                ? `Last checked ${lastCheckedAt.toLocaleTimeString()}`
                : "Not checked yet"}
            </span>
          </div>
          <h1 className="text-4xl font-bold">Styleframe Video Interview</h1>
          <p className="text-base-content/70 max-w-2xl">
            A clean, welcoming way to upload a video (10MB max), let Modal transcode
            it, and preview the result alongside the metadata.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body gap-4">
              <h2 className="card-title">Upload</h2>
              <input
                type="file"
                accept="video/*"
                className="file-input file-input-bordered file-input-primary"
                onChange={onFileChange}
              />
              <div className="text-sm text-base-content/60">
                Max size: 10MB
              </div>
              <button
                className="btn btn-primary"
                type="button"
                onClick={onUpload}
                disabled={!file || loading}
              >
                {loading ? "Uploading..." : "Upload & transcode"}
              </button>
              {error ? (
                <div className="alert alert-error">
                  <span>{error}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body gap-4">
              <h2 className="card-title">Metadata</h2>
              {response ? (
                <div className="grid gap-3 text-sm">
                  <div className="stats stats-vertical shadow">
                    <div className="stat">
                      <div className="stat-title">Resolution</div>
                      <div className="stat-value text-2xl">
                        {response.metadata.width} x {response.metadata.height}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Duration</div>
                      <div className="stat-value text-2xl">
                        {formatDuration(response.metadata.durationSeconds)}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Frame rate</div>
                      <div className="stat-value text-2xl">
                        {formatNumber(response.metadata.frameRate)} fps
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-base-content/60">
                  Upload a video to see metadata.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="card bg-base-100 shadow-xl">
          <div className="card-body gap-4">
            <h2 className="card-title">Transcoded output</h2>
            {videoUrl ? (
              <video
                className="w-full rounded-box border border-base-200"
                controls
                src={videoUrl}
              />
            ) : (
              <p className="text-sm text-base-content/60">
                The transcoded video will appear here after upload.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
