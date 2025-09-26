# Farmers Marketplace (React + Vite + Tailwind)

Blue & dark-pink themed marketplace for direct farmer-to-buyer sales with bulk ordering, product detail pages (farmer photo uploads in-memory), and a site-wide AI Assistant focused on agriculture. The assistant supports **voice input (Whisper)** and **voice output (TTS)** and auto-replies in the user's language.

## Quick Start
```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## OpenAI Setup
Create a `.env` file in the project root:
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```
> **Security Note:** Calling OpenAI directly from the browser exposes your key and may hit CORS depending on your region. For production, proxy these requests through a backend (Node/Express) and store the key server-side.

## Features
- Multi-page: Home, Shop, Services, Pricing, About, Contact
- Shop → Product details with farmer photo upload (demo memory)
- Bulk-order CTA
- Floating AI Assistant on every page
  - Farmer/Buyer guidance
  - Language auto-detect + reply in same language
  - Speech-to-Text (Whisper) and Text-to-Speech (TTS)

## Tech
- React + Vite
- TailwindCSS
- React Router
- OpenAI APIs (Chat Completions, Whisper, TTS)
