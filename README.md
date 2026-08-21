# Urban Life Simulator (ULS) — Multi-Realm Universe

A modular, browser-based narrative RPG. 100% client-side, zero build step, zero
paid APIs. All systems communicate through an event-driven Pub/Sub kernel and
route between four distinct realms bound by a single narrative spine — **the
Chroma Syndicate Debt**.

> **Core goal:** Pay off a **$50,000 Syndicate Debt** — or collect **4 Reality
> Encryption Keys** to noclip permanently out of the simulation.

## The Four Realms

| Realm | Role in the loop |
|-------|------------------|
| **ULS City Hub** (Chroma City) | Open-world survival: 4 districts, gig economy, street reputation, asymmetric police HEAT. |
| **Living Hell** (Fish Tank) | High-risk televised gambles; payouts wire straight to your debt, failure costs sanity. |
| **Dreamworld** | Nightly symbolic sleep trials yielding persistent boons (or curses). |
| **The Backrooms** | Liminal noclip scavenge loop reached by a reality glitch; holds Reality Encryption Key fragments. |

## Running

No tooling required — it is a static single-page app.

```bash
# from the repo root, serve the folder with any static server:
python3 -m http.server 8000
# then open http://localhost:8000
```

Or simply open `index.html` directly in a modern browser.

## Architecture

```
index.html            Single-page shell & bootstrap
life.css              Mobile-first responsive theme
assets.json           Asset registry
assets-loader.js      Manifest ingestion & CDN normalization
config/config.js      URL normalizer / File Garden CDN resolver
kernel/
  eventBus.js         Pub/Sub backbone with disposable subscription tokens
  saveState.js        State-sliced localStorage persistence
  safety.js           Brand-safe content sanitization
  rng.js              Deterministic PRNG (Mulberry32)
  time.js             24-hour day/night clock
  weather.js          Atmospheric rotation
router/realmRouter.js Realm lifecycle controller with auto-disposal
bridge/               Realm protocol adapters (backrooms, livingHell, dreamworld)
systems/
  audio.js            Multi-bus audio engine with gesture unlock
  game.js             Core survival sim, debt engine & asymmetric HEAT
  economy.js          Cross-realm currency / reward bridge
  objectives.js       Dynamic objective evaluator
data/
  sfx_data.js         SFX pack manifest
  radio_stations.js   7-station stream catalog
realms/               City, Living Hell, Dreamworld, Backrooms view modules
ui/                   hud, radio, shop, toast, characterCreation, credits
```

### Key patterns

- **Disposable event tokens.** `eventBus.subscribe()` returns `{ dispose }`. The
  `RealmRouter` collects every realm-scoped subscription and disposes them on
  teardown, so route swaps never leak handlers.
- **State-sliced persistence.** All mutable state lives under `saveState`, split
  into `global`, `player`, and per-realm `slices`, persisted to `localStorage`
  with quota-safe guards.
- **Safe autoplay audio.** The `AudioContext` unlocks on first user gesture; the
  SFX manifest ships silent (empty paths) so gameplay never blocks on a missing
  asset. Add real CDN URLs in `data/sfx_data.js` to enable sound effects.
- **Asymmetric HEAT.** Wanted stars don't decay passively — you lie low in safe
  districts or pay a fixer. High heat locks travel and closes legit storefronts.

## Content safety

`kernel/safety.js` sanitizes role names and profanity by default. A per-save
**Adult mode** toggle (character creation) disables sanitization.
