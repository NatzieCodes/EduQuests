import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HeroId } from '../game/rules';
import { buildStandingStudentModel } from '../game/models3d';

interface ProfileCharacter3DProps {
  gender: 'male' | 'female' | 'neutral';
  topHex: string;
  trimHex: string;
  pantsHex: string;
  shoeHex: string;
  accentHex: string;
  heroId: HeroId;
}

function parseHexColor(hex: string, fallback: number): number {
  const cleaned = hex.replace(/^#/, '').trim();
  const parsed = Number.parseInt(cleaned, 16);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const ProfileCharacter3D: React.FC<ProfileCharacter3DProps> = ({
  gender,
  topHex,
  trimHex,
  pantsHex,
  shoeHex,
  accentHex,
  heroId,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({
    gender,
    topHex,
    trimHex,
    pantsHex,
    shoeHex,
    accentHex,
    heroId,
  });

  useEffect(() => {
    propsRef.current = {
      gender,
      topHex,
      trimHex,
      pantsHex,
      shoeHex,
      accentHex,
      heroId,
    };
  }, [gender, topHex, trimHex, pantsHex, shoeHex, accentHex, heroId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 300;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // Ignore if PMREM fails
    }

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, 1.56, 4.95);
    camera.lookAt(0, 1.42, 0);

    // Studio 3-point lighting matching the lobby
    const hemiLight = new THREE.HemisphereLight(0xfff1f2, 0x451a03, 1.25);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.0);
    keyLight.position.set(4, 7, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    const stageHolder = new THREE.Group();
    scene.add(stageHolder);

    let lastSig = '';
    let activeRig: ReturnType<typeof buildStandingStudentModel> | null = null;

    function rebuildCharacterIfNeeded() {
      const cur = propsRef.current;
      const sig = `${cur.gender}|${cur.topHex}|${cur.trimHex}|${cur.pantsHex}|${cur.shoeHex}|${cur.accentHex}|${cur.heroId}`;
      if (sig === lastSig) return;
      lastSig = sig;

      stageHolder.clear();

      activeRig = buildStandingStudentModel({
        gender: cur.gender,
        topHex: parseHexColor(cur.topHex, 0x5c4033),
        trimHex: parseHexColor(cur.trimHex, 0x4a3228),
        pantsHex: parseHexColor(cur.pantsHex, 0x1e293b),
        shoeHex: parseHexColor(cur.shoeHex, 0xfacc15),
        accentHex: parseHexColor(cur.accentHex, 0xfacc15),
      });
      stageHolder.add(activeRig.root);
    }

    rebuildCharacterIfNeeded();

    // Drag-to-rotate support so the player can spin their 3D standing character
    let isDragging = false;
    let prevX = 0;
    let userYaw = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      prevX = e.clientX;
      userYaw += dx * 0.012;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 380;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();
    let elapsed = 0;
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      rebuildCharacterIfNeeded();

      if (activeRig) {
        // Gentle idle standing motion: breathing, subtle head turn/nod, arm sway, weight shift
        const breath = Math.sin(elapsed * 2.2);
        activeRig.upperBodyGroup.position.y = 1.12 + breath * 0.018;
        activeRig.studentHead.position.y = 2.42 + breath * 0.022;
        activeRig.studentHead.rotation.y = Math.sin(elapsed * 0.95) * 0.14;
        activeRig.studentHead.rotation.x = Math.sin(elapsed * 1.4) * 0.04;

        activeRig.leftArmGroup.rotation.z = Math.sin(elapsed * 1.8) * 0.045;
        activeRig.rightArmGroup.rotation.z = -Math.sin(elapsed * 1.8) * 0.045;
        activeRig.rightArmGroup.rotation.x = Math.sin(elapsed * 2.2) * 0.035;

        // Otter companion cheerful bobbing
        activeRig.otterMascot.position.y = 0.48 + Math.sin(elapsed * 2.7 + 0.7) * 0.035;
        activeRig.otterMascot.rotation.z = Math.sin(elapsed * 1.9) * 0.045;

        // Subtle turntable sway + user drag rotation
        stageHolder.rotation.y = userYaw + Math.sin(elapsed * 0.65) * 0.12;
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="profile-3d-character-canvas"
      className="w-full h-64 sm:h-72 cursor-grab active:cursor-grabbing select-none"
      title="3D Standing Character (Drag left/right to rotate)"
    />
  );
};
