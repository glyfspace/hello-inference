# Styleframe Interview Template

Welcome to Styleframe’s interview template. A tiny “hello world” for how we do things. It turns a video upload into a clean MP4 plus metadata. It’s intentionally small: a single Next.js app for the UI and a Modal service that does the video work.

Monorepo layout:
- Next.js app: `apps/www`
- Modal inference service: `apps/inference`

## Setup

### Install JS deps

```bash
pnpm install
```

### Set env

```bash
cp apps/www/.env.example apps/www/.env.local
```

Fill `NEXT_PUBLIC_MODAL_BASE_URL` with the URL printed by `modal serve`.

### Python deps (UV)

```bash
cd apps/inference
uv sync
```

### Modal setup

You’ll need a Modal account for local development.

1) Sign up at modal.com. There is a free tier available.
2) In `apps/inference`, run:

```bash
uv run modal setup
```

That command will open a browser and connect your local CLI to your account.

## Development

```bash
pnpm dev
```

This runs (with SIGINT forwarding so Modal sees Ctrl+C):
- Next.js dev server (`apps/www`)
- Modal dev server (`modal serve src/inference/app.py`)

## Modal endpoints

- `POST /analyze` — multipart upload with field `file`
- `GET /video/{id}` — streams the transcoded MP4 (grayscale)
- `GET /health` — returns `{ "status": "ok" }`

The `/analyze` response returns:

```json
{
  "id": "<video-id>",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "durationSeconds": 12.34,
    "frameRate": 29.97
  }
}
```

Max upload size: 10MB (client + server enforced). Output is converted to MP4 H.264 and grayscale to make the transformation obvious.
