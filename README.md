# MakerFlow 3D 🛠️

**MakerFlow 3D** is a professional-grade 2D-to-3D-Printing pipeline. It leverages the advanced spatial reasoning of Gemini 3 Pro to act as a **Neural Sculptor**, transforming conceptual descriptions and 2D blueprints into manifold 3D primitive volumes ready for physical manufacturing.

![MakerFlow 3D Header](https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=1200&h=400)

## ✨ Features

-   **Neural Reconstruction**: Uses Gemini 3 Pro's spatial intelligence to decompose 2D concepts into 3D primitives (BOX, SPHERE, CAPSULE, CYLINDER).
-   **Dual Image Providers**: Choose between **Gemini 2.5 Flash** or **Runware.ai** for generating initial 4-view orthographic blueprints.
-   **Interactive 3D Workbench**: Real-time rendering with Three.js, featuring wireframe modes, blueprint overlays, and Y-axis clipping tools.
-   **Manufacturing Optimized**: Generates manifold geometry designed for 3D printing, with integrated slicing metadata for various materials (PLA, Resin, ABS, etc.).
-   **Neural Refinement**: Chat-based geometry modification—simply describe changes like "make the legs thicker" or "scale up the torso."
-   **Export Formats**: Seamlessly download models as `.STL` (Printing) or `.OBJ` (Digital Design).

## 🚀 Getting Started

### Prerequisites
-   A **Google Gemini API Key** (Paid GCP project required for Gemini 3 Pro features).
-   (Optional) A **Runware.ai API Key** for high-speed image generation.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/MasteraSnackin/MakerFlow-3D.git
   ```
2. Open `index.html` in a modern browser or serve the directory using a static server like `npx serve`.

## 🛠️ Built With
-   **React 19** - UI Component Architecture
-   **Three.js / React Three Fiber** - 3D Engine & Rendering
-   **Tailwind CSS** - Modern Utility-first Styling
-   **Google Gemini API** - Neural Spatial Reasoning & Image Gen
-   **Runware.ai** - High-speed Image Inference
-   **Lucide React** - Professional Icon Suite

## 📜 License
This project is licensed under the MIT License - see the LICENSE file for details.

---
*Created by MasteraSnackin - Bridging the gap between AI concepts and physical objects.*
