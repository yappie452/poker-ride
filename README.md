# Poker Ride 🐎 ♠ ♥ ♦ ♣

A fully offline, installable web app (PWA) for trail rides. Riders scan a QR
code at each of five stations and draw one random playing card per station.
At the finish line they show their five-card poker hand. No internet is needed
during the ride, and no app store is involved.

## What's in this folder

```
poker-ride/
  index.html          App shell and all four screens
  app.js              Game logic: deck, draw, persistence, scanning, poker eval
  style.css           Card-table styling
  manifest.json       PWA manifest (name, icons, standalone display)
  service-worker.js   Offline caching (cache-first)
  img/                App icons (192px, 512px)
  qr/                 Printable station QR codes: station-S1.png … station-S5.png
  lib/                Optional jsQR decoder drop-in (see lib/README.txt)
```

## How a ride works

1. **Start screen** – the rider types their name and taps *Start Ride*.
2. **Scan screen** – the camera opens. The rider points it at a station's QR
   code. If the camera can't be used, five big **S1–S5 buttons** are always
   available as a tap-instead fallback.
3. **Card screen** – a large playing card is revealed for that station. Drawing
   the same station again always shows the *same* card (one card per station).
4. **Hand screen** – shows all drawn cards and automatically names the poker
   hand (pair, straight, flush, full house, etc.). *Restart Ride* clears
   everything for a fresh deal.

Each rider draws from their own 52-card deck with no duplicates, so every
station yields a distinct card. Progress is saved in `localStorage`, so closing
the browser, locking the phone, or rebooting does not lose the hand.

## Scanning support — important note

| Phone / browser            | Camera scanning | Manual buttons |
|----------------------------|-----------------|----------------|
| Android Chrome             | ✅ native        | ✅              |
| Desktop Chrome/Edge        | ✅ native        | ✅              |
| iPhone Safari (default)    | ⚠️ see below     | ✅              |

iPhone Safari has **no built-in QR-scanning API**. Out of the box, iPhone
riders use the always-present manual S1–S5 buttons (which are arguably easier
with gloves on horseback). To turn on **live camera scanning for iPhones**, add
the small optional `jsQR` library — see **`lib/README.txt`** for the one-file,
one-minute instructions. The app auto-detects it and needs no code changes.

## Hosting (one-time, requires internet only once)

The app needs HTTPS to install as a PWA and to use the camera. The easiest free
option is **GitHub Pages**:

1. Create a GitHub repository and upload the entire `poker-ride/` folder.
2. In the repo: **Settings → Pages → Deploy from branch → `main` / root**.
3. Your app appears at `https://<username>.github.io/<repo>/`.

Any static HTTPS host works too (Netlify, Cloudflare Pages, etc.). For a quick
local test: `cd poker-ride && python3 -m http.server 8000` then open
`http://localhost:8000` (camera needs HTTPS or `localhost`).

## Installing on a phone (riders, at check-in)

1. Open the app URL once while online (e.g. at the start gate).
2. **iPhone:** Share → *Add to Home Screen*. **Android:** menu → *Install app*
   / *Add to Home screen*.
3. Open it from the home-screen icon. It now runs fully offline for the ride.

## Station setup (organizer)

The `qr/` folder already contains print-ready signs for stations S1–S5. Each
QR code simply encodes the text `S1`, `S2`, … `S5`.

1. Print `qr/station-S1.png` … `qr/station-S5.png` (one per station).
2. Laminate them for weather.
3. Attach each to the post/tree/gate at the matching station.

Need more stations or to reprint? Any free QR generator works — just encode the
plain text `S6`, `S7`, etc., and add those IDs to the `STATIONS` list near the
top of `app.js`.

## Rider instructions (hand these out)

> 1. Open the **Poker Ride** app and enter your name.
> 2. At each station, scan the QR sign (or tap the matching S1–S5 button).
> 3. A card is dealt — you keep one card per station.
> 4. At the finish line, tap **View My Hand** and show your five cards.
> 5. Best poker hand wins!

## Privacy & offline

No backend, no accounts, no tracking. The camera feed is processed on-device
and never leaves the phone. All game data lives only in the phone's browser
storage and is cleared by *Restart Ride*.
