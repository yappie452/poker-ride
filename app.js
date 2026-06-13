/* =====================================================================
   Poker Ride — offline trail-station card game
   No backend. State persists in localStorage under "pokerRideState".
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------- Config ---------------- */
  var STORAGE_KEY = "pokerRideState";
  var STATIONS = ["S1", "S2", "S3", "S4", "S5"];
  var RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  var SUITS = [
    { s: "S", glyph: "♠", red: false }, // spades
    { s: "H", glyph: "♥", red: true  }, // hearts
    { s: "D", glyph: "♦", red: true  }, // diamonds
    { s: "C", glyph: "♣", red: false }  // clubs
  ];
  var SUIT_MAP = {};
  SUITS.forEach(function (x) { SUIT_MAP[x.s] = x; });

  /* ---------------- State ---------------- */
  var state = null;

  function freshDeck() {
    var deck = [];
    for (var i = 0; i < SUITS.length; i++) {
      for (var j = 0; j < RANKS.length; j++) {
        deck.push({ r: RANKS[j], s: SUITS[i].s });
      }
    }
    return deck; // 52 cards
  }

  function newState(name) {
    return { name: name || "Rider", hand: {}, deck: freshDeck() };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || typeof s !== "object" || !s.deck || !s.hand) return null;
      return s;
    } catch (e) { return null; }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { toast("Could not save — storage full or blocked."); }
  }

  /* ---------------- Draw logic ---------------- */
  function drawForStation(sid) {
    if (state.hand[sid]) return state.hand[sid];        // already drawn
    if (state.deck.length === 0) return null;           // safety
    var idx = Math.floor(Math.random() * state.deck.length);
    var card = state.deck.splice(idx, 1)[0];
    state.hand[sid] = card;
    saveState();
    return card;
  }

  function drawnCount() {
    return STATIONS.filter(function (s) { return state.hand[s]; }).length;
  }

  /* ---------------- Screen routing ---------------- */
  var screens = {
    start: document.getElementById("screen-start"),
    scan:  document.getElementById("screen-scan"),
    card:  document.getElementById("screen-card"),
    hand:  document.getElementById("screen-hand")
  };
  var current = "start";

  function show(name) {
    if (current === "scan" && name !== "scan") stopScanner();
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle("active", k === name);
    });
    current = name;
    if (name === "scan") startScanner();
    if (name === "hand") renderHand();
    window.scrollTo(0, 0);
  }

  /* ---------------- Card rendering ---------------- */
  function renderCard(sid, card) {
    var suit = SUIT_MAP[card.s];
    document.getElementById("card-station-title").textContent =
      "Station " + sid.replace(/^S/i, "");
    var el = document.getElementById("playing-card");
    el.classList.toggle("red", suit.red);
    el.querySelector(".pc-suit-big").textContent = suit.glyph;
    var ranks = el.querySelectorAll(".pc-rank");
    ranks[0].textContent = card.r;
    ranks[1].textContent = card.r;
    // retrigger flip animation
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    document.getElementById("card-caption").textContent =
      cardName(card) + " of " + suitName(card.s);
    var n = drawnCount();
    document.getElementById("card-progress").textContent =
      n + " of " + STATIONS.length + " stations drawn" +
      (n === STATIONS.length ? " — ride complete!" : "");
  }

  function cardName(card) {
    var map = { J: "Jack", Q: "Queen", K: "King", A: "Ace" };
    return map[card.r] || card.r;
  }
  function suitName(s) {
    return { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" }[s];
  }

  /* ---------------- Hand screen ---------------- */
  function renderHand() {
    document.getElementById("hand-rider").textContent = state.name + "’s hand";
    var wrap = document.getElementById("hand-cards");
    wrap.innerHTML = "";
    var cards = [];
    STATIONS.forEach(function (sid) {
      var card = state.hand[sid];
      var div = document.createElement("div");
      if (!card) {
        div.className = "mini-card empty";
        div.innerHTML = "<span class='mini-rank'>?</span>" +
                        "<span class='mini-station'>" + sid + "</span>";
      } else {
        cards.push(card);
        var suit = SUIT_MAP[card.s];
        div.className = "mini-card" + (suit.red ? " red" : "");
        div.innerHTML =
          "<span class='mini-rank'>" + card.r + "</span>" +
          "<span class='mini-suit'>" + suit.glyph + "</span>" +
          "<span class='mini-station'>" + sid + "</span>";
      }
      wrap.appendChild(div);
    });

    var rankBox = document.getElementById("hand-rank");
    var prog = document.getElementById("hand-progress");
    if (cards.length === STATIONS.length) {
      var res = evaluateHand(cards);
      rankBox.innerHTML = "<div class='rank-name'>" + res.name + "</div>" +
                          "<div class='rank-desc'>" + res.desc + "</div>";
      rankBox.classList.remove("hidden");
      prog.textContent = "All stations complete. Show this hand at the finish line!";
    } else {
      var partial = evaluateHand(cards);
      rankBox.innerHTML = "<div class='rank-name'>" + partial.name + "</div>" +
        "<div class='rank-desc'>So far &middot; draw " +
        (STATIONS.length - cards.length) + " more station(s)</div>";
      rankBox.classList.toggle("hidden", cards.length === 0);
      prog.textContent = cards.length === 0
        ? "No cards yet — scan a station to begin."
        : cards.length + " of " + STATIONS.length + " stations drawn.";
    }
  }

  /* ---------------- Poker evaluation ---------------- */
  function rankVal(r) {
    return { J: 11, Q: 12, K: 13, A: 14 }[r] || parseInt(r, 10);
  }

  function evaluateHand(cards) {
    if (!cards.length) return { name: "No cards yet", desc: "" };
    var vals = cards.map(function (c) { return rankVal(c.r); }).sort(function (a, b) { return a - b; });
    var suits = cards.map(function (c) { return c.s; });

    var counts = {};
    vals.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
    var groups = Object.keys(counts).map(function (k) { return counts[k]; }).sort(function (a, b) { return b - a; });

    var isFlush = cards.length === 5 && suits.every(function (s) { return s === suits[0]; });
    var isStraight = false;
    if (cards.length === 5) {
      var uniq = Object.keys(counts).map(Number).sort(function (a, b) { return a - b; });
      if (uniq.length === 5) {
        if (uniq[4] - uniq[0] === 4) isStraight = true;
        // wheel: A,2,3,4,5
        if (uniq[0] === 2 && uniq[1] === 3 && uniq[2] === 4 && uniq[3] === 5 && uniq[4] === 14) isStraight = true;
      }
    }

    if (cards.length === 5) {
      var highIsAce = vals[4] === 14;
      if (isStraight && isFlush && highIsAce && vals[0] === 10) return { name: "Royal Flush", desc: "10–A, all one suit. Unbeatable!" };
      if (isStraight && isFlush) return { name: "Straight Flush", desc: "Five in a row, all one suit." };
      if (groups[0] === 4) return { name: "Four of a Kind", desc: "Four matching ranks." };
      if (groups[0] === 3 && groups[1] === 2) return { name: "Full House", desc: "Three of a kind plus a pair." };
      if (isFlush) return { name: "Flush", desc: "Five cards of one suit." };
      if (isStraight) return { name: "Straight", desc: "Five cards in a row." };
    }
    if (groups[0] === 3) return { name: "Three of a Kind", desc: "Three matching ranks." };
    if (groups[0] === 2 && groups[1] === 2) return { name: "Two Pair", desc: "Two separate pairs." };
    if (groups[0] === 2) return { name: "One Pair", desc: "Two matching ranks." };
    return { name: "High Card", desc: "Highest card: " + topCardName(vals[vals.length - 1]) + "." };
  }

  function topCardName(v) {
    return { 11: "Jack", 12: "Queen", 13: "King", 14: "Ace" }[v] || String(v);
  }

  /* ---------------- Station handling ---------------- */
  function handleStation(rawText) {
    var sid = parseStation(rawText);
    if (!sid) { toast("That QR code isn't a station code."); return; }
    if (STATIONS.indexOf(sid) === -1) { toast("Unknown station: " + sid); return; }
    var already = !!state.hand[sid];
    var card = drawForStation(sid);
    if (!card) { toast("Your deck is empty."); return; }
    renderCard(sid, card);
    show("card");
    if (already) toast("You already drew this card at " + sid + ".");
    refreshManual();
  }

  function parseStation(text) {
    if (!text) return null;
    text = String(text).trim();
    var m = text.match(/S\s*([0-9]+)/i);   // matches "S1", "sid=S1", "Station S1"
    if (!m) return null;
    return "S" + m[1];
  }

  /* ---------------- Scanner ---------------- */
  var video = document.getElementById("scan-video");
  var canvas = document.getElementById("scan-canvas");
  var ctx = canvas.getContext("2d", { willReadFrequently: true });
  var stream = null, rafId = null, scanning = false, detector = null;
  var engine = "none"; // 'jsqr' | 'barcode' | 'none'

  function pickEngine() {
    if (typeof window.jsQR === "function") return "jsqr";
    if ("BarcodeDetector" in window) return "barcode";
    return "none";
  }

  function startScanner() {
    var status = document.getElementById("scan-status");
    refreshManual();
    if (drawnCount() === STATIONS.length) {
      status.textContent = "All 5 stations done! Tap ♠ to view your hand.";
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status.textContent = "Camera not available here. Use the station buttons below.";
      return;
    }
    engine = pickEngine();
    if (engine === "none") {
      status.textContent = "Live scanning isn't supported by this browser. Tap your station below.";
      return;
    }
    status.textContent = "Starting camera…";
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } }, audio: false
    }).then(function (s) {
      stream = s;
      video.srcObject = s;
      return video.play();
    }).then(function () {
      scanning = true;
      status.textContent = "Point your camera at the station QR code.";
      if (engine === "barcode") {
        try { detector = new window.BarcodeDetector({ formats: ["qr_code"] }); }
        catch (e) { detector = new window.BarcodeDetector(); }
      }
      tick();
    }).catch(function () {
      status.textContent = "Camera blocked. Allow camera access, or tap your station below.";
    });
  }

  function stopScanner() {
    scanning = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    try { video.srcObject = null; } catch (e) {}
  }

  function tick() {
    if (!scanning) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      if (engine === "jsqr") {
        var w = video.videoWidth, h = video.videoHeight;
        if (w && h) {
          canvas.width = w; canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          var img = ctx.getImageData(0, 0, w, h);
          var code = window.jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
          if (code && code.data) { onDetected(code.data); return; }
        }
        rafId = requestAnimationFrame(tick);
      } else if (engine === "barcode") {
        detector.detect(video).then(function (codes) {
          if (codes && codes.length) { onDetected(codes[0].rawValue); return; }
          rafId = requestAnimationFrame(tick);
        }).catch(function () { rafId = requestAnimationFrame(tick); });
      }
    } else {
      rafId = requestAnimationFrame(tick);
    }
  }

  var lastDetectAt = 0;
  function onDetected(text) {
    var now = Date.now();
    if (now - lastDetectAt < 1200) { rafId = requestAnimationFrame(tick); return; }
    lastDetectAt = now;
    if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) {}
    stopScanner();
    handleStation(text);
  }

  /* ---------------- Manual station buttons ---------------- */
  function buildManual() {
    var grid = document.getElementById("manual-stations");
    grid.innerHTML = "";
    STATIONS.forEach(function (sid) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.sid = sid;
      b.textContent = sid;
      b.addEventListener("click", function () { handleStation(sid); });
      grid.appendChild(b);
    });
  }
  function refreshManual() {
    var grid = document.getElementById("manual-stations");
    Array.prototype.forEach.call(grid.children, function (b) {
      b.classList.toggle("done", !!state.hand[b.dataset.sid]);
    });
  }

  /* ---------------- Toast ---------------- */
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add("hidden"); }, 2600);
  }

  /* ---------------- Wiring ---------------- */
  function init() {
    buildManual();

    var saved = loadState();
    var resumeBtn = document.getElementById("resume-btn");
    if (saved && (saved.name || drawnCountFor(saved))) {
      resumeBtn.classList.remove("hidden");
      resumeBtn.textContent = "Resume ride — " + (saved.name || "Rider") +
        " (" + drawnCountFor(saved) + "/" + STATIONS.length + ")";
      resumeBtn.addEventListener("click", function () {
        state = saved; show("scan");
      });
      var nmeInput = document.getElementById("rider-name");
      if (saved.name) nmeInput.value = saved.name;
    }

    document.getElementById("start-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("rider-name").value.trim() || "Rider";
      var existing = loadState();
      if (existing && drawnCountFor(existing) > 0 && existing.name === name) {
        state = existing; // same rider returning — keep progress
      } else {
        state = newState(name);
        saveState();
      }
      show("scan");
    });

    document.getElementById("restart-btn").addEventListener("click", function () {
      if (!confirm("Restart the ride? This clears your current hand.")) return;
      state = newState(state ? state.name : "Rider");
      saveState();
      refreshManual();
      show("start");
      toast("Ride reset. Deal a fresh hand!");
    });

    // nav buttons
    document.querySelectorAll("[data-nav]").forEach(function (el) {
      el.addEventListener("click", function () {
        var dest = el.getAttribute("data-nav");
        if (!state && dest !== "start") return;
        show(dest);
      });
    });

    // stop camera when tab hidden (battery + privacy)
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && current === "scan") stopScanner();
      else if (!document.hidden && current === "scan") startScanner();
    });
  }

  function drawnCountFor(s) {
    if (!s || !s.hand) return 0;
    return STATIONS.filter(function (x) { return s.hand[x]; }).length;
  }

  document.addEventListener("DOMContentLoaded", init);

  /* ---------------- Service worker ---------------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function () {});
    });
  }

  /* expose a few helpers for testing in a non-DOM environment */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      freshDeck: freshDeck, evaluateHand: evaluateHand,
      parseStation: parseStation, rankVal: rankVal, STATIONS: STATIONS
    };
  }
})();
