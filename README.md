# MOTION // Interactive Techwear HUD Cyber-Atelier

An immersive, high-performance WebGL digital flagship experience showcasing Collection 01—a premium 4-piece technical streetwear hoodie line. Built with a raw, cybernetic telemetry HUD theme (Obsidian & Amber), the website bridges editorial storytelling, detailed design inspection, and interactive commerce.

---

## 🌌 Project Concept & Brand Brief
**MOTION** is designed to challenge standard 2D e-commerce layouts. Instead of scrolling through static grid images, the visitor travels through a curated spatial narrative. The garment itself is the centerpiece—floating weightlessly in an obsidian dark room under dynamic, amber-tinted industrial spotlights.

### 🎨 Visual & Aesthetic System (Option B)
* **Color Palette**: Pitch Obsidian Black (`#050505`), Telemetry Amber (`#ffb03a`), Muted Steel (`#8a96a3`), and off-white blueprint details (`#f2f2ed`).
* **Typography**: Space Mono (a monospaced, high-contrast digital telemetry font) is used for headers, details, HUD labels, and pricing to establish a drafting board feel.
* **Atmosphere**: Volumetric amber data-dust particles drift slowly across the screen, complemented by a subtle film grain and gridlines simulating a CAD architecture layout.
* **Telemetry Lighting Cycle**: A background interval loop shifts the atmosphere between three telemetry lighting profiles every 20 seconds:
  1. 🌅 **Telemetry Amber**: Soft orange spotlights.
  2. 🚨 **Tactical Red**: Intense hazard-red tones.
  3. 🌐 **Cyan Blueprint**: Futuristic blueprint cyan vectors.

---

## 🛠️ Technology Stack
* **Graphics Core**: Three.js (WebGL) for importing, centering, lighting, and rendering 3D garments.
* **Animation Framework**: GSAP (GreenSock) and ScrollTrigger for coordinate-based scroll animations.
* **Styling**: Pure CSS (Vanilla CSS, no external libraries) for total layout control, responsive grids, and glassy overlays.
* **Assets**: GLTF/GLB digital garment models and high-quality detail imagery.

---

## 🧭 Narrative Scroll & User Journey

### Scene 1: The Hero Entry
* **What it is**: The opening statement page displaying the primary centerpiece model (The Balenciaga Hoodie) floating in space.
* **Interactions**:
  * Hover mouse to trigger subtle camera drift and parallax.
  * Click **"Explore Collection"** to scroll down smoothly.

### Scene 2: Interactive Hotspot Scan
* **What it is**: As you scroll, the camera pans close to specific coordinate nodes on the hoodie, bringing up glowing radar indicators and spec cards.
* **Technical Details**:
  * **01 / Material (420 GSM French Terry)**: High-density loopback cotton designed for weight and drape.
  * **02 / Design (Oversized Silhouette)**: Drop-shoulder and curved underarm panel cut.
  * **03 / Detail (Double-Lined Hood)**: Deep dual-layer hood with hidden internal seams.
* **How it works**: Uses CSS `.sticky-viewport` to lock elements to the viewport, keeping them perfectly aligned with the fixed 3D canvas during scroll transitions.

### Scene 3: Behind the Design (Blueprint Collage)
* **What it is**: An editor's collage displaying draft concept sketches, notes, waveforms, concrete mood boards, and routes.
* **Interactions**:
  * Cards float with independent parallax rates as you scroll.
  * Displays a custom generated flat technical flat fashion blueprint sketch of the hoodie pattern.
  * Shows a Paris Workshop atelier tracker coordinate map.

### Scene 4: The Dialogue of Form (3D Collection Gallery)
* **What it is**: The shopping section where all 4 hoodies (Balenciaga, Panel Sports, Flame Print, and Muscle Hoodie) are lined up side-by-side on a digital showroom rail.
* **Interactions**:
  * Click **"Inspect 3D"** on any card (or click a garment mesh directly) to draw it close for inspection.
  * **360° Drag Rotation**: While inspecting, **drag your mouse or swipe on touch screens** to spin the model in 3D to view the back, hood, and sleeves. Cursor shifts between `grab` and `grabbing` states.
  * **Backlight Glow Backdrop**: Entering inspection mode fades in a glowing radial backdrop behind the active model to illuminate details.
  * **Spotlight Brightening**: Three.js spotlight intensity is dynamically boosted and fog is cleared.
  * **Diagnostic Cart Drawer**: Select S / M / L / XL sizes and click **"Add to Atelier Cart"**.
  * Click the close (**"x"**) button to exit inspect mode and restore default showroom spacing and colors.

---

## 🚀 Running the Project Locally

Due to browser security restrictions, opening files directly (`file:///`) will block JavaScript from loading 3D assets (CORS policy). You must serve the directory using a local HTTP server.

### Option A: Using Python (Installed by default on most systems)
1. Open your terminal or Command Prompt.
2. Navigate to the project root directory.
3. Run the following command:
   ```bash
   python -m http.server 8000
   ```
4. Open your browser and navigate to: **`http://localhost:8000`**

### Option B: Using Node.js (npx)
1. Open your terminal or Command Prompt.
2. Run this command:
   ```bash
   npx http-server -p 8000 -c-1
   ```
3. Open your browser and navigate to: **`http://localhost:8000`**

---

## 📁 Repository Directory Structure
```text
├── assets/
│   ├── balenciaga_hoodie.glb           # 3D Model: Hoodie 01 (Centerpiece)
│   ├── green_and_white_hoodie.glb      # 3D Model: Hoodie 02
│   ├── classic_black_flame_hoodie.glb  # 3D Model: Hoodie 03
│   ├── muscle_hoodie.glb               # 3D Model: Hoodie 04
│   ├── design_sketch.jpg               # Techwear Flat Blueprint Sketch
│   ├── mood_photo.jpg                  # Concrete architecture shadow moodboard photo
│   ├── material_swatch.jpg             # Terry fabric swatch image
│   └── micro_*.jpg                     # Hotspot closeup thumb images
├── index.html                          # Page layout structures & copy elements
├── style.css                           # Color palette system, layout grids & transitions
├── main.js                             # Three.js environments, Scroll animations & controls
└── README.md                           # Project documentation brief
```
