# Pilot Testing for HealthTech — AI hardware for the MediHack prototypes

**Prepared** 25 September 2026 · **revised** 2 October 2026 · draft for review, not a purchase request
**Web version** https://cnacha-mfu.github.io/medihack/
**Covers** CURA AI (medical-coding audit), CareMind (nurse handover notes), Mali OPD pre-screening booth
**Sources** `CuraAI/HARDWARE_SPEC.md`, `CareMind/HARDWARE_SPEC.md`, `Mali Prescreening/HARDWARE_SPEC.md`, and the
published benchmarks and prices listed at the end

**Pilot scope confirmed (2 Oct 2026): CareMind on 2–3 wards, one Mali booth, and no spare server available at MFU IT
or the hospital. For that scope, Option A (two DGX Spark-class units) is sufficient and is the cheaper choice at
Thai retail prices, with **both units running production at the same time** (§2).** Option B (one x86 GPU server)
is the better buy only if a hospital-wide rollout is likely within the hardware's 3-year life (§11).
Either way, AI compute sits beside **one x86 services server** for every application, database and portal, in the
MFU Medical Center server room on a hospital VLAN. Nothing patient-related leaves the hospital LAN (PDPA).
The booth, vital-sign devices and nurse/coder PCs are the same under both options and are listed in §6.

> **What changed in this revision.** The 25 Sep draft chose the Spark and set an acceptance line of ≥45 tokens/s.
> Published benchmarks for the same model put the Spark's generation speed at **38–44 tokens/s**, so it would
> most likely have failed that test. For CareMind specifically, the Spark's much faster prompt reading offsets
> most of this, so **CareMind's end-to-end note time on a Spark is about the same as today** (§4.1). The Spark is
> now costed as Option A next to a GPU-server Option B, and every figure below uses published or team-measured
> numbers.

---

## 1. What the AI hardware has to run

| Prototype | AI workload | Resident memory | App workload (services server) |
|---|---|---:|---|
| CURA AI | Llama-3.1-EIRAI-8B Q4_K_M via Ollama; bge-m3 embeddings | ~6 GB | 2 × Spring Boot JVM, React SPA, nginx, PostgreSQL **≥18.6**, RAG service — single instance only |
| CareMind | Llama-3.1-EIRAI-8B Q4_K_M via Ollama, ctx 8,192, 4 parallel slots (peak 9.8 GB measured over a 3-hour load test). **Plus a second model**, qwen2.5-coder:14b (~9 GB), for offline adapter generation — never on the nurse's request path, no patient data, evicted after every call | ~9 GB (+9 GB while adapter generation runs) | Node.js backend, Tesseract OCR, 3 containers — patient data in memory only |
| Mali booth | Typhoon-8B Q4 via Ollama + faster-whisper large-v3-turbo + Thai TTS | ~14 GB | FastAPI-style backend, PostgreSQL + pgvector, nurse portal, admin portal |
| **Total, production** | | **≈30 GB** + ~8 GB working memory (KV cache, 8 slots) ≈ **38 GB** | ≈10 cores, ≈24 GB RAM, ≈200 GB disk |

**The binding constraint is memory bandwidth, not memory size.** Generating text with an 8B model is limited by how
fast the GPU can read the model's weights, so tokens per second scale with memory bandwidth (CareMind spec §5.1).
All three prototypes together need ~38 GB; any 48 GB card holds them. Extra memory beyond that only matters if a
much larger model (70B-class, ~40 GB on its own) is adopted later.

**CareMind's adapter-generation model belongs on the staging machine, not production.** It needs no patient data,
a developer runs it by hand, and it takes about a minute per page. Running it on the production GPU would add
~9 GB (leaving almost no headroom on a 48 GB card) and slow every nurse's note while it runs.

**What runs on the AI hardware, per prototype, and whether it works on Arm (Option A):**

| Prototype | Runs on the AI box | Arm64 (Spark) |
|---|---|---|
| CareMind | Ollama, Caddy (TLS + token), `caremind-ml` service (Python 3.11, standard library only) | **Works as-is.** Tesseract OCR and the app run on the x86 services server |
| CURA AI | Ollama; bge-m3 retrieval runs on the services server CPU | Works as-is |
| Mali | Ollama, faster-whisper, Thai TTS | **Needs a custom speech-recogniser build** (§9) |

---

## 2. AI compute options

### Option A — two DGX Spark-class units (recommended for the confirmed pilot)

| Item | Minimum specification (vendor-neutral, for the TOR) | Qty | Est. THB incl. VAT |
|---|---|---:|---:|
| GB10-class AI mini workstation | Grace Blackwell-class superchip; **≥128 GB unified memory**; ≥250 GB/s memory bandwidth; 20-core Arm CPU; **≥4 TB NVMe**; 10 GbE; ≤300 W; CUDA 13 / Ubuntu-based OS; Docker + NVIDIA Container Toolkit; **3-year warranty, on-site or advance replacement in Chiang Rai**. *Reference: NVIDIA DGX Spark, ASUS Ascent GX10, Dell Pro Max GB10, HP ZGX Nano, Lenovo ThinkStation PGX — or equivalent* | 2 | 143,000–250,000 each ¹ |
| 1U rack shelf + cable kit | Desktop box, not rack-mountable on its own | 2 | 3,000 each |
| **AI compute subtotal** | | | **292,000–506,000** |

¹ Low end: cheapest Thai retail on 2 Oct 2026 — [Gigabyte AI TOP ATOM at Advice, ฿142,900](https://www.advice.co.th/product/ai-supercomputer/nvidia-dgx-spark/nvidia-dgx-spark-gigabyte-ai-top-atom-atagb10-9000);
other Thai listings run ฿155,900–222,900 (§7.1). High end: the ฿250,000 figure from the earlier draft, which
is above every retail listing found and would cover an extended on-site warranty. NVIDIA's own Founders Edition
is [US$4,699 since Feb 2026](https://forums.developer.nvidia.com/t/2-23-2026-price-change-announcement/361713).

**Both units run production at the same time**, split by prototype:

| Unit | Production workload | Load in the pilot |
|---|---|---|
| Unit 1 | CareMind (handover notes) | ~25–40% at shift change |
| Unit 2 | Mali booth + CURA AI | light; idle at night when the OPD and coders are off |

Splitting by prototype means a booth voice turn never waits behind a handover note, so the shift-change
collision in §4.3 does not occur. If CareMind grows, its Caddy proxy can spread notes across both units
(Caddy supports several upstreams behind one address), so CareMind keeps its single configured endpoint (C-5)
and both units serve the same model file. **Testing** moves to CareMind's existing lab workstation (synthetic
data) for development, with a final check of any model or criteria change on unit 2 at night, before it
reaches patients. **If a unit fails**, the other carries all three prototypes at reduced speed: the whole pilot
load fits on one unit.

- **For:** both units serve patients, so twice the capacity of one; the booth never competes with handover
  notes; 128 GB each, with room for a 70B-class model; if one unit fails the other carries the pilot;
  lowest power (~240 W each); several OEMs sell the same platform, so e-bidding is competitive.
- **Against:** the **slowest text generation** of the options — 273 GB/s, measured at 38–44 tokens/s on this
  model. For CareMind this is offset by fast prompt reading, so a single note takes about what it takes today
  (~6–11 s warm); but at the shift-change peak, with 4 notes at once, each takes ~24 s — well over CareMind's
  5–10 s target (NFR-9), exactly as on today's lab machine. Arm64: Mali's speech recogniser needs a custom GPU
  build (§9). Adequate for a one-ward, one-booth pilot and up to ~7 wards; not for holding NFR-9 at peaks.

### Option B — one x86 GPU server (for growth beyond ~7 wards)

| Item | Minimum specification (vendor-neutral, for the TOR) | Qty | Est. THB incl. VAT |
|---|---|---:|---:|
| 2U GPU server | 16-core x86 CPU; **128 GB ECC**; 2 × 1.92 TB NVMe RAID 1; **redundant PSU ≥1,100 W**; vendor-certified for one full-height, dual-slot, 300 W GPU; BMC/remote management; 2 × 10 GbE; rack rails; **3-year on-site NBD warranty** | 1 | 180,000–250,000 ² |
| GPU | PCIe, **≥48 GB ECC memory, ≥850 GB/s memory bandwidth**, ≤300 W, dual-slot, Linux driver support, 3-year warranty. *Reference: NVIDIA RTX PRO 5000 Blackwell 48 GB (1,344 GB/s) — or equivalent* | 1 | 200,000–260,000 ³ |
| **AI compute subtotal** | | | **380,000–510,000** |

² Derived from CareMind's own estimate of ฿380,000–550,000 for a 2U server *including* a 48 GB GPU (CareMind
spec §5.3, item 2.2), less the card. No Thai list price was found for a configured GPU server; this line needs
quotations (§7.1).
³ Thai retail: [Leadtek RTX PRO 5000 Blackwell 48 GB at AutoNet PC, ฿238,500](https://www.autonetpc.com/product/leadtek-nvidia-rtx-pro-5000-blackwell-generation/).
US street: [Newegg](https://www.newegg.com/nvidia-blackwell-900-5g153-2250-000-rtx-pro-5000-48gb-graphics-card/p/N82E16814132111);
specifications: [PNY](https://www.pny.com/nvidia-rtx-pro-5000-blackwell).

The ≥48 GB / ≥850 GB/s line is CareMind's own Recommended specification (CareMind spec §5.3, item 2.2). Written
this way it is vendor-neutral, and it excludes cards too slow for hospital-wide use.

**Staging for Option B**, choose one:

| | Staging / spare | Est. THB incl. VAT |
|---|---|---:|
| **B1** | CareMind's existing lab workstation (20 GB, 280 GB/s), which its spec already names as the dev/staging machine and spare (CareMind §5.2, item 1.1). Staging uses synthetic data only, so its location outside the hospital is not a PDPA issue | 0 |
| **B2** | A second, smaller GPU inside the hospital, in the services server: ≥24 GB, single-slot, ≤150 W. *Reference: RTX PRO 4000 Blackwell 24 GB (672 GB/s, 140 W).* The services server (§3) must then be specified to accept it. Gives an in-hospital spare that can serve patients if the main GPU fails | 120,000–140,000 ⁴ |

⁴ US$3,000–3,400 at US retail on 2 Oct 2026 ([price tracker](https://gpuprix.com/us/gpus/rtx-pro-4000-blackwell),
[Newegg](https://www.newegg.com/nvidia-blackwell-900-5g147-2270-000-rtx-pro-4000-24gb-graphics-card/p/N82E16814132109)),
converted at 34 THB/USD with margin and VAT. Its 12-month low was US$1,550, so the price is volatile. No Thai
listing was found; ask Ascenti (the Thai Leadtek distributor, §7.1).

- **For:** **3–4× faster per request than the Spark.** A handover note in ~4 s, meeting NFR-9 hospital-wide; x86
  means every component, including Mali's speech recogniser, installs as-is; a current-generation card, sold new
  with warranty, which suits e-bidding.
- **Against:** 48 GB leaves no room for a 70B-class model next to the three prototypes; one main GPU, so failover
  depends on B1 (manual switch-over, as CareMind already designs for) or B2.

### Considered and rejected

| Option | Bandwidth | Price per card, Sep–Oct 2026 | Why not |
|---|---:|---|---|
| RTX A6000 48 GB | 768 GB/s | [US$4,850–6,400 new](https://gpudojo.com/a6000) (≈฿190,000–250,000) | 2020 generation. **Fails the ≥850 GB/s line.** New units cost about the same as the RTX PRO 5000, which has 1.75× the bandwidth. Used/refurbished units are not suitable for government procurement |
| RTX 6000 Ada 48 GB | 960 GB/s | [US$6,500–9,500, listed as discontinued](https://www.bhphotovideo.com/c/product/1753962-REG/pny_vcnrtx6000ada_pb_rtx_6000_ada_generation.html) | Passes the line, but discontinued — stock and warranty are uncertain |
| RTX PRO 6000 Blackwell 96 GB | 1,800 GB/s | [US$14,000–16,000](https://www.tomshardware.com/pc-components/gpus/nvidia-doubles-rtx-pro-6000-blackwells-msrp-to-a-staggering-usd16-000-96gb-card-started-pre-orders-below-usd8-000-last-year) (≈฿550,000–650,000) | 96 GB and the speed are not needed for this workload; the list price has roughly doubled since launch |
| Three separate small-GPU boxes (the three teams' Minimum tiers) | 280 GB/s class | ≈฿350,000 combined | Same speed class as the Spark, with no staging and no spare |
| Spark for staging, GPU server for production | — | — | Staging on a different CPU architecture (Arm) from production (x86) does not test what runs in production |

---

## 3. Services server — x86 (both options)

| Item | Minimum specification | Qty | Est. THB incl. VAT |
|---|---|---:|---:|
| 1U rack server | 16-core x86 CPU; **64 GB ECC** (Min) / **128 GB ECC** (Rec); 2 × 1.92 TB NVMe **RAID 1** (Rec: 4 × 1.92 TB); redundant PSU; BMC/remote management (iDRAC/iLO class); 2 × 10 GbE + 2 × 1 GbE; rack rails; **3-year on-site NBD warranty**. *Under Option B2, also: one single-slot ≤150 W GPU slot, vendor-certified* | 1 | 150,000 (Min) / 200,000 (Rec) |

**How it is used:** a hypervisor (Proxmox VE, or MFU IT's existing platform if they prefer to operate it), with
**one VM per prototype** for production and one per prototype for staging, plus one small edge VM (Caddy reverse
proxy, TLS with the hospital CA, monitoring). Each prototype keeps its own PostgreSQL inside its VM — CURA AI needs
PG 18.6+, Mali needs pgvector, and separate databases mean one team's upgrade cannot break another's. VM sizing:
4 vCPU / 8 GB / 100 GB each is what the three specs asked for.

---

## 4. Capacity: how many users at once

### 4.0 The confirmed pilot: 2–3 wards and one booth

| | Pilot demand | Option A — both Sparks in production | Option B — GPU server |
|---|---|---|---|
| CareMind at shift change | 2–3 wards × 1.25 notes/min = **2.5–3.75 notes/min** | Unit 1 alone: capacity ~9–10 notes/min, so **~25–40% load**. Most notes run alone: **~6–11 s**, within NFR-9; occasionally two overlap, ~14–16 s | ~3–5 s; load under 15% |
| Mali | **1 booth** | Unit 2: voice turn ~4 s, ≤5 s, never delayed by handover notes (once the speech recogniser runs on the GPU, §9) | 3+ booths |
| Worst moment (15:00) | ~2 notes + 1 booth turn + 2 coder suggestions ≈ 5 requests | Notes on unit 1, booth and coders on unit 2: no collision | No visible slowdown |
| Room to grow | | ~7–10 wards and 2 booths, with CareMind spread over both units (§11) | ~25 wards, 3+ booths |

At this scope the Spark's lower generation speed costs little: CareMind uses a quarter to a half of unit 1,
and unit 2 carries the booth and the coders without interference. Option B's extra speed would mostly sit idle
during the pilot. It pays off
only if the hardware is expected to carry a hospital-wide rollout later; if that rollout comes, a GPU-server
purchase can be made then, and the two Sparks remain useful as test and development machines.

Planning numbers for the acceptance test in §8, not guarantees. Spark figures use published benchmarks for this
model (38–44 tokens/s); Option B figures scale CareMind's measurements by memory bandwidth and are **estimates**
until the delivery speed test proves them.

### 4.1 Generation speed, Llama-3.1 8B Q4_K_M

| | CareMind lab machine (measured, 25 Aug 2026) | **Option A — Spark** | **Option B — RTX PRO 5000-class** |
|---|---:|---:|---:|
| Memory bandwidth | 280 GB/s | 273 GB/s | 1,344 GB/s |
| Generation, 1 request | 48 tokens/s | **38–44 tokens/s** (published) | ~150 tokens/s (estimate; A6000 at 768 GB/s measures ~102) |
| Prompt reading (prefill) | ~2.25 s to first token | ~7,600 tokens/s (published) — under 1 s for CareMind's prompts | under 0.5 s |
| CareMind note, alone, warm | **6.4–9.8 s** (final report, n=6); 11.6 s on the 25 Aug registry run | **~6–11 s** — about the same as today | **~3–5 s** |
| CareMind note, including cold starts | 7.0–12.7 s, mean 9.6 s (n=42) | about the same as today | ~3–6 s |
| 4 notes at once | 101 tokens/s total, ~22 s/note | ~86 tokens/s total, ~24 s/note | ≥240 tokens/s total, ≤8 s/note |
| Meets NFR-9 (5–10 s) | single note warm: yes · at peak: no | **single note warm: yes · at peak: no** | **yes, including peaks** |

**Why the Spark ties for CareMind despite slower generation.** A CareMind note is a long prompt (selected record
chunks, capped at 12,000 characters) followed by a short output. On today's lab GPU, reading the prompt takes
~2.25 s before the first word appears; the Spark reads it in under a second, which wins back most of the time it
loses generating ~450 output tokens at 38–44 tokens/s instead of 48. The Spark figures in this table are
estimates from that breakdown; the acceptance test in §8 measures the real number on delivered hardware.

The GPU is shared by all three prototypes. Each gets its own Ollama container with a fixed number of parallel
slots so one prototype cannot starve another: **CareMind 4, Mali 2, CURA AI 2 — 8 slots in total.**

### 4.2 Per prototype, on the production hardware

| Prototype | Option A — both Sparks in production (figures per unit) | Option B — GPU server |
|---|---|---|
| **CareMind** | 4 nurses at once, ~24 s per note; **~9–10 notes/min ≈ 7 wards** at the 20-minute shift-change peak (1.25 notes/min per 25-bed ward) — about the same as today's lab machine. Spread over both units, ~19 notes/min combined, but each note still ~24 s when a unit is busy. Fine to ~7–10 wards; not hospital-wide | ≤8 s per note with 4 at once; **≥33 notes/min ≈ 25 wards** (CareMind's own 3× estimate, conservative for 4.8× the bandwidth). Covers a 15-ward hospital (~19 notes/min at peak) with room to spare |
| **Mali booth** | 2 booths with each voice turn ≤5 s, once the speech recogniser runs on the GPU (§9). ~90–100 patients per booth per 8-hour OPD day | 3+ booths at ≤5 s per turn. **The booth count, not the GPU, is the limit** — 3 booths ≈ 300 of the ~440 daily walk-ins |
| **CURA AI** | 50 concurrent coders on the app path (load-tested, p95 19 ms, 0 failures). 2 AI suggestions in flight, ~6–10 s each | Same app-path figure; AI suggestions ~2–3 s each. Suggestion latency was never measured by the team — set a target before delivery (§8) |

### 4.3 When peaks collide

The worst realistic moment is the 15:00 shift change while OPD is open: 4 handover notes, 2 booth turns and
2 coder suggestions in the same second, 8 requests in flight.

| | Option A, alone → during collision | Option B, alone → during collision |
|---|---:|---:|
| Handover note | 24 s → ~32 s | 8 s → ~10 s |
| Booth voice turn | 4 s → **~8 s** (misses the 5 s target) | 3 s → ~4 s |
| Coder suggestion | 6–10 s → ~14 s | 2–3 s → ~4 s |

The Option A column assumes all three prototypes on **one** unit. With both units in production and the split
above, the booth and the coders are on unit 2 and never wait behind handover notes, so the collision does not
occur. Once CareMind is spread across both units (stage 2, §11), give Mali's container priority on unit 2 to
keep voice turns at ≤5 s. Under Option B the collision is absorbed without configuration changes.

### 4.4 Services server

Not the limit at pilot scale under either option. The three application stacks together ask for ~10 cores and
~24 GB; a 16-core / 64 GB box runs production and staging copies of all three with room to spare —
**~100 simultaneous browser sessions** across the coder dashboard, the nurse extension and the two booth portals.
Booth audio over WebSocket is ~64 kbps per booth, negligible on a 1 GbE port.

---

## 5. Supporting items (both options)

| Item | Specification | Qty | Min THB | Rec THB |
|---|---|---:|---:|---:|
| Rack UPS | Min: line-interactive 2 kVA with network card. Rec: online 3 kVA, network card, managed shutdown of all boxes. Load ≈ **820 W** (A: 2 × 240 W Spark + 300 W server + 40 W NAS) or ≈ **940 W** (B: ~600 W GPU server + 300 W + 40 W). Both put a 2 kVA unit near half load, so the online 3 kVA is the safer choice | 1 | 25,000 | 45,000 |
| Backup NAS | Min: 2-bay, 2 × 8 TB RAID 1. Rec: 4-bay, 4 × 8 TB RAID 5, for nightly VM backups and the AI audit trail. Separate hardware from the server, per CURA AI's rule | 1 | 30,000 | 50,000 |
| Encrypted USB SSD | 1 TB, hardware AES-256 with keypad, ×2 so one lives off-site (CareMind backup runbook) | 2 | 12,000 | 12,000 |
| Managed switch, 8-port 10 GbE | Optional. Only if hospital IT cannot give a dedicated VLAN with 10 GbE ports | 1 | 0 | 15,000 |
| **Subtotal** | | | **67,000** | **122,000** |

Not purchased, provided by the site: rack space and power in the server room, a hospital VLAN with firewall
rules, TLS certificates from the hospital CA, and the iMed API endpoint.

---

## 6. Pre-screening booth and medical devices (Mali prototype only, both options)

The only prototype with on-site hardware. CURA AI and CareMind run in the browser on the coder and
nurse-station PCs the hospital already has. Figures are from `Mali Prescreening/HARDWARE_SPEC.md` §4.

### 6.1 Booth

| Item | Minimum specification | Qty | Min THB | Rec THB |
|---|---|---:|---:|---:|
| Booth host PC | Mini PC, 4-core, 8 GB, 256 GB SSD, Bluetooth 5.0+, ≥4 × USB-A, HDMI/DP, fanless preferred. Runs the kiosk browser and owns the device links; separate from the AI hardware so it can be swapped without touching the GPU | 1 | 22,000 | 22,000 |
| Touch display | 24" (Rec 27"), 1080 × 1920 portrait, 10-point PCAP touch, ≥250 cd/m², anti-glare | 1 | 11,000 | 16,000 |
| Far-field microphone | USB, ≥2-element array, noise suppression + echo cancellation, 16 kHz+. Rec: beamforming grade. Addresses a measured transcript failure from ambient noise | 1 | 4,500 | 8,000 |
| Speaker | USB or 3.5 mm powered, ≥3 W, speech-tuned | 1 | 1,800 | 1,800 |
| Slip printer | 80 mm thermal, USB, auto-cutter | 1 | 4,500 | 4,500 |
| QR scanner | 2D imager, QR (ISO/IEC 18004) mandatory, USB-HID keyboard wedge. Laser 1D-only units not acceptable | 1 | 2,500 | 2,500 |
| Enclosure | Floor-standing lockable kiosk, cable management, adjustable display height, arm rest at seated height for the BP cuff | 1 | 30,000 | 30,000 |
| Booth UPS | ≥650 VA | 1 | 6,000 | 6,000 |
| Bluetooth adapter | USB BT 5.0+, Linux-supported chipset. Contingency if the mini PC lacks BT 5 | 1 | 900 | 900 |
| **Booth subtotal** | | | **83,200** | **91,700** |

### 6.2 Vital-sign devices

Integrated and tested in the current prototype. Buy these or equivalents meeting §6.3.

| Device | Reference model (tested) | Interface | Qty | THB each |
|---|---|---|---:|---:|
| Blood-pressure monitor | Omron HEM-7280T | Bluetooth LE, Omron transfer protocol via `omblepy` driver | 1 | 5,500 |
| Thermometer | TAIDOC TD-1242 | Bluetooth LE, standard Health Thermometer Service (GATT 0x1809) | 1 | 3,000 |
| Pulse oximeter | Rossmax SB210 | Bluetooth LE, vendor 16-byte packet, own driver | 1 | 3,000 |
| **Devices subtotal** | one set (Min) | | | **11,500** |
| | one set + one spare set (Rec) | | | **23,000** |

The spare set is recommended because a failed cuff stops every triage level that needs a blood-pressure
reading. These are home-use registered devices; hospital-grade equivalents are preferred on duty-cycle grounds
(about 440 walk-ins a day) but are not costed here. If the medical center procures them itself, the
compatibility clause below governs.

### 6.3 Compatibility clause for any substitute device (for the TOR)

1. Programmatic interface over **Bluetooth LE 4.2+** (no mandatory vendor app), **a documented Linux/Python
   SDK** with no per-device licence, **or a USB / RS-232 link** with a published format or vendor driver. All
   three transports are equally acceptable; wired is if anything more dependable in a fixed booth.
2. Implements the standard Bluetooth SIG profile (Blood Pressure 0x1810, Health Thermometer 0x1809, Pulse
   Oximeter 0x1822) **or** ships a documented SDK or protocol. Standard profile is strongly preferred.
3. Readings retrievable **without any cloud round-trip**. No exceptions.
4. Thai FDA (อย.) medical-device registration and a current calibration certificate.
5. Adult and, where clinically required, paediatric cuff sizes.

**Booth + devices: Minimum ฿94,700 · Recommended ฿114,700.** The nurse review portal and admin portal need
only a desktop PC at the OPD counter with a current browser, which the hospital already has.

---

## 7. Totals by option

All figures THB, including 7% VAT. Ranges reflect the price ranges in §2; **Min / Rec** differ only in the
services server (§3) and the supporting items (§5).

| | Option A — 2 × Spark | Option B1 — GPU server, lab staging | Option B2 — GPU server + in-hospital spare |
|---|---:|---:|---:|
| AI compute (§2) | 292,000–506,000 | 380,000–510,000 | 500,000–650,000 |
| Services server (§3), Min / Rec | 150,000 / 200,000 | 150,000 / 200,000 | 150,000 / 200,000 |
| UPS, NAS, drives, switch (§5), Min / Rec | 67,000 / 122,000 | 67,000 / 122,000 | 67,000 / 122,000 |
| **Infrastructure, Min** | **509,000–723,000** | **597,000–727,000** | **717,000–867,000** |
| **Infrastructure, Rec** | **614,000–828,000** | **702,000–832,000** | **822,000–972,000** |
| Booth + devices (§6), Min / Rec | 94,700 / 114,700 | 94,700 / 114,700 | 94,700 / 114,700 |
| **Grand total, Min** | **≈604,000–818,000** | **≈692,000–822,000** | **≈812,000–962,000** |
| **Grand total, Rec** | **≈729,000–943,000** | **≈817,000–947,000** | **≈937,000–1,087,000** |
| CareMind note, alone / at shift-change peak | ~6–11 s / ~24 s (≈ today) | ~3–5 s / ≤8 s | ~3–5 s / ≤8 s |
| Electricity, continuous | ≈฿29,000/year (~820 W) | ≈฿33,000/year (~940 W) | ≈฿35,000/year |

**Reading the table.** At the cheapest Thai retail price for the Spark (฿142,900), Option A is about ฿90,000
cheaper than Option B1. At the ฿250,000-per-unit figure from the earlier draft, the two cost the same. For the
confirmed pilot (2–3 wards, one booth) both options meet the targets, so Option A is the better value. Option B
buys 3–4× the generation speed, which matters only beyond ~7 wards. The services server is required in every
option: MFU IT and the hospital have no spare server (Q1).

**Prices are indicative.** Thai retail prices are used where found (§7.1); US prices are converted at ~34 THB/USD
with local margin and 7% VAT added. GPU street prices moved 40–60% during 2026 (CareMind spec §5.3), so a
สืบราคา from three vendors is required before any of this becomes a TOR. There are no software licences:
Ollama, Docker, Proxmox, Caddy and PostgreSQL are all open source.

### 7.1 Where to buy in Thailand

Listings found on 2 October 2026. Retail prices are for reference and for the สืบราคา; a government purchase
should request formal quotations with the 3-year on-site warranty written in.

| Item | Thai vendor | Listed price (THB) | Notes |
|---|---|---:|---|
| DGX Spark — Gigabyte AI TOP ATOM | [Advice](https://www.advice.co.th/product/ai-supercomputer/nvidia-dgx-spark/nvidia-dgx-spark-gigabyte-ai-top-atom-atagb10-9000) | 142,900 | Cheapest listing found |
| DGX Spark — ASUS Ascent GX10 | [Advice](https://www.advice.co.th/product/ai-supercomputer/nvidia-dgx-spark/nvidia-dgx-spark-asus-gx10-gg0011bn-90ms0371-m000b0-), [SpeedCom](https://speedcom.co.th/en/collections/dgx-spark) | 132,900–179,990 | Price varies by storage size and listing |
| DGX Spark — Leadtek (NVIDIA Founders Edition) | [IT City](https://www.itcity.in.th/en/product/LEADTEK-NVIDIA-DGX-Spark-Blackwell-Architecture-DGX-Mini-PC-Ai-()_PRD202512010778) | 180,900 | Bangkok-area delivery only |
| | [JIB](https://www.jib.co.th/web/product/readProduct/82239/3242/AI-COMPUTER--%E0%B8%84%E0%B8%AD%E0%B8%A1%E0%B8%9E%E0%B8%B4%E0%B8%A7%E0%B9%80%E0%B8%95%E0%B8%AD%E0%B8%A3%E0%B9%8C-AI--LEADTEK-NVIDIA-DGX-SPARK) | 199,000 | |
| | [Gear Lab](https://www.gearlab.co.th/products/leadtek-dgx-spark) | 199,900 | |
| | [Ubon Computer](https://www.uboncomputer.co.th/workstations-ai-ai-nvidia-dgx-spark.html) | 222,900 | |
| RTX PRO 5000 Blackwell 48 GB (Leadtek) | [AutoNet PC](https://www.autonetpc.com/product/leadtek-nvidia-rtx-pro-5000-blackwell-generation/) | 238,500 | Card only |
| RTX PRO workstation cards, DGX Spark — distributor | [Ascenti Resources](https://ascenti.co.th/main/product-category/graphic-card/vga-leadtek/vga-nvidia-leadtek/) | quote | Thai importer and distributor for Leadtek; [launched the DGX Spark in Thailand](https://ascenti.co.th/main/news-leadtek-nvidia-dgx-spark-founders-edition/). Ask for RTX PRO 5000 / 4000 project pricing |
| GPU servers — Supermicro, NVIDIA-certified | [Taknet Systems](https://taknet.co.th/) | quote | NVIDIA-certified GPU servers, on-site service in Thailand |
| GPU servers — Supermicro, Lenovo | [QuickServ](https://www.quickserv.co.th/server/SUPERMICRO.html) | quote | |
| GPU servers — Dell PowerEdge | [WiseTech](https://wisetech.co.th/dell-emc-poweredge/), [Addin](https://addin.co.th/product-category/server/dell-server/) | quote | |
| Servers — Dell, HPE, Lenovo | [ServerProThai](https://www.serverprothai.com/) | quote | Also UPS |

For Option B, ask the server vendor to supply the server **with the GPU installed and certified for that
chassis**, under one warranty. Buying the card separately and fitting it yourself can void the server warranty
and leaves two vendors to blame each other when something fails.

Note: the current project budget (394,000 THB, พ.ศ. 2569) is entirely personnel and Claude licences and has
no hardware line. This is a new capital request (ครุภัณฑ์) for the extension phase.

---

### 7.2 Extension-phase operating costs (6 months)

The extension phase runs **6 months**. These costs are the same under both options.

| Item | Basis | THB |
|---|---|---:|
| Claude Max plan for development | 3 accounts × US$125/month × 6 months = US$2,250, at ~34 THB/USD | ≈76,500 |
| Development team compensation | 3 teams × ฿15,000/month × 6 months | 270,000 |
| Project manager | ฿25,000/month × 6 months | 150,000 |
| **Operating total, 6 months** | | **≈496,500** |

### 7.3 Total extension budget: hardware plus 6 months of operation

| | Option A — 2 × Spark | Option B1 — GPU server, lab staging | Option B2 — GPU server + in-hospital spare |
|---|---:|---:|---:|
| Hardware, Min (§7) | 604,000–818,000 | 692,000–822,000 | 812,000–962,000 |
| Hardware, Rec (§7) | 729,000–943,000 | 817,000–947,000 | 937,000–1,087,000 |
| Operating, 6 months (§7.2) | 496,500 | 496,500 | 496,500 |
| **Total, Min** | **≈1,101,000–1,315,000** | **≈1,189,000–1,319,000** | **≈1,309,000–1,459,000** |
| **Total, Rec** | **≈1,226,000–1,440,000** | **≈1,314,000–1,444,000** | **≈1,434,000–1,584,000** |

The Claude Max line assumes US$125 per account per month; at a different plan price, scale that one line
(each US$10 per account per month changes it by ≈฿6,100). Electricity (§7) is extra, ≈฿15,000–18,000 for
6 months.

---

## 8. Acceptance test at delivery

The vendor installs the hardware; the team runs these before signing. Under Option A, every check must pass on
**both** units — both serve patients, and each must be able to carry the other's load if it fails.

| Check | Pass line — Option A | Pass line — Option B | From |
|---|---|---|---|
| Ollama, all three models loaded together | ≥30 GB resident, no eviction over 1 hour | same | this doc §1 |
| Llama-3.1-EIRAI-8B Q4_K_M, ctx 8,192 | **≥36 tokens/s single, ≥80 at 4 parallel** (published Spark figures less 5%) | **≥110 tokens/s single, ≥240 at 4 parallel** (CareMind's Recommended line) | CareMind §5.8 |
| CareMind note, end to end, warm, real prompt sizes | **≤10 s** (NFR-9) on CareMind's own fixtures | ≤10 s | CareMind NFR-9, report §6.4 |
| CareMind output unchanged on the new hardware | Re-run CareMind's daily evaluation gate and live groundedness check: 0 fabricated numbers, citation precision 1.000 on the 11 fixtures. A different GPU can change model output slightly, and CareMind's own evaluation treats per-sample changes as material | same | CareMind report §6.2–6.3, Appendix B |
| Mali voice turn: whisper large-v3-turbo + Typhoon-8B + TTS, all on GPU | ≤5 s per turn end to end | ≤5 s per turn end to end | Mali §1 |
| faster-whisper on GPU | `CTranslate2` reports CUDA available on aarch64 (custom build, see §9) | `CTranslate2` reports CUDA available (standard install) | §9 |
| CURA AI suggestion latency, 5 coders concurrent | team sets a target before delivery; currently unmeasured | same | CURA AI §2 |
| Services server | 6 VMs up, nightly backup to NAS restored once and timed | same | CURA AI §5.3 |
| Booth devices | BP, thermometer and oximeter each deliver a reading into the booth over their tested interface; QR scan of a Visit Slip fills the HN | same | Mali §4 |

---

## 9. Known risks, and what to do about them

| Risk | Option A | Option B |
|---|---|---|
| **Arm64 software** | Ollama, vLLM and PyTorch have arm64 GPU builds that work on GB10. **faster-whisper does not:** the pip `CTranslate2` package for arm64 is CPU-only, so it must be built from source or taken from community CUDA 13 builds. Budget 2–3 days for the Mali team to validate whisper and the Thai TTS on a loaner or at the vendor before acceptance. Fallback: whisper.cpp with CUDA | Not applicable — x86, standard packages |
| **Per-request speed** | CareMind single notes ≈ today (~6–11 s); ~24 s each at the shift-change peak, missing NFR-9 there. Upgrading later means a new purchase, not a configuration change | Meets NFR-9 with margin, including peaks |
| **No GPU partitioning** | Three prototypes share one GPU; a runaway job slows all three. Splitting prototypes across the two units limits this; within a unit, run each prototype in its own container with a memory cap, and load-test only at night on unit 2, when the OPD and coders are off. (Mali's spec records one test lost to a shared GPU) | Same mitigation; load-test on the staging machine (B1 or B2) |
| **Single point of failure** | Covered at reduced speed: if one unit fails, move its workload to the other (manual switch of the endpoint or Caddy upstream). The whole pilot load fits on one unit. There is no idle standby, so repair time matters: write advance replacement into the TOR | B1: manual switch-over to the lab workstation, at ~12 s per note, with synthetic data only until it is moved inside the hospital. B2: in-hospital spare that can serve patients, at reduced speed |
| **Warranty in Chiang Rai** | NVIDIA Founders Edition has a limited warranty; OEM variants carry 3-year business warranties. Write 3-year on-site or advance replacement into the TOR | Server and card under the server vendor's 3-year on-site NBD warranty, with the GPU vendor-certified for that chassis |
| **Model size ceiling** | 128 GB: room for a 70B-class model | 48 GB: the three prototypes fit (~38 GB) but a 70B-class model does not fit beside them |
| **Single services server** | RAID 1 and redundant PSU cover disk and power; a motherboard failure means restore-from-NAS onto any spare x86 box. Acceptable for a pilot, and the restore drill in §8 proves it | Same |

---

## 10. Open items that change the numbers

- ~~**Q1** Does MFU IT or the hospital already have a spare server?~~ **Resolved, 2 Oct 2026: no.** The services
  server (§3) is required and is already in every total.
- **Q2** **Option A or B?** For the confirmed pilot scope, recommendation: **A, with both units in production**
  — it meets the targets at 2–3 wards and one booth and is the cheaper option at Thai retail prices. Choose B instead if the hardware must
  carry CareMind beyond ~7 wards without another purchase. If A is chosen, budget 2–3 days for the Mali team
  to validate the speech recogniser on a loaner unit before acceptance (§9).
- **Q3** Under Option B, staging B1 (lab workstation, ฿0) or B2 (in-hospital spare, +฿120,000–140,000)?
- **Q4** Deploy date. E-bidding lead time is 45–90 days from TOR; GB10 units and 48 GB cards have both had
  4–8 week stock delays.
- **Q5** Who owns the assets after the pilot, MFU or the medical center? Sets which office issues the TOR.
- ~~**Q6** Number of booths and wards in the pilot?~~ **Resolved, 2 Oct 2026: 2–3 wards and one booth** (§4.0).
  Revisit §4 if the pilot grows past ~7 wards or 2 booths.
- **Q7** How likely is a hospital-wide rollout (≈15 wards) within 3 years? If likely, Option B is cheaper overall (§11).

---

## 11. Scale-up plan

The pilot is 2–3 wards and one booth. If it succeeds, the likely next steps are about 7 wards with 2 booths, then
the whole hospital: about 15 wards (CareMind spec §5.1) and 3 booths (≈300 of the ~440 daily walk-ins). CareMind
drives the AI hardware at every stage; demand is 1.25 notes/minute per ward at the shift-change peak.

| Stage | CareMind demand at peak | **Option A path** | **Option B path** |
|---|---|---|---|
| **1. Pilot** — 2–3 wards, 1 booth | 2.5–3.75 notes/min | Both Sparks in production: unit 1 CareMind at ~25–40% load, unit 2 Mali + CURA AI. Note ~6–11 s ✓, booth ≤5 s ✓ | GPU server at ~8–11% load. Note ~3–5 s ✓ |
| **2. Expand** — ~7 wards, 2 booths | ~8.75 notes/min | One unit would be at ~90% for CareMind alone, so spread CareMind over both units through Caddy: ~45% of combined capacity. Notes mostly ~6–11 s, occasionally ~14–16 s at shift change ✓; give Mali priority on unit 2. **AI hardware +฿0** | ~27% load, notes ≤8 s at peak ✓. **AI hardware +฿0** |
| **3. Hospital-wide** — ~15 wards, 3 booths | ~19 notes/min | ~100% of both units for CareMind alone, notes ~24 s at peak ✗. Two ways forward (§11.1): **add the Option B GPU server, +฿380,000–510,000** — CareMind and Mali move to it (~60% load), CURA AI stays on one Spark, the other becomes the test machine and spare; **or add 4 more Sparks, +฿584,000–1,012,000** | ~58% load, notes ≤8 s ✓. **Add an in-hospital spare GPU (B2), +฿120,000–140,000**, since hospital-wide use needs a spare that can serve patients |

Both paths also need one more booth at stage 2 and another at stage 3, ฿94,700–114,700 each (§6).

**AI hardware spent by the end of each stage (THB):**

| | Stage 1 | Stage 2 | Stage 3 |
|---|---:|---:|---:|
| Option A path | 292,000–506,000 | 292,000–506,000 | **672,000–1,016,000** |
| Option B path | 380,000–510,000 | 380,000–510,000 | **500,000–650,000** |

### 11.1 Can Option A scale by adding more Sparks?

**Yes.** Sparks scale out: each extra unit adds ~9–10 notes/min, and CareMind's Caddy proxy spreads notes across
all units behind one address. What more units do **not** do is make a single note faster — one note on a Spark
always takes ~6–11 s. The ~24 s figure only appears when four notes queue on one busy unit; with enough units,
each stays lightly loaded and notes keep running one at a time.

Sizing for stage 3 (~19 notes/min, 3 booths), keeping each CareMind unit at about half load so notes rarely queue:

| Workload | Units needed | Why |
|---|---:|---|
| CareMind | 4 | 19 notes/min ÷ (~9.5 per unit × 50% load) ≈ 4 |
| Mali (3 booths) + CURA AI | 2 | One unit holds 2 booths at ≤5 s per voice turn; the third booth and CURA AI need a second unit |
| **Total** | **6** | **2 already bought + 4 more** |

| Stage 3 route from Option A | Added cost (THB) | AI hardware total (THB) | CareMind note at peak | Boxes to run |
|---|---:|---:|---|---:|
| Add 4 Sparks (+ shelves) | 584,000–1,012,000 | 876,000–1,518,000 | ~6–11 s, at the edge of NFR-9 | 6 |
| Add the Option B GPU server | 380,000–510,000 | 672,000–1,016,000 | ≤8 s ✓ | 3 |
| *(Option B from the start)* | *120,000–140,000* | *500,000–650,000* | *≤8 s ✓* | *1–2* |

Scaling with Sparks works but is the most expensive route to hospital-wide use, gives slower notes, and means six
boxes to power (~1.5 kW), patch and monitor. Adding Sparks makes sense for a smaller step: **a third Spark** (+฿146,000–
253,000) takes Option A comfortably to ~10 wards. For the full hospital, the GPU server is cheaper and faster.

The Spark's 200 Gb network port can also join two units to run one very large model (hundreds of billions of
parameters) across both. That is for model size, not speed: it does not make the 8B models used here any faster.

**How to read this.** Option A is cheaper if the project stops at the pilot or at stage 2. Option B is cheaper if
the hospital goes hospital-wide on this hardware, by about ฿170,000–370,000, because Option A ends up buying
the GPU server anyway. The decision therefore turns on how likely stage 3 is within the hardware's 3-year
warranty life. If stage 3 is likely, buy Option B now; if it is uncertain, buy Option A and treat the GPU server
as a stage-3 purchase, with the Sparks staying in service for CURA AI and as the test machine.

---

## Sources

Team specifications: `CareMind/HARDWARE_SPEC.md` (measurements 25 Aug 2026, §5.1–5.8), `CuraAI/HARDWARE_SPEC.md`,
`Mali Prescreening/HARDWARE_SPEC.md`.

CareMind workload detail: `CareMind/caremind-final-report.pdf` §6.2–6.4 and Appendix B (latency, 3-hour load
test, 45-request burst); `CareMind/technical-docs/architecture.md` (two-machine topology, second model);
`CareMind/technical-docs/setup-guide.md` §4, §8–9.

Thai vendor listings: see §7.1.

Published benchmarks and prices (checked 2 Oct 2026):
- NVIDIA DGX Spark Founders Edition price change to US$4,699 (Feb 2026): https://forums.developer.nvidia.com/t/2-23-2026-price-change-announcement/361713
- RTX PRO 4000 Blackwell price history: https://gpuprix.com/us/gpus/rtx-pro-4000-blackwell
- Ollama — NVIDIA DGX Spark performance (Llama 3.1 8B q4_K_M decode 38.02 tokens/s): https://ollama.com/blog/nvidia-spark-performance
- llama.cpp on DGX Spark (8B Q4_K_M, 40–44 tokens/s): https://github.com/DandinPower/llama.cpp_bench/blob/main/dgx_spark/report.md
- LMSYS — DGX Spark in-depth review: https://www.lmsys.org/blog/2025-10-13-nvidia-dgx-spark/
- RTX A6000, Llama 3.1 8B Q4_K_M (102 tokens/s): https://github.com/XiongjieDai/GPU-Benchmarks-on-LLM-Inference
- CTranslate2 / faster-whisper CUDA on DGX Spark (aarch64): https://github.com/rappdw/transcribe-dgx
- ASUS Ascent GX10, Thai retail: https://www.advice.co.th/product/ai-supercomputer/nvidia-dgx-spark/nvidia-dgx-spark-asus-gx10-gg0011bn-90ms0371-m000b0-
- RTX PRO 5000 Blackwell 48 GB: https://www.pny.com/nvidia-rtx-pro-5000-blackwell
- RTX A6000 pricing, 2026: https://gpudojo.com/a6000
- RTX PRO 6000 Blackwell price change: https://www.tomshardware.com/pc-components/gpus/nvidia-doubles-rtx-pro-6000-blackwells-msrp-to-a-staggering-usd16-000-96gb-card-started-pre-orders-below-usd8-000-last-year
