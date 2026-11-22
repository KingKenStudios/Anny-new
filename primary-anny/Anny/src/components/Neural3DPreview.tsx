import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, AlertTriangle } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

interface Neural3DPreviewProps {
  url: string;
  title?: string;
  wireframe?: boolean;
  autoRotate?: boolean;
  rotationSpeed?: number;
  scaleFactor?: number;
  meshColor?: string;
  lightIntensity?: number;
  onModelLoaded?: (info: { nodeCount: number; meshNames: string[] }) => void;
}

export default function Neural3DPreview({
  url,
  title = "Neural 3D Synthesis",
  wireframe = false,
  autoRotate = true,
  rotationSpeed = 0.003,
  scaleFactor = 1.0,
  meshColor = '#06b6d4',
  lightIntensity = 1.2,
  onModelLoaded
}: Neural3DPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRigged, setIsRigged] = useState(false);
  const [hasSkeleton, setHasSkeleton] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);

  useEffect(() => {
    if (!url || !canvasRef.current || !containerRef.current) return;

    setIsLoading(true);
    setHasError(null);

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050811');

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 4);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, lightIntensity);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.5 * (lightIntensity / 1.2));
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xec4899, 1.5 * (lightIntensity / 1.2));
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x06b6d4, 2, 10);
    pointLight.position.set(0, 2, 2);
    scene.add(pointLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(10, 20, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;

    // Loaders
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const activeColorNum = parseInt(meshColor.replace('#', '0x'), 16) || 0x06b6d4;

    const createProceduralNeuralMesh = () => {
      const group = new THREE.Group();

      // Cybernetic wireframe core
      const sphereGeo = new THREE.IcosahedronGeometry(0.8, 2);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: activeColorNum,
        wireframe: wireframe,
        roughness: 0.2,
        metalness: 0.8
      });
      const coreMesh = new THREE.Mesh(sphereGeo, sphereMat);
      group.add(coreMesh);

      // Inner glowing nucleus
      const nucleusGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const nucleusMat = new THREE.MeshBasicMaterial({ color: activeColorNum });
      const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
      group.add(nucleusMesh);

      // Orbital rings
      const ringGeo = new THREE.TorusGeometry(1.2, 0.02, 16, 100);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3, wireframe: wireframe });
      
      const ring1 = new THREE.Mesh(ringGeo, ringMat);
      ring1.rotation.x = Math.PI / 3;
      group.add(ring1);

      const ring2 = new THREE.Mesh(ringGeo, ringMat);
      ring2.rotation.y = Math.PI / 4;
      group.add(ring2);

      group.position.y = 1;
      group.scale.setScalar(scaleFactor);

      if (isRigged) {
        for (let i = 0; i < 6; i++) {
          const jointGeo = new THREE.SphereGeometry(0.06, 8, 8);
          const jointMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
          const jointMesh = new THREE.Mesh(jointGeo, jointMat);
          const angle = (i / 6) * Math.PI * 2;
          jointMesh.position.set(Math.cos(angle) * 1.2, Math.sin(angle) * 1.2, 0);
          group.add(jointMesh);
        }
      }

      scene.add(group);
      if (onModelLoaded) {
        onModelLoaded({ nodeCount: 5, meshNames: ['CoreMesh', 'NucleusMesh', 'OrbitalRing1', 'OrbitalRing2', 'ProceduralJoints'] });
      }
      return group;
    };

    let animationFrameId: number;
    let loadedScene: THREE.Group | null = null;
    let skeletonHelper: THREE.SkeletonHelper | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let modelHasSkeleton = false;
    const clock = new THREE.Clock();

    if (url === 'procedural') {
      // Explicit placeholder/demo mode — the caller asked for this, so it's not misrepresenting a real result.
      loadedScene = createProceduralNeuralMesh();
      setIsLoading(false);
    } else {
      loader.load(
        url,
        (gltf) => {
          loadedScene = gltf.scene;

          const meshNames: string[] = [];
          let nodeCount = 0;

          loadedScene.traverse((child) => {
            nodeCount++;
            if (child.name) meshNames.push(child.name);
            if ((child as any).isSkinnedMesh) modelHasSkeleton = true;
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const mat = mesh.material as any;
              if (Array.isArray(mat)) {
                mat.forEach((m: any) => { if (m && 'wireframe' in m) m.wireframe = wireframe; });
              } else if (mat && 'wireframe' in mat) {
                mat.wireframe = wireframe;
              }
            }
          });

          // Auto-center & scale model
          const box = new THREE.Box3().setFromObject(loadedScene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = maxDim > 0 ? (2 / maxDim) * scaleFactor : scaleFactor;

          loadedScene.position.x = -center.x * scale;
          loadedScene.position.y = -center.y * scale + (size.y * scale) / 2;
          loadedScene.position.z = -center.z * scale;
          loadedScene.scale.setScalar(scale);

          scene.add(loadedScene);

          // Play back any real embedded animation clips (walk cycles, idle poses, etc.)
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(loadedScene);
            gltf.animations.forEach((clip) => mixer!.clipAction(clip).play());
          }

          setHasSkeleton(modelHasSkeleton);
          if (modelHasSkeleton && isRigged) {
            skeletonHelper = new THREE.SkeletonHelper(loadedScene);
            scene.add(skeletonHelper);
          }

          if (onModelLoaded) {
            onModelLoaded({ nodeCount, meshNames: meshNames.slice(0, 12) });
          }

          setIsLoading(false);
          setHasError(null);
        },
        undefined,
        (error) => {
          // Honest failure — do NOT substitute a fake mesh and pretend it succeeded.
          console.error('[Neural3DPreview] Failed to load 3D asset:', error);
          setIsLoading(false);
          setHasError(`Could not load the 3D model from the server. ${(error as any)?.message || ''}`.trim());
        }
      );
    }

    // Animation Loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      if (loadedScene && autoRotate) {
        loadedScene.rotation.y += rotationSpeed;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      dracoLoader.dispose();
      controls.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [url, isRigged, wireframe, autoRotate, rotationSpeed, scaleFactor, meshColor, lightIntensity]);

  if (!url) return null;

  return (
    <div ref={containerRef} className="w-full h-full bg-black/80 rounded-2xl border border-cyan-500/30 overflow-hidden relative group/3d shadow-2xl flex flex-col">
      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block flex-1" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm">
          <Activity className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest animate-pulse">Compiling 3D GLB Asset...</span>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 p-8 text-center bg-red-950/80 backdrop-blur-sm">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">Neural 3D Synthesis Error</p>
          <p className="text-[8px] font-mono text-red-500/60 break-all max-w-[240px] mt-1">{hasError}</p>
        </div>
      )}

      {/* Control Overlay */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-1">
          <h4 className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em] bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-cyan-500/30 font-bold">{title}</h4>
          <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest ml-1 font-semibold">GLB 3D Matrix Node</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {hasSkeleton && (
            <button 
              onClick={() => setIsRigged(!isRigged)}
              className={`px-3 py-1 rounded-full border text-[9px] font-mono uppercase tracking-widest transition-all font-bold ${isRigged ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-black/70 border-white/20 text-slate-300 hover:bg-white/10'}`}
            >
              <div className="flex items-center gap-1.5">
                <Zap className={`w-3 h-3 ${isRigged ? 'animate-pulse text-orange-400' : ''}`} />
                <span>{isRigged ? 'Skeleton Rig Active' : 'Show Rig'}</span>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex justify-center z-10 pointer-events-none">
        <div className="px-4 py-1.5 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full text-[9px] font-mono text-cyan-300 uppercase tracking-[0.2em] shadow-xl font-bold">
          Orbit Controls Enabled (Drag to rotate, Scroll to zoom)
        </div>
      </div>
    </div>
  );
}
