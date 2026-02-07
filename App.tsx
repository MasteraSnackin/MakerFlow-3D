import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AppStage, 
  ModelData, 
  ReferenceSheet, 
  ArtisticStyle, 
  MaterialPreset, 
  ART_STYLES, 
  MATERIAL_PRESETS,
  LightingPreset,
  Primitive3D,
  LightConfig
} from './types';
import { generateReferenceSheet, reconstruct3DVolume, refine3DVolume } from './services/geminiService';
import { generateRunwareReferenceSheet } from './services/runwareService';
import { exportModelToSTL, exportModelToOBJ } from './utils/exportUtils';
import { Button } from './components/ui/Button';
import { NeuralScene } from './components/3D/NeuralScene';
import { 
  Box, 
  Layers, 
  Printer, 
  Wand2, 
  ArrowRight, 
  ChevronLeft, 
  RefreshCcw, 
  FileCheck,
  Zap,
  Cpu,
  Scissors,
  Palette,
  Sparkles,
  Info,
  Download,
  Gauge,
  Microscope,
  Upload,
  Image as ImageIcon,
  X,
  Undo,
  Redo,
  Sun,
  Camera,
  Target,
  FileText,
  HelpCircle,
  Eye,
  Settings,
  Grid as GridIcon,
  Zap as ZapIcon,
  Maximize,
  Move,
  Construction,
  Hammer,
  Magnet,
  Droplets,
  Wind,
  Key,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Lock
} from 'lucide-react';

type ImageProvider = 'GEMINI' | 'RUNWARE';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.PROMPT);
  const [prompt, setPrompt] = useState('');
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refSheet, setRefSheet] = useState<ReferenceSheet | null>(null);
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [hasKey, setHasKey] = useState(false);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [imageProvider, setImageProvider] = useState<ImageProvider>(
    (localStorage.getItem('mflow_provider') as ImageProvider) || 'GEMINI'
  );
  const [runwareKey, setRunwareKey] = useState(localStorage.getItem('mflow_runware_key') || '');
  const [customGeminiKey, setCustomGeminiKey] = useState(localStorage.getItem('mflow_gemini_key') || '');

  // History for Undo/Redo
  const [history, setHistory] = useState<ModelData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [clipY, setClipY] = useState(5);
  const [showClipping, setShowClipping] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [showBlueprints, setShowBlueprints] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStyle, setSelectedStyle] = useState<ArtisticStyle>('STANDARD');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialPreset>('PLA_MATTE');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('STUDIO');
  
  const [customEmissiveIntensity, setCustomEmissiveIntensity] = useState<number | undefined>();
  const [customEmissiveColor, setCustomEmissiveColor] = useState<string | undefined>();
  
  const [diffuseMap, setDiffuseMap] = useState<string | undefined>();
  const [emissiveMap, setEmissiveMap] = useState<string | undefined>();
  const [aoMap, setAoMap] = useState<string | undefined>();
  const [normalMap, setNormalMap] = useState<string | undefined>();
  const [textureTiling, setTextureTiling] = useState<[number, number]>([1, 1]);
  const [textureOffset, setTextureOffset] = useState<[number, number]>([0, 0]);
  const [customLight, setCustomLight] = useState<LightConfig>({
    position: [5, 5, 5],
    intensity: 1.5,
    color: '#ffffff'
  });

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diffuseInputRef = useRef<HTMLInputElement>(null);
  const emissiveInputRef = useRef<HTMLInputElement>(null);
  const aoInputRef = useRef<HTMLInputElement>(null);
  const normalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      // If we have a custom key, we consider it "hasKey"
      if (customGeminiKey) {
        setHasKey(true);
        return;
      }
      
      // Safely check for window.aistudio
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        try {
          const selected = await (window as any).aistudio.hasSelectedApiKey();
          setHasKey(selected);
        } catch (e) {
          console.warn("Project IDX environment not detected or API check failed", e);
          setHasKey(false);
        }
      } else {
        setHasKey(false);
      }
    };
    checkKey();
  }, [customGeminiKey]);

  const saveRunwareKey = (key: string) => {
    setRunwareKey(key);
    localStorage.setItem('mflow_runware_key', key);
  };

  const saveCustomGeminiKey = (key: string) => {
    setCustomGeminiKey(key);
    localStorage.setItem('mflow_gemini_key', key);
  };

  const saveProvider = (p: ImageProvider) => {
    setImageProvider(p);
    localStorage.setItem('mflow_provider', p);
  };

  const handleOpenKeyDialog = async () => {
    // Always open settings for manual key entry preference
    setShowSettings(true);
  };

  const pushToHistory = (data: ModelData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(data)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevData = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      setModelData(prevData);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextData = history[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      setModelData(nextData);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearUploadedImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const wrapApiCall = async (fn: () => Promise<any>) => {
    setIsLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found") && !customGeminiKey) {
        setHasKey(false);
        setError("Your Google API key is missing or invalid. Please select a valid paid project key.");
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRef = () => {
    if (uploadedImage) {
      setRefSheet({ imageUrl: uploadedImage, prompt: prompt || 'Uploaded User Concept' });
      setStage(AppStage.IMAGE_GEN);
      return;
    }
    if (!prompt.trim()) {
      setError('Please provide a prompt or upload an image.');
      return;
    }
    
    wrapApiCall(async () => {
      let imageUrl = "";
      if (imageProvider === 'RUNWARE') {
        if (!runwareKey) {
          setShowSettings(true);
          throw new Error("Runware API Key required for this provider.");
        }
        imageUrl = await generateRunwareReferenceSheet(prompt, runwareKey);
      } else {
        imageUrl = await generateReferenceSheet(prompt, customGeminiKey);
      }
      setRefSheet({ imageUrl, prompt });
      setStage(AppStage.IMAGE_GEN);
    });
  };

  const handleSculpt = (styleOverride?: ArtisticStyle) => {
    if (!refSheet) return;
    const styleToUse = styleOverride || selectedStyle;
    wrapApiCall(async () => {
      const data = await reconstruct3DVolume(refSheet.prompt, refSheet.imageUrl, styleToUse, customGeminiKey);
      setModelData(data);
      pushToHistory(data);
      setStage(AppStage.SCULPTING);
    });
  };

  const handleRefineModel = () => {
    if (!modelData || !refinementPrompt.trim()) return;
    wrapApiCall(async () => {
      const updatedModel = await refine3DVolume(modelData, refinementPrompt, selectedStyle, customGeminiKey);
      setModelData(updatedModel);
      pushToHistory(updatedModel);
      setRefinementPrompt('');
    });
  };

  const handleSnapToGrid = () => {
    if (!modelData) return;
    const gridSize = 0.25;
    const snappedPrimitives = modelData.primitives.map(p => ({
      ...p,
      position: p.position.map(v => Math.round(v / gridSize) * gridSize) as [number, number, number],
      scale: p.scale.map(v => Math.round(v / gridSize) * gridSize) as [number, number, number],
    }));
    const updatedModel = { ...modelData, primitives: snappedPrimitives };
    setModelData(updatedModel);
    pushToHistory(updatedModel);
  };

  const reset = () => {
    setStage(AppStage.PROMPT);
    setRefSheet(null);
    setModelData(null);
    setHistory([]);
    setHistoryIndex(-1);
    setError(null);
    setUploadedImage(null);
    setDiffuseMap(undefined);
    setEmissiveMap(undefined);
    setAoMap(undefined);
    setNormalMap(undefined);
    setTextureTiling([1, 1]);
    setTextureOffset([0, 0]);
    setSelectedStyle('STANDARD');
    setSelectedMaterial('PLA_MATTE');
    setCustomEmissiveIntensity(undefined);
    setCustomEmissiveColor(undefined);
  };

  const handleExportSTL = () => {
    if (!modelData) return;
    exportModelToSTL(modelData.primitives, modelData.name);
  };

  const handleExportOBJ = () => {
    if (!modelData) return;
    exportModelToOBJ(modelData.primitives, modelData.name);
  };

  const renderStage = () => {
    switch (stage) {
      case AppStage.PROMPT:
        return (
          <div className="max-w-2xl mx-auto mt-12 p-8 bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                <Wand2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">MakerFlow 3D</h1>
                <p className="text-slate-400">Transform your imagination into printable 3D volumes</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {!hasKey && (
                <div className="p-4 bg-amber-900/30 border border-amber-700/50 rounded-xl flex items-center gap-4">
                  <div className="p-2 bg-amber-600/20 rounded-lg">
                    <Key className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-200">Google API Key Required</p>
                    <p className="text-[10px] text-amber-400">3D Neural Sculpting requires a paid Google project key.</p>
                  </div>
                  <Button variant="outline" className="py-2 px-4 text-xs border-amber-700 text-amber-200 hover:bg-amber-700/20" onClick={handleOpenKeyDialog}>
                    Select Key
                  </Button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">1. Describe your concept</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A chunky stylized companion robot with oversized circular eyes..."
                  className="w-full h-32 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none shadow-inner"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-slate-300 mb-2">2. Or upload reference (Optional)</label>
                {!uploadedImage ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="group cursor-pointer border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-blue-500/5 rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3 bg-slate-900/40"
                  >
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-400" />
                    <p className="text-sm font-medium text-slate-300">Click to upload concept art</p>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500 shadow-lg shadow-blue-500/10 group bg-slate-900">
                    <img src={uploadedImage} alt="Uploaded" className="w-full aspect-video object-contain" />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="danger" className="py-2 px-4" onClick={clearUploadedImage}>
                        <X className="w-4 h-4 mr-2" /> Remove Image
                      </Button>
                    </div>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setUploadedImage)} />
              </div>

              {error && (
                <div className="p-4 bg-red-900/30 border border-red-800/50 rounded-lg text-red-200 text-sm animate-in shake-1">
                  <div className="flex gap-2 items-center mb-1 font-bold"><Info className="w-4 h-4" /> Error</div>
                  {error}
                </div>
              )}

              <Button onClick={handleGenerateRef} className="w-full py-4 text-lg" isLoading={isLoading}>
                {uploadedImage ? 'Process Uploaded Concept' : 'Start Neural Pipeline'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        );

      case AppStage.IMAGE_GEN:
        return (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Blueprint Reference</h2>
                <p className="text-slate-400">Initial 2D reconstruction via {imageProvider === 'GEMINI' ? 'Gemini 2.5 Flash' : 'Runware.ai'}</p>
              </div>
              <Button variant="outline" onClick={reset} disabled={isLoading}>
                <ChevronLeft className="w-4 h-4 mr-2" /> New Design
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden p-2 shadow-2xl group relative min-h-[400px]">
                   {refSheet?.imageUrl ? (
                     <img src={refSheet.imageUrl} className="w-full aspect-video object-contain rounded-xl bg-slate-950" alt="Reference Sheet" />
                   ) : (
                     <div className="flex items-center justify-center h-full text-slate-500 italic">No blueprint available</div>
                   )}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-6 shadow-xl">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    Artistic Style
                  </h3>
                  <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(ART_STYLES).map(([key, style]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedStyle(key as ArtisticStyle)}
                        className={`text-left p-3 rounded-xl border-2 transition-all group ${
                          selectedStyle === key 
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-blue-500/10' 
                          : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold uppercase tracking-tight">{style.label}</div>
                        <div className="text-[10px] opacity-60 leading-tight mt-1">{style.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4">
                  <Button onClick={() => handleSculpt()} isLoading={isLoading} className="w-full py-4 shadow-xl">
                    Neural Reconstruction
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case AppStage.SCULPTING:
      case AppStage.PRINT_PREP:
        const currentMaterialProps = {
          ...MATERIAL_PRESETS[selectedMaterial],
          emissive: customEmissiveColor || MATERIAL_PRESETS[selectedMaterial].emissive,
          emissiveIntensity: customEmissiveIntensity ?? MATERIAL_PRESETS[selectedMaterial].emissiveIntensity,
          diffuseMap,
          emissiveMap,
          ambientOcclusionMap: aoMap,
          normalMap: normalMap,
          textureTiling,
          textureOffset
        };

        return (
          <div className="max-w-7xl mx-auto h-[calc(100vh-160px)] flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 shadow-lg shadow-blue-500/5">
                  <Box className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white leading-none mb-1">{modelData?.name}</h2>
                  <p className="text-slate-400 text-sm max-w-md line-clamp-1 italic">{modelData?.description}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Start Over
                </Button>
                <div className="flex bg-slate-800/80 rounded-xl p-1.5 border border-slate-700 shadow-xl backdrop-blur-md">
                   <Button variant="outline" className="px-4 border-0 bg-transparent hover:bg-emerald-600/20 hover:text-emerald-400" onClick={handleExportSTL}>
                      <Printer className="w-4 h-4 mr-2" /> STL
                   </Button>
                   <div className="w-[1px] bg-slate-700 my-1"></div>
                   <Button variant="outline" className="px-4 border-0 bg-transparent hover:bg-indigo-600/20 hover:text-indigo-400" onClick={handleExportOBJ}>
                      <FileText className="w-4 h-4 mr-2" /> OBJ
                   </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
              <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl space-y-6 shadow-xl">
                  
                  <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-orange-400" />
                      Neural Sculpt
                    </h3>
                    <div className="space-y-3">
                      <textarea 
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        placeholder="Deform, add parts, or resize..."
                        className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500 transition-colors resize-none shadow-inner"
                      />
                      <div className="flex gap-2">
                        <Button variant="primary" className="flex-1 py-2 text-xs" onClick={handleRefineModel} disabled={!refinementPrompt.trim() || isLoading} isLoading={isLoading}>
                           Sculpt Volume
                        </Button>
                        <Button variant="outline" className="px-3 py-2 text-xs" onClick={handleSnapToGrid} title="Snap Geometry to Grid">
                           <Magnet className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                      <Eye className="w-3.5 h-3.5" /> Simulation View
                    </h3>
                    <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-700 group hover:border-slate-500 transition-all cursor-pointer" onClick={() => setWireframe(!wireframe)}>
                      <div className="flex items-center gap-2">
                        <GridIcon className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-slate-300">Wireframe Mesh</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full transition-colors relative ${wireframe ? 'bg-blue-600' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${wireframe ? 'left-6' : 'left-1'}`} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-700 group hover:border-slate-500 transition-all cursor-pointer" onClick={() => setShowBlueprints(!showBlueprints)}>
                      <div className="flex items-center gap-2">
                        <Construction className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-slate-300">Blueprint Overlay</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full transition-colors relative ${showBlueprints ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showBlueprints ? 'left-6' : 'left-1'}`} />
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-700/50" />

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                      <ImageIcon className="w-3.5 h-3.5 text-pink-400" /> Texture Maps
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className={`py-2 px-1 text-[9px] ${diffuseMap ? 'border-blue-500 text-blue-400' : 'text-slate-500'}`} onClick={() => diffuseInputRef.current?.click()}>DIFFUSE</Button>
                      <Button variant="outline" className={`py-2 px-1 text-[9px] ${emissiveMap ? 'border-yellow-500 text-yellow-400' : 'text-slate-500'}`} onClick={() => emissiveInputRef.current?.click()}>EMISSIVE</Button>
                      <Button variant="outline" className={`py-2 px-1 text-[9px] ${aoMap ? 'border-green-500 text-green-400' : 'text-slate-500'}`} onClick={() => aoInputRef.current?.click()}>OCCLUSION</Button>
                      <Button variant="outline" className={`py-2 px-1 text-[9px] ${normalMap ? 'border-purple-500 text-purple-400' : 'text-slate-500'}`} onClick={() => normalInputRef.current?.click()}>NORMAL</Button>
                      <input type="file" ref={diffuseInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setDiffuseMap)} />
                      <input type="file" ref={emissiveInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setEmissiveMap)} />
                      <input type="file" ref={aoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setAoMap)} />
                      <input type="file" ref={normalInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setNormalMap)} />
                    </div>
                  </div>

                  <hr className="border-slate-700/50" />

                  <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700 shadow-inner">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Gauge className="w-3 h-3 text-emerald-400" />
                      Print Profile
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Layer', value: MATERIAL_PRESETS[selectedMaterial].slicingTips.layerHeight, icon: <Layers className="w-4 h-4 text-emerald-400" /> },
                        { label: 'Infill', value: MATERIAL_PRESETS[selectedMaterial].slicingTips.infill, icon: <Box className="w-4 h-4 text-emerald-400" /> },
                        { label: 'Support', value: MATERIAL_PRESETS[selectedMaterial].slicingTips.supports, icon: <Wind className="w-4 h-4 text-emerald-400" /> }
                      ].map((tip, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            {tip.icon}
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-600 uppercase font-black">{tip.label}</p>
                            <p className="text-xs text-white font-mono">{tip.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 px-1">
                      <Palette className="w-3.5 h-3.5 text-indigo-400" /> Physical Base
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(MATERIAL_PRESETS).map(([key, mat]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedMaterial(key as MaterialPreset)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                            selectedMaterial === key 
                            ? 'bg-indigo-600/20 border-indigo-500 shadow-lg' 
                            : 'bg-slate-900 border-transparent hover:border-slate-700'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full border border-white/10" style={{ backgroundColor: mat.color }}></div>
                          <span className="text-[9px] font-black text-slate-400 uppercase text-center">{mat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0 shadow-2xl rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 relative group/scene">
                <NeuralScene 
                  primitives={modelData?.primitives || []} 
                  clipPlaneY={clipY} 
                  showClipping={showClipping} 
                  onClipChange={setClipY}
                  onClipToggle={setShowClipping}
                  material={currentMaterialProps} 
                  lightingPreset={lightingPreset}
                  customLight={customLight}
                  wireframe={wireframe}
                  referenceSheetUrl={refSheet?.imageUrl}
                  showBlueprints={showBlueprints}
                />
                
                <div className="absolute top-4 right-4 flex gap-2">
                  <div className="flex bg-slate-800/80 backdrop-blur-md rounded-xl p-1.5 border border-white/10 shadow-2xl">
                    <button className="p-2.5 hover:bg-white/10 rounded-lg disabled:opacity-30" onClick={handleUndo} disabled={historyIndex <= 0}>
                      <Undo className="w-4 h-4 text-white" />
                    </button>
                    <button className="p-2.5 hover:bg-white/10 rounded-lg disabled:opacity-30" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                      <Redo className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 flex gap-2 group-hover/scene:opacity-100 opacity-0 transition-opacity">
                   <div className="flex bg-slate-800/90 backdrop-blur-md rounded-2xl p-2 border border-white/10 shadow-2xl items-center gap-2">
                        {[
                          { id: 'STUDIO', icon: <Camera className="w-3.5 h-3.5" /> },
                          { id: 'DAYLIGHT', icon: <Sun className="w-3.5 h-3.5" /> },
                          { id: 'SPOTLIGHT', icon: <Target className="w-3.5 h-3.5" /> },
                          { id: 'CUSTOM', icon: <Settings className="w-3.5 h-3.5" /> },
                        ].map((light) => (
                          <button
                            key={light.id}
                            onClick={() => setLightingPreset(light.id as LightingPreset)}
                            className={`p-2.5 rounded-xl transition-all ${
                              lightingPreset === light.id 
                              ? 'bg-blue-600 text-white shadow-lg' 
                              : 'text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {light.icon}
                          </button>
                        ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  const SettingsModal = () => (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="px-8 py-6 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between sticky top-0 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-700 rounded-xl">
               <Settings className="w-5 h-5 text-blue-400" />
             </div>
             <h3 className="text-xl font-bold text-white tracking-tight">Advanced Pipeline Settings</h3>
          </div>
          <button onClick={() => setShowSettings(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 space-y-8">
          {/* Provider Selection */}
          <section>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ZapIcon className="w-3.5 h-3.5" /> Reference Provider
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => saveProvider('GEMINI')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${imageProvider === 'GEMINI' ? 'border-blue-500 bg-blue-500/10 text-white shadow-lg shadow-blue-500/10' : 'border-slate-800 bg-slate-950/40 text-slate-500 hover:border-slate-700'}`}
              >
                <div className={`p-2 rounded-xl ${imageProvider === 'GEMINI' ? 'bg-blue-600' : 'bg-slate-800'}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">Gemini Native</span>
              </button>
              <button 
                onClick={() => saveProvider('RUNWARE')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${imageProvider === 'RUNWARE' ? 'border-purple-500 bg-purple-500/10 text-white shadow-lg shadow-purple-500/10' : 'border-slate-800 bg-slate-950/40 text-slate-500 hover:border-slate-700'}`}
              >
                <div className={`p-2 rounded-xl ${imageProvider === 'RUNWARE' ? 'bg-purple-600' : 'bg-slate-800'}`}>
                  <ZapIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">Runware.ai</span>
              </button>
            </div>
          </section>

          {/* API Keys Configuration */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">API Configuration</h4>
            </div>
            
            <div className="space-y-4">
              {/* Google Gemini Key */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Custom Gemini API Key</label>
                <div className="relative">
                  <input 
                    type="password"
                    value={customGeminiKey}
                    onChange={(e) => saveCustomGeminiKey(e.target.value)}
                    placeholder="Auto-detected from environment (Default)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-10 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition-colors shadow-inner"
                  />
                  <div className="absolute left-3 top-3.5">
                    <Lock className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 mt-2 italic">
                  Leave empty to use the standard "Connect Google" button flow. Enter a key to override.
                </p>
              </div>

              {/* Runware Key - Only if provider selected */}
              {imageProvider === 'RUNWARE' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Runware API Key</label>
                    <a href="https://runware.ai/" target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline">Get Key</a>
                  </div>
                  <div className="relative">
                    <input 
                      type="password"
                      value={runwareKey}
                      onChange={(e) => saveRunwareKey(e.target.value)}
                      placeholder="Enter Runware.ai API Key..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-10 text-xs text-white placeholder-slate-600 outline-none focus:border-purple-500 transition-colors shadow-inner"
                    />
                    <div className="absolute left-3 top-3.5">
                      <ZapIcon className="w-4 h-4 text-slate-600" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Slicing Engine Note */}
          <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-2xl flex items-start gap-4">
            <Info className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-[10px] text-blue-300 leading-relaxed uppercase tracking-tight font-medium">
              Stage 2 (3D Reconstruction) always uses <span className="text-white font-black">Gemini 3 Pro</span>. Your Google Cloud API Key handles the spatial reasoning logic regardless of the image provider.
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end sticky bottom-0 backdrop-blur-md">
           <Button onClick={() => setShowSettings(false)} className="py-2.5 px-8">Save & Close</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-10 selection:bg-blue-500/30 overflow-x-hidden">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-transform">
            <Box className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">MakerFlow <span className="text-blue-500">3D</span></span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-700 backdrop-blur-md">
            <button 
              onClick={handleOpenKeyDialog}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                hasKey ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'bg-amber-600/10 text-amber-500 border border-amber-500/20'
              }`}
            >
              <Key className="w-3 h-3" />
              {hasKey 
                ? (customGeminiKey ? 'Custom Key Active' : 'Google Connected') 
                : 'Connect Google'
              }
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-1.5 text-slate-500 hover:text-white transition-colors"
              title="Advanced Pipeline Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {stage !== AppStage.PROMPT && (
            <div className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-full text-[10px] font-bold text-slate-400 flex items-center gap-2 backdrop-blur-md uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              Neural Link: Active
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto">
        {stage !== AppStage.PROMPT && (
          <div className="flex justify-center items-center gap-4 mb-12">
            <Step icon={<Zap />} active={false} completed={true} label="Concept" />
            <StepConnector active={true} />
            <Step icon={<FileCheck />} active={stage === AppStage.IMAGE_GEN} completed={stage !== AppStage.IMAGE_GEN} label="Blueprint" />
            <StepConnector active={stage !== AppStage.IMAGE_GEN} />
            <Step icon={<Layers />} active={[AppStage.SCULPTING, AppStage.PRINT_PREP].includes(stage)} label="Neural Clay" />
          </div>
        )}
        {renderStage()}
      </main>

      {showSettings && <SettingsModal />}

      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Cpu className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
          </div>
          <div className="text-center px-6">
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Neural Reconstruction...</h3>
            <p className="text-slate-400 max-w-xs mx-auto text-sm">Processing blueprint through high-precision spatial reasoning engine.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const Step = ({ icon, active, completed, label }: any) => (
  <div className="flex flex-col items-center gap-2 group">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${active ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-500/20 text-white scale-110' : completed ? 'bg-slate-800/50 border-emerald-600/30 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-blue-400' : 'text-slate-600'}`}>{label}</span>
  </div>
);

const StepConnector = ({ active }: any) => (
  <div className={`w-16 h-0.5 rounded-full transition-colors duration-500 ${active ? 'bg-blue-600/30' : 'bg-slate-800'}`} />
);

export default App;