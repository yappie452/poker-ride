OPTIONAL QR DECODER (jsQR)
==========================

This folder is where the optional jsQR decoder goes. It is NOT required.

Without it, Poker Ride still works fully offline using:
  - the native barcode scanner on Android / Chrome, and
  - the manual "tap your station" buttons on every phone (including iPhone).

iPhone Safari has no built-in QR scanning API, so to enable LIVE CAMERA
scanning on iPhones, add jsQR:

  1. On any computer with internet, open:
        https://unpkg.com/jsqr@1.4.0/dist/jsQR.js
     and save the file.
  2. Rename it to:   jsQR.min.js
  3. Drop it into this /lib folder, then re-host the app.

The app auto-detects it: if lib/jsQR.min.js is present it is used for camera
scanning on all phones; if absent the app falls back automatically with no
errors.

(The offline sandbox that generated this project had no internet access, so
the file could not be bundled for you. Everything was built to work with or
without it.)
