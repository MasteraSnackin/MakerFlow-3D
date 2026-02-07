import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Grid, Stage, PerspectiveCamera, Stars, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Primitive3D, MaterialProperties, LightingPreset, LightConfig } from '../../types';
// Fixed: Added missing Layers icon import to resolve "Cannot find name 'Layers'" error.
import { Scissors, ChevronDown, ChevronUp, Sun, Camera, Maximize2, Lightbulb, Zap, Layers } from 'lucide-react';

// Fix for JSX.IntrinsicElements errors in environment where R3F types are not automatically picked up
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      planeGeometry: any;
      meshBasicMaterial: any;
      primitive: any;
      meshPhysicalMaterial: any;
      directionalLight: any;
      ambientLight: any;
      spotLight: any;
      pointLight: any;
      boxGeometry: any;
      sphereGeometry: any;
      cylinderGeometry: any;
      capsuleGeometry: any;
    }
  }
}

interface NeuralSceneProps {
  primitives: Primitive3D[];
  clipPlaneY?: number;
  showClipping?: boolean;
  onClipChange?: (val: number) => void;
  onClipToggle?: (val: boolean) => void;
  material: MaterialProperties;
  lightingPreset?: LightingPreset;
  customLight?: LightConfig;
  wireframe?: boolean;
  referenceSheetUrl?: string;
  showBlueprints?: boolean;
}

const BlueprintPlanes: React.FC<{ url: string }> = ({ url }) => {
  const texture = useLoader(THREE.TextureLoader, url);
  
  const frontTex = texture.clone();
  frontTex.repeat.set(0.25, 1);
  frontTex.offset.set(0, 0);

  const sideTex = texture.clone();
  sideTex.repeat.set(0.25, 1);
  sideTex.offset.set(0.5, 0);

  return (
    <group>
      <mesh position={[0, 0, -5]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial map={frontTex} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial map={sideTex} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const ModelPrimitive: React.FC<{ 
  primitive: Primitive3D; 
  clippingPlane?: THREE.Plane;
  material: MaterialProperties;
  wireframe?: boolean;
  index: number;
}> = ({ primitive, clippingPlane, material, wireframe, index }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const diffuseMap = material.diffuseMap ? useLoader(THREE.TextureLoader, material.diffuseMap) : null;
  const emissiveMap = material.emissiveMap ? useLoader(THREE.TextureLoader, material.emissiveMap) : null;
  const aoMap = material.ambientOcclusionMap ? useLoader(THREE.TextureLoader, material.ambientOcclusionMap) : null;
  const normalMap = material.normalMap ? useLoader(THREE.TextureLoader, material.normalMap) : null;

  useEffect(() => {
    [diffuseMap, emissiveMap, aoMap, normalMap].forEach(tex => {
      if (tex) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(material.textureTiling?.[0] ?? 1, material.textureTiling?.[1] ?? 1);
        tex.offset.set(material.textureOffset?.[0] ?? 0, material.textureOffset?.[1] ?? 0);
        tex.needsUpdate = true;
      }
    });
  }, [diffuseMap, emissiveMap, aoMap, normalMap, material.textureTiling, material.textureOffset]);

  const materialProps = useMemo(() => ({
    color: hovered ? '#ffffff' : (primitive.color || material.color),
    map: diffuseMap,
    emissiveMap: emissiveMap,
    aoMap: aoMap,
    normalMap: normalMap,
    metalness: material.metalness,
    roughness: material.roughness,
    clippingPlanes: clippingPlane ? [clippingPlane] : [],
    clipIntersection: false,
    side: THREE.DoubleSide,
    transmission: material.transmission ?? 0,
    thickness: material.thickness ?? 0,
    emissive: new THREE.Color(material.emissive ?? '#000000'),
    emissiveIntensity: material.emissiveIntensity ?? 0,
    attenuationColor: new THREE.Color(material.attenuationColor ?? material.color),
    attenuationDistance: material.attenuationDistance ?? Infinity,
    transparent: (material.transmission ?? 0) > 0 || !!diffuseMap,
    opacity: 1.0,
    envMapIntensity: 1,
    ior: 1.5,
    wireframe: wireframe ?? false,
    aoMapIntensity: 1.0,
  }), [material, clippingPlane, wireframe, diffuseMap, emissiveMap, aoMap, normalMap, hovered, primitive.color]);

  const geometry = useMemo(() => {
    switch (primitive.type) {
      case 'BOX': return new THREE.BoxGeometry(1, 1, 1);
      case 'SPHERE': return new THREE.SphereGeometry(0.5, 32, 32);
      case 'CYLINDER': return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
      case 'CAPSULE': return new THREE.CapsuleGeometry(0.5, 1, 4, 16);
      default: return new THREE.BoxGeometry(1, 1, 1);
    }
  }, [primitive.type]);

  return (
    <mesh 
      ref={meshRef}
      position={primitive.position} 
      rotation={primitive.rotation} 
      scale={primitive.scale}
      castShadow
      receiveShadow
      onPointerOver={(e) => (e.stopPropagation(), setHovered(true))}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={geometry} attach="geometry" />
      <meshPhysicalMaterial {...materialProps} />
    </mesh>
  );
};

export const NeuralScene: React.FC<NeuralSceneProps> = ({ 
  primitives, 
  clipPlaneY = 0, 
  showClipping = false,
  onClipChange,
  onClipToggle,
  material,
  lightingPreset = 'STUDIO',
  customLight,
  wireframe = false,
  referenceSheetUrl,
  showBlueprints = false
}) => {
  const [clippingExpanded, setClippingExpanded] = useState(false);
  const [previewStudio, setPreviewStudio] = useState(false);

  const clippingPlane = useMemo(() => 
    showClipping ? new THREE.Plane(new THREE.Vector3(0, -1, 0), clipPlaneY) : undefined, 
    [showClipping, clipPlaneY]
  );

  const Lighting = () => {
    const activePreset = previewStudio ? 'STUDIO' : lightingPreset;
    
    switch (activePreset) {
      case 'DAYLIGHT':
        return (
          <>
            <directionalLight position={[10, 20, 10]} intensity={1.8} castShadow color="#fff5e6" />
            <ambientLight intensity={0.5} color="#e6f3ff" />
            <Environment preset="park" />
          </>
        );
      case 'SPOTLIGHT':
        return (
          <>
            <spotLight position={[5, 12, 5]} angle={0.25} penumbra={0.8} intensity={40} castShadow />
            <ambientLight intensity={0.05} />
            <Environment preset="night" />
          </>
        );
      case 'CUSTOM':
        return (
          <>
            {customLight && (
              <pointLight 
                position={customLight.position} 
                intensity={customLight.intensity * 10} 
                color={customLight.color} 
                castShadow 
              />
            )}
            <ambientLight intensity={0.2} />
          </>
        );
      default: // STUDIO
        return (
          <>
            <Stage environment="city" intensity={0.5} shadows={{ opacity: 0.7, blur: 2 }}>
              <mesh visible={false}><boxGeometry /></mesh>
            </Stage>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
          </>
        );
    }
  };

  return (
    <div className="w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl relative border border-slate-700">
      <Canvas shadows gl={{ localClippingEnabled: true, antialias: true }}>
        <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />
        <Lighting />
        
        {showBlueprints && referenceSheetUrl && (
          <BlueprintPlanes url={referenceSheetUrl} />
        )}

        <group position={[0, 0, 0]}>
          {primitives.map((p, i) => (
            <ModelPrimitive 
              key={i} 
              index={i}
              primitive={p} 
              clippingPlane={clippingPlane} 
              material={material} 
              wireframe={wireframe}
            />
          ))}
        </group>

        <Grid 
          infiniteGrid 
          fadeDistance={30} 
          sectionSize={1} 
          sectionColor="#334155" 
          cellColor="#1e293b" 
        />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </Canvas>

      {/* Floating Axis Overlays */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-md border border-slate-600 text-xs text-slate-300">
          <div className="w-2 h-2 rounded-full bg-red-500"></div> X
          <div className="w-2 h-2 rounded-full bg-green-500 ml-1"></div> Y
          <div className="w-2 h-2 rounded-full bg-blue-500 ml-1"></div> Z
        </div>
      </div>
      
      {/* Consolidated Clipping Tools */}
      <div className="absolute top-4 left-24 flex flex-col gap-1 w-48 transition-all">
        <div className="bg-slate-800/90 backdrop-blur-md rounded-xl border border-slate-600 shadow-xl overflow-hidden pointer-events-auto">
          <button 
            onClick={() => setClippingExpanded(!clippingExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-3 h-3 text-orange-400" />
              <span className="font-bold tracking-tight">Clipping Tools</span>
            </div>
            {clippingExpanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
          </button>
          
          {clippingExpanded && (
            <div className="p-3 bg-slate-900/50 border-t border-slate-700 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Clipper Active</span>
                <button 
                  onClick={() => onClipToggle?.(!showClipping)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${showClipping ? 'bg-orange-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showClipping ? 'left-4.5' : 'left-0.5'}`} />
                </button>
              </div>
              {showClipping && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] text-slate-500 uppercase font-mono">
                    <span>Height Y: {clipPlaneY.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" min="-5" max="10" step="0.05" value={clipPlaneY} 
                    onChange={(e) => onClipChange?.(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Lighting Comparison Button */}
      <div className="absolute top-4 right-4 pointer-events-auto flex items-center gap-2">
        <button 
          onClick={() => setPreviewStudio(!previewStudio)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-md text-[10px] font-bold uppercase transition-all shadow-lg ${
            previewStudio 
            ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/20' 
            : 'bg-slate-800/80 border-slate-600 text-slate-400 hover:text-white'
          }`}
          title="Toggle between selected preset and default studio setup"
        >
          {previewStudio ? <Camera className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          <span>{previewStudio ? 'Studio Preview' : 'Preview Lighting'}</span>
        </button>
      </div>

      <div className="absolute bottom-4 left-4 flex gap-2">
        {wireframe && (
          <div className="px-3 py-1 bg-blue-600/80 text-[10px] font-bold text-white rounded-full backdrop-blur-sm border border-blue-400/50 flex items-center gap-1">
            <Maximize2 className="w-3 h-3" /> WIREFRAME
          </div>
        )}
        {showBlueprints && (
          <div className="px-3 py-1 bg-emerald-600/80 text-[10px] font-bold text-white rounded-full backdrop-blur-sm border border-emerald-400/50 flex items-center gap-1">
            <Layers className="w-3 h-3" /> BLUEPRINTS
          </div>
        )}
      </div>
    </div>
  );
};