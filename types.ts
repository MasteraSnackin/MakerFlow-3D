
export enum AppStage {
  PROMPT = 'PROMPT',
  IMAGE_GEN = 'IMAGE_GEN',
  SCULPTING = 'SCULPTING',
  PRINT_PREP = 'PRINT_PREP'
}

export type PrimitiveType = 'BOX' | 'SPHERE' | 'CAPSULE' | 'CYLINDER';

export interface Primitive3D {
  type: PrimitiveType;
  position: [number, number, number];
  rotation: [number, number, number]; // Radians
  scale: [number, number, number];
  color?: string;
}

export interface ModelData {
  name: string;
  description: string;
  primitives: Primitive3D[];
}

export interface ReferenceSheet {
  imageUrl: string;
  prompt: string;
}

export type MaterialPreset = 'PLA_MATTE' | 'RESIN_GLOSS' | 'ABS_INDUSTRIAL' | 'METALLIC_GOLD' | 'WOOD_FILL' | 'GLASS_CLEAR' | 'GLOW_CORE' | 'NEON_PULSE' | 'JADE_ORGANIC' | 'WAX_CANDLE';

export interface LightConfig {
  position: [number, number, number];
  intensity: number;
  color: string;
}

export interface MaterialProperties {
  color: string;
  metalness: number;
  roughness: number;
  transmission?: number;
  thickness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  attenuationColor?: string;
  attenuationDistance?: number;
  label: string;
  slicingTips: {
    layerHeight: string;
    infill: string;
    supports: string;
    reasoning: string;
  };
  // Texture Support
  diffuseMap?: string;
  emissiveMap?: string;
  ambientOcclusionMap?: string;
  normalMap?: string;
  textureTiling?: [number, number];
  textureOffset?: [number, number];
}

export type ArtisticStyle = 'STANDARD' | 'LOW_POLY' | 'ORGANIC' | 'VOXEL' | 'INDUSTRIAL' | 'MINIMALIST';

export type LightingPreset = 'STUDIO' | 'DAYLIGHT' | 'SPOTLIGHT' | 'CUSTOM';

export const ART_STYLES: Record<ArtisticStyle, { label: string; description: string }> = {
  STANDARD: { label: 'Standard', description: 'Balanced geometric reconstruction.' },
  LOW_POLY: { label: 'Low Poly', description: 'Sharp, faceted aesthetic using primary boxes.' },
  ORGANIC: { label: 'Organic', description: 'Smooth, fluid joins using spheres and capsules.' },
  VOXEL: { label: 'Voxel', description: 'Block-based grid reconstruction.' },
  INDUSTRIAL: { label: 'Industrial', description: 'Sharp mechanical parts and cylindrical joints.' },
  MINIMALIST: { label: 'Minimalist', description: 'Abstract representation using minimal primitives.' }
};

export const MATERIAL_PRESETS: Record<MaterialPreset, MaterialProperties> = {
  PLA_MATTE: {
    label: 'PLA Matte',
    color: '#334155',
    metalness: 0,
    roughness: 0.8,
    slicingTips: { 
      layerHeight: '0.2mm', 
      infill: '15% Gyroid', 
      supports: 'Normal',
      reasoning: 'Standard FDM settings for high reliability.'
    }
  },
  RESIN_GLOSS: {
    label: 'High-Def Resin',
    color: '#0ea5e9',
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0,
    slicingTips: { 
      layerHeight: '0.05mm', 
      infill: 'Solid', 
      supports: 'Heavy',
      reasoning: 'High precision for SLA/DLP printing.'
    }
  },
  GLASS_CLEAR: {
    label: 'Clear Resin',
    color: '#ffffff',
    metalness: 0,
    roughness: 0.05,
    transmission: 0.95,
    thickness: 0.5,
    attenuationColor: '#ffffff',
    attenuationDistance: 1,
    slicingTips: { 
      layerHeight: '0.05mm', 
      infill: '100%', 
      supports: 'Heavy',
      reasoning: 'Solid infill prevents internal bubbles.'
    }
  },
  ABS_INDUSTRIAL: {
    label: 'ABS Industrial',
    color: '#f8fafc',
    metalness: 0.2,
    roughness: 0.4,
    slicingTips: { 
      layerHeight: '0.15mm', 
      infill: '25% Cubic', 
      supports: 'Required',
      reasoning: 'Higher infill for structural strength.'
    }
  },
  METALLIC_GOLD: {
    label: 'Metallic Silk',
    color: '#eab308',
    metalness: 0.9,
    roughness: 0.2,
    slicingTips: { 
      layerHeight: '0.12mm', 
      infill: '10%', 
      supports: 'Minimize',
      reasoning: 'Fine layers hide metallic artifacts.'
    }
  },
  WOOD_FILL: {
    label: 'Wood Composite',
    color: '#78350f',
    metalness: 0,
    roughness: 0.95,
    slicingTips: { 
      layerHeight: '0.3mm', 
      infill: '5-10%', 
      supports: 'Easy',
      reasoning: 'Thick layers give an organic grain look.'
    }
  },
  GLOW_CORE: {
    label: 'Biolume Glow',
    color: '#22c55e',
    metalness: 0.1,
    roughness: 0.3,
    emissive: '#22c55e',
    emissiveIntensity: 1.5,
    slicingTips: { 
      layerHeight: '0.2mm', 
      infill: '15%', 
      supports: 'Normal',
      reasoning: 'Glow filaments need standard FDM pathing.'
    }
  },
  NEON_PULSE: {
    label: 'Neon Synth',
    color: '#000000',
    metalness: 0,
    roughness: 1,
    emissive: '#3b82f6',
    emissiveIntensity: 4,
    slicingTips: { 
      layerHeight: '0.2mm', 
      infill: '10%', 
      supports: 'Normal',
      reasoning: 'Translucent shells enhance glow effect.'
    }
  },
  JADE_ORGANIC: {
    label: 'Jade Crystal',
    color: '#10b981',
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.6,
    thickness: 1,
    attenuationColor: '#064e3b',
    attenuationDistance: 0.4,
    slicingTips: { 
      layerHeight: '0.1mm', 
      infill: '80%', 
      supports: 'Normal',
      reasoning: 'High density preserves subsurface light.'
    }
  },
  WAX_CANDLE: {
    label: 'Candle Wax',
    color: '#fdf4ff',
    metalness: 0,
    roughness: 0.4,
    transmission: 0.3,
    thickness: 2,
    attenuationColor: '#fef3c7',
    attenuationDistance: 0.2,
    slicingTips: { 
      layerHeight: '0.1mm', 
      infill: 'Solid', 
      supports: 'Heavy',
      reasoning: 'Smooth surfaces capture soft light best.'
    }
  }
};
