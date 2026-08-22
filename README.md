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

## AI narration & scene images

**Every realm** is a **choose-your-own-story that talks back**. Type anything into
the action bar (or click an AI-suggested choice); the narrator responds in
character, drives events and consequences, and a fresh scene image is generated
each turn. The narrator shifts tone per realm — gritty crime on the streets,
manic live-TV in Living Hell, surreal dream-logic in the Dreamworld, and analog
horror in the Backrooms — while each realm's mechanics (gigs, challenge payouts,
dream boons, Reality Encryption Key fragments) apply real stakes through the same
loop. A single config-driven engine (`systems/story.js`) powers all four.

### Tiered narrator (token-lean by design)

| Tier | Provider | When it's used |
|------|----------|----------------|
| Default | **Pollinations** (keyless, free) | Every turn, for everyone. No key, no cost, no tokens billed. |
| Offline | **Local WebLLM** model | Optional one-time download (offered before any key entry). Runs in-browser via WebGPU. |
| Premium | **Bring-your-own-key** (OpenAI-compatible) | *Only* on high-significance story beats (`byok.significanceThreshold`), so a paid key is spent sparingly. |

Routing lives in `AIConfig.providerForSignificance()`. If any provider fails or
the player is offline, a **scripted fallback** keeps the story going — the game
never stalls.

The narrator returns a strict JSON contract (`systems/ai/narrator.js`):
`{ narration, choices, scene, effects{money,heat,health,sanity,water,hunger}, location, sfx, significance }`.
Effects are applied through the economy/game systems; `scene` feeds the image
generator; `location` can move the player between districts.

### Scene images (free, keyless, **zero tokens**)

Image generation is separate from the LLM and costs no tokens. Each turn:
`systems/imageGen.js` builds a [Pollinations](https://pollinations.ai) image URL
from the scene text with a **deterministic seed** (so a place looks consistent),
**caches** by prompt+seed, shows a themed district gradient **instantly with a
Ken Burns pan/zoom** for an animated feel, then cross-fades in the generated
image. A bring-your-own-key and cinematic-video upgrade path are stubbed for
pivotal beats.

Configure all of this from the **⚙️ AI** button in the HUD.

## Parody radio commercials

The 7-station radio occasionally cuts to an in-world **commercial break** — a
text sponsor spot on the LCD (Judge Hatchet, Doug & Doug Lawyers, Big Sal's Auto
Emporium, Love Asylum, Fix-It-All, Repo Rage, Kitchen Nightmare Fuel). Ad copy
lives in `data/radio_ads.js`; `ui/radioAds.js` runs a break between tracks on a
cooldown while the music keeps playing.

## Real-time mini-games (it's not just text)

Beyond the talk-back narration, key moments drop into **playable, skill-based
mini-games** rendered on a canvas overlay (keyboard + touch). A shared engine
(`systems/arcade/arcadeEngine.js`) pauses the narrated loop, runs the game, and
returns a win/score result that the economy turns into real consequences —
which are then narrated back into the story.

| Game | Trigger | Payoff |
|------|---------|--------|
| **Fight** (timing brawler) | street brawls, **bounty hunters** on high heat, Living Hell **Cage Brawl** | win → cash/rep or debt paid; lose → health/heat |
| **Driving / police chase** | courier runs, **"make a run for it"** to escape the cops | grab cash, survive → payout / heat cleared; crash → busted |
| **Walk-around** (🚶 Explore) | HUD button in free roam | navigate a top-down district, step on a hotspot to open the shop, gigs, studio, or bed |
| **Skill games** | lockpick a storefront, pickpocket, hack an ATM | stop-the-needle / repeat-the-sequence → cash, with heat risk |

Each game has on-screen touch controls and a Forfeit, and every result is fed
back through `systems/arcade/arcadeHooks.js` into cash, HEAT, health, reputation,
or debt.

## Tutorial → Free Roam

New players start in a mandatory, scripted **"First Night with Roxy"** tutorial —
a ~12-minute GTA-style onboarding, guided by the fixer **Roxy**, that tours every
module in order (talk-back narration → HUD/needs → shop → a paying gig → police
HEAT and shaking it → the 7-station radio → Living Hell → Dreamworld → the
Backrooms → the debt/keys victory spine). Each beat follows a Narrate → Describe →
Ask loop, coach-marks the real control to use, and applies **real** state changes
(you actually earn a Reality Encryption Key and pay down real debt during the
tour). It is scripted-first so it can never stall, with AI scene images layered
on when online.

**Free roam** (the open, AI-narrated city sandbox) unlocks only after the
tutorial completes (`player.tutorialComplete`). From there the whole city is
open — type anything, go anywhere.

## Content safety

`kernel/safety.js` sanitizes role names and profanity by default. A per-save
**Adult mode** toggle (character creation) disables sanitization.
