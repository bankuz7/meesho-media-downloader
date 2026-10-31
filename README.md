# Meesho Media Downloader

Beautiful web UI to extract & download all photos and videos from any Meesho product page.

![Meesho pink theme](https://img.shields.io/badge/Meesho-Pink-ff2d8e)

## Features

- 🔗 Paste any Meesho product URL
- 🖼️ Extracts high-quality images (jpg/webp/avif) + videos (mp4)
- 📦 One-click **Download All as ZIP**
- 📱 Responsive modern UI (pink/fuchsia Meesho-inspired theme)
- ⚡ Built with Next.js 14 + Tailwind

## Important Note about Blocking

Meesho uses strong bot protection (Akamai). Cloud servers (including Vercel free tier) are often blocked.

- **Best reliability**: Use the original Python CLI on your own computer.
- The web version may work intermittently depending on the Vercel region / time.

## Local Development

```bash
cd meesho-media-downloader
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

Import this repo in Vercel. Framework: Next.js.

## Original Python CLI

```bash
pip install requests
python meesho_downloader.py "https://www.meesho.com/.../p/xxxxx"
```

## License

MIT – for personal / educational use only.
