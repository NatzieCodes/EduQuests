import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ClassmateMember, GameMode, GameShellState, HeroId } from '../game/rules';
import {
  buildEnemyModel,
  buildHeroModel,
  buildStudyRoomDiorama,
  disposeObject3D,
  EnemyRig,
  FlashMaterialEntry,
  HeroAppearance,
  HeroRig,
} from '../game/models3d';

export interface CombatVisualEvent {
  id: number;
  type: 'player_fast' | 'player_charged' | 'enemy_counter' | 'ally_strike';
  isCritical?: boolean;
  blockedByPlayer?: boolean;
}

interface ThreeStageProps {
  shellState: GameShellState;
  mode: GameMode;
  selectedHero: HeroId;
  appearance: HeroAppearance;
  onSelectHero?: (heroId: HeroId) => void;
  combatEvent: CombatVisualEvent | null;
  classmates?: ClassmateMember[];
  localPlayerId?: string;
  isShieldArmed?: boolean;
  battleOutcome?: 'victory' | 'defeat' | null;
}

// Centered Battle Duel Coordinates & Facing Angles
const PLAYER_BASE_POS = new THREE.Vector3(-1.15, 0, 1.35);
const ENEMY_BASE_POS = new THREE.Vector3(1.15, 0, -1.55);
const ALLY_LEFT_POS = new THREE.Vector3(-2.45, 0, -0.35);
const ALLY_RIGHT_POS = new THREE.Vector3(2.55, 0, 0.15);

const PLAYER_BASE_YAW = Math.atan2(
  ENEMY_BASE_POS.x - PLAYER_BASE_POS.x,
  ENEMY_BASE_POS.z - PLAYER_BASE_POS.z
);
const ENEMY_BASE_YAW = Math.atan2(
  PLAYER_BASE_POS.x - ENEMY_BASE_POS.x,
  PLAYER_BASE_POS.z - ENEMY_BASE_POS.z
);
const ALLY_LEFT_YAW = Math.atan2(
  ENEMY_BASE_POS.x - ALLY_LEFT_POS.x,
  ENEMY_BASE_POS.z - ALLY_LEFT_POS.z
);
const ALLY_RIGHT_YAW = Math.atan2(
  ENEMY_BASE_POS.x - ALLY_RIGHT_POS.x,
  ENEMY_BASE_POS.z - ALLY_RIGHT_POS.z
);

// Normalized battle axis vector from Player -> Enemy (XZ plane)
const BATTLE_DIR_X = (ENEMY_BASE_POS.x - PLAYER_BASE_POS.x) /
  Math.hypot(ENEMY_BASE_POS.x - PLAYER_BASE_POS.x, ENEMY_BASE_POS.z - PLAYER_BASE_POS.z);
const BATTLE_DIR_Z = (ENEMY_BASE_POS.z - PLAYER_BASE_POS.z) /
  Math.hypot(ENEMY_BASE_POS.x - PLAYER_BASE_POS.x, ENEMY_BASE_POS.z - PLAYER_BASE_POS.z);

// Pre-allocated scratch helpers outside the render loop (Zero GC)
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.48, 0);
const _projPos = new THREE.Vector3();
const _allyProjPos = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _flashColor = new THREE.Color();
const _whiteColor = new THREE.Color(0xffffff);
const _redColor = new THREE.Color(0xf43f5e);
const _goldColor = new THREE.Color(0xfacc15);
const _cyanColor = new THREE.Color(0x38bdf8);
const _magentaColor = new THREE.Color(0xe879f9);

const PARTICLE_COUNT = 40;

function applyFlashTint(entries: FlashMaterialEntry[], intensity: number, tintColor: THREE.Color) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if ('emissive' in entry.material && entry.material.emissive) {
      if (intensity > 0.01) {
        entry.material.emissive.copy(tintColor);
        entry.material.emissiveIntensity = entry.baseEmissiveIntensity + intensity * 1.45;
      } else {
        entry.material.emissive.setHex(entry.baseEmissiveHex);
        entry.material.emissiveIntensity = entry.baseEmissiveIntensity;
      }
    } else if (intensity > 0.01) {
      _flashColor.setHex(entry.baseColorHex).lerp(tintColor, Math.min(0.75, intensity));
      entry.material.color.copy(_flashColor);
    } else {
      entry.material.color.setHex(entry.baseColorHex);
    }
  }
}

export const ThreeStage: React.FC<ThreeStageProps> = ({
  shellState,
  mode,
  selectedHero,
  appearance,
  onSelectHero,
  combatEvent,
  classmates = [],
  localPlayerId = 'local-player',
  isShieldArmed = false,
  battleOutcome = null,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store mutable React props in refs so WebGLRenderer is initialized once and never torn down
  const stateRef = useRef({
    shellState,
    mode,
    selectedHero,
    appearance,
    onSelectHero,
    classmates,
    localPlayerId,
    isShieldArmed,
    battleOutcome,
  });

  useEffect(() => {
    stateRef.current = {
      shellState,
      mode,
      selectedHero,
      appearance,
      onSelectHero,
      classmates,
      localPlayerId,
      isShieldArmed,
      battleOutcome,
    };
  }, [
    shellState,
    mode,
    selectedHero,
    appearance,
    onSelectHero,
    classmates,
    localPlayerId,
    isShieldArmed,
    battleOutcome,
  ]);

  const combatEventRef = useRef<CombatVisualEvent | null>(null);
  useEffect(() => {
    if (combatEvent) {
      combatEventRef.current = combatEvent;
    }
  }, [combatEvent]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x93c5fd);
    scene.fog = new THREE.FogExp2(0xfbcfe8, 0.01);

    // 2. Studio Environment Map via RoomEnvironment + PMREMGenerator
    let envTexture: THREE.Texture | null = null;
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;
      pmremGenerator.dispose();
    } catch (e) {
      console.warn('PMREMGenerator skipped:', e);
    }

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 160);
    camera.position.set(0, 1.52, 4.15);
    camera.lookAt(0, 1.48, 0);

    // 3. Balanced Studio & Arena Lighting (Warm Key Light + Cool Hemisphere Fill + Rim)
    const hemiLight = new THREE.HemisphereLight(0xfff1f2, 0x451a03, 1.2);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.0);
    keyLight.position.set(6, 12, 8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -10;
      keyLight.shadow.camera.right = 10;
      keyLight.shadow.camera.top = 10;
      keyLight.shadow.camera.bottom = -10;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(-7, 6, -6);
    scene.add(rimLight);

    // =========================================================================
    // STAGE A: Cozy Study Room with Student & Joined Room Squad (Max 6 Players)
    // =========================================================================
    const lobbyGroup = new THREE.Group();
    scene.add(lobbyGroup);

    const studyRoom = buildStudyRoomDiorama();
    lobbyGroup.add(studyRoom.root);
    let activeLobbyAppearanceKey = '';
    function syncLobbyAppearance(currentAppearance: HeroAppearance) {
      const key = `${currentAppearance.gender}:${currentAppearance.outfitStyle}:${currentAppearance.accentColor}`;
      if (key === activeLobbyAppearanceKey) return;
      activeLobbyAppearanceKey = key;
      const outfitColors: Record<string, number> = {
        cozy: 0x5c4033,
        instinct: 0xfacc15,
        mystic: 0x2563eb,
        valor: 0xdc2626,
        scholar: 0x7c3aed,
      };
      const color = outfitColors[currentAppearance.outfitStyle];
      if (color) {
        studyRoom.studentTorso.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          const isOutfitMaterial = materials.some((material) => {
            if (!('color' in material)) return false;
            const hex = material.color.getHex();
            return hex === 0x5c4033 || hex === 0x4a3228;
          });
          if (!object.userData.customOutfit && isOutfitMaterial) {
            object.material = Array.isArray(object.material)
              ? object.material.map((material) => material.clone())
              : object.material.clone();
            object.userData.customOutfit = true;
          }
          if (object.userData.customOutfit) {
            const customized = Array.isArray(object.material) ? object.material : [object.material];
            customized.forEach((material) => {
              if ('color' in material) material.color.setHex(color);
            });
          }
        });
      }
      studyRoom.studentTorso.scale.x = currentAppearance.gender === 'female' ? 1.04 : 1;
    }
    syncLobbyAppearance(stateRef.current.appearance);

    // Squadmate slots standing beside the player in the lobby (up to 5 peers = 6 room limit)
    const lobbySquadGroup = new THREE.Group();
    lobbyGroup.add(lobbySquadGroup);

    const SQUAD_SLOTS: { x: number; y: number; z: number; rotY: number; scale: number }[] = [
      { x: -1.25, y: 0.22, z: -0.05, rotY: 0.22, scale: 0.72 },
      { x: 1.25, y: 0.22, z: -0.05, rotY: -0.22, scale: 0.72 },
      { x: -1.95, y: 0.22, z: -0.28, rotY: 0.32, scale: 0.68 },
      { x: 1.95, y: 0.22, z: -0.28, rotY: -0.32, scale: 0.68 },
      { x: -0.68, y: 0.22, z: -0.34, rotY: 0.14, scale: 0.68 },
    ];

    const squadRingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const squadDiscMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });

    let lastSquadSignature = '__init__';
    const squadModels: THREE.Group[] = [];

    function syncLobbySquad(members: ClassmateMember[], curLocalId: string) {
      const peers = members.filter((m) => m.id !== curLocalId && m.id !== 'local-player').slice(0, 5);
      const sig = peers.map((p) => `${p.id}:${p.heroId}`).join('|');
      if (sig === lastSquadSignature) return;
      lastSquadSignature = sig;

      squadModels.forEach((m) => disposeObject3D(m));
      lobbySquadGroup.clear();
      squadModels.length = 0;

      peers.forEach((peer, idx) => {
        const slot = SQUAD_SLOTS[idx];
        if (!slot) return;

        const slotHolder = new THREE.Group();
        slotHolder.position.set(slot.x, slot.y, slot.z);
        slotHolder.rotation.y = slot.rotY;

        const floorRing = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.38, 32), squadRingMat);
        floorRing.rotation.x = -Math.PI / 2;
        floorRing.position.y = 0.02;
        const floorDisc = new THREE.Mesh(new THREE.CircleGeometry(0.32, 28), squadDiscMat);
        floorDisc.rotation.x = -Math.PI / 2;
        floorDisc.position.y = 0.015;
        slotHolder.add(floorRing, floorDisc);

        const peerHero = buildHeroModel(peer.heroId);
        peerHero.scale.setScalar(slot.scale);
        slotHolder.add(peerHero);

        lobbySquadGroup.add(slotHolder);
        squadModels.push(peerHero);
      });
    }

    // =========================================================================
    // STAGE B: Centered Pokémon GO / Venge 3D Battle Arena
    // =========================================================================
    const arenaGroup = new THREE.Group();
    arenaGroup.visible = false;
    scene.add(arenaGroup);

    // 1. Extended Turf Ground Plane
    const turfMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.82,
      metalness: 0.05,
    });
    const turfDisc = new THREE.Mesh(new THREE.CircleGeometry(42, 48), turfMat);
    turfDisc.rotation.x = -Math.PI / 2;
    turfDisc.position.y = 0;
    turfDisc.receiveShadow = !isSoftwareGl;
    arenaGroup.add(turfDisc);

    // 2. Centered Battle Ring & Duel Pads Aligned with the Player<->Enemy Battle Axis
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const arenaCenterX = (PLAYER_BASE_POS.x + ENEMY_BASE_POS.x) * 0.5;
    const arenaCenterZ = (PLAYER_BASE_POS.z + ENEMY_BASE_POS.z) * 0.5;

    const markingsGroup = new THREE.Group();
    markingsGroup.position.set(arenaCenterX, 0, arenaCenterZ);
    markingsGroup.rotation.y = PLAYER_BASE_YAW;
    arenaGroup.add(markingsGroup);

    const outerRing = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.9, 48), lineMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.025;

    const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.6, 36), lineMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.028;

    const centerCircle = new THREE.Mesh(new THREE.CircleGeometry(0.65, 28), lineMat);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = 0.03;

    const midlineCross = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 0.2), lineMat);
    midlineCross.rotation.x = -Math.PI / 2;
    midlineCross.position.y = 0.026;

    markingsGroup.add(outerRing, innerRing, centerCircle, midlineCross);

    // Glowing Duel Pads directly under Player and Enemy
    const playerPadRing = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 0.96, 36),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    playerPadRing.rotation.x = -Math.PI / 2;
    playerPadRing.position.set(PLAYER_BASE_POS.x, 0.032, PLAYER_BASE_POS.z);
    arenaGroup.add(playerPadRing);

    const enemyPadRing = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.22, 36),
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    enemyPadRing.rotation.x = -Math.PI / 2;
    enemyPadRing.position.set(ENEMY_BASE_POS.x, 0.032, ENEMY_BASE_POS.z);
    arenaGroup.add(enemyPadRing);

    // 3. Raid Stadium Perimeter (Daylight Gym Bowl + Fluffy Clouds)
    const raidStadiumGroup = new THREE.Group();
    arenaGroup.add(raidStadiumGroup);

    const stadiumWallMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.5,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const stadiumTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.35,
      metalness: 0.4,
      side: THREE.DoubleSide,
    });
    const tierLower = new THREE.Mesh(
      new THREE.CylinderGeometry(18.5, 16.2, 3.2, 32, 1, true),
      stadiumWallMat
    );
    tierLower.position.y = 1.6;

    const tierRibbon = new THREE.Mesh(
      new THREE.CylinderGeometry(18.7, 18.6, 0.65, 32, 1, true),
      stadiumTrimMat
    );
    tierRibbon.position.y = 3.4;

    raidStadiumGroup.add(tierLower, tierRibbon);

    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 1.4 - Math.PI * 0.7 - Math.PI / 2;
      const cloudCluster = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.6 - j * 0.3, 10, 10), cloudMat);
        puff.position.set((j - 1) * 1.3, (j % 2) * 0.4, 0);
        cloudCluster.add(puff);
      }
      cloudCluster.position.set(Math.cos(angle) * 26, 9.5 + (i % 3) * 1.8, Math.sin(angle) * 26);
      cloudCluster.lookAt(0, 4, 0);
      raidStadiumGroup.add(cloudCluster);
    }

    // 4. Natural Outdoor Forest Clearing Perimeter (for PvP, Team Fight & Training)
    const forestPerimeterGroup = new THREE.Group();
    arenaGroup.add(forestPerimeterGroup);

    const treeCount = 28;
    const trunkInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.24, 0.36, 2.2, 7),
      new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.85 }),
      treeCount
    );
    const foliageInst = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1.45, 1),
      new THREE.MeshStandardMaterial({ color: 0x1e3a2f, roughness: 0.75 }),
      treeCount
    );

    const tintColor = new THREE.Color();
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius = 12.5 + (i % 3) * 2.4;
      const scale = 0.85 + (i % 4) * 0.14;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      _dummy.position.set(x, 1.1 * scale, z);
      _dummy.scale.setScalar(scale);
      _dummy.rotation.set(0, i * 0.7, 0);
      _dummy.updateMatrix();
      trunkInst.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(x, 2.9 * scale, z);
      _dummy.scale.set(scale * 1.1, scale * 1.35, scale * 1.1);
      _dummy.updateMatrix();
      foliageInst.setMatrixAt(i, _dummy.matrix);

      tintColor.setHSL(0.38 + (i % 3) * 0.03, 0.45, 0.22 + (i % 2) * 0.05);
      foliageInst.setColorAt(i, tintColor);
    }
    trunkInst.computeBoundingSphere();
    foliageInst.computeBoundingSphere();
    forestPerimeterGroup.add(trunkInst, foliageInst);

    // 5. Centered Dynamic Combat Actors
    const playerActorSlot = new THREE.Group();
    playerActorSlot.position.copy(PLAYER_BASE_POS);
    playerActorSlot.rotation.y = PLAYER_BASE_YAW;
    arenaGroup.add(playerActorSlot);

    const enemyActorSlot = new THREE.Group();
    enemyActorSlot.position.copy(ENEMY_BASE_POS);
    enemyActorSlot.rotation.y = ENEMY_BASE_YAW;
    arenaGroup.add(enemyActorSlot);

    // Allied Classmate Guardians flanking cleanly inside viewport for Raid & Team modes
    const alliesGroup = new THREE.Group();
    arenaGroup.add(alliesGroup);

    const allyLeft = buildHeroModel('arcane_scout');
    allyLeft.position.copy(ALLY_LEFT_POS);
    allyLeft.rotation.y = ALLY_LEFT_YAW;
    allyLeft.scale.setScalar(0.84);
    const allyLeftRig = (allyLeft.userData.heroRig as HeroRig | undefined) ?? null;

    const allyRight = buildHeroModel('aether_valkyrie');
    allyRight.position.copy(ALLY_RIGHT_POS);
    allyRight.rotation.y = ALLY_RIGHT_YAW;
    allyRight.scale.setScalar(0.84);
    const allyRightRig = (allyRight.userData.heroRig as HeroRig | undefined) ?? null;

    alliesGroup.add(allyLeft, allyRight);

    // 6. Multi-Stage Projectiles, Shockwave Rings & Charge Aura VFX (Pre-allocated, Zero GC)
    const projectileGroup = new THREE.Group();
    projectileGroup.visible = false;
    const projectileMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });
    const projectileCore = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 14), projectileMat);
    const projectileRingMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const projectileHalo = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.04, 8, 24), projectileRingMat);
    projectileGroup.add(projectileCore, projectileHalo);
    arenaGroup.add(projectileGroup);

    const allyProjectileMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.0,
      roughness: 0.15,
    });
    const allyProjectileOrb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), allyProjectileMat);
    allyProjectileOrb.visible = false;
    arenaGroup.add(allyProjectileOrb);

    const shockwaveMat1 = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shockwaveRing1 = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.62, 32), shockwaveMat1);
    shockwaveRing1.visible = false;
    arenaGroup.add(shockwaveRing1);

    const shockwaveMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shockwaveRing2 = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.55, 32), shockwaveMat2);
    shockwaveRing2.rotation.x = -Math.PI / 2;
    shockwaveRing2.visible = false;
    arenaGroup.add(shockwaveRing2);

    const chargeAuraMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const chargeAuraRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.05, 36), chargeAuraMat);
    chargeAuraRing.rotation.x = -Math.PI / 2;
    chargeAuraRing.position.set(PLAYER_BASE_POS.x, 0.05, PLAYER_BASE_POS.z);
    chargeAuraRing.visible = false;
    arenaGroup.add(chargeAuraRing);

    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.14, 0),
      particleMat,
      PARTICLE_COUNT
    );
    particleInst.frustumCulled = false;
    arenaGroup.add(particleInst);

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      active: false,
      x: 0,
      y: -10,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0.45,
      scale: 1,
    }));

    function spawnParticleBurst(
      originX: number,
      originY: number,
      originZ: number,
      count: number,
      isHeavy: boolean,
      color: THREE.Color
    ) {
      let spawned = 0;
      for (let i = 0; i < PARTICLE_COUNT && spawned < count; i++) {
        const p = particles[i];
        if (!p.active) {
          p.active = true;
          p.x = originX;
          p.y = originY;
          p.z = originZ;
          const angle = Math.random() * Math.PI * 2;
          const speed = (isHeavy ? 4.8 : 2.8) + Math.random() * 3.4;
          p.vx = Math.cos(angle) * speed;
          p.vy = 1.6 + Math.random() * (isHeavy ? 4.2 : 2.8);
          p.vz = Math.sin(angle) * speed;
          p.maxLife = isHeavy ? 0.58 : 0.38;
          p.life = p.maxLife;
          p.scale = isHeavy ? 1.45 : 0.95;
          particleInst.setColorAt(i, color);
          spawned++;
        }
      }
      if (particleInst.instanceColor) {
        particleInst.instanceColor.needsUpdate = true;
      }
    }

    // Track loaded actor models so we rebuild cleanly only when hero/mode changes
    let activePlayerHeroId: HeroId | null = null;
    let activePlayerAppearanceKey = '';
    let activeEnemyMode: GameMode | null = null;
    let playerModelGroup: THREE.Group | null = null;
    let enemyModelGroup: THREE.Group | null = null;
    let playerRig: HeroRig | null = null;
    let enemyRig: EnemyRig | null = null;

    function syncArenaActors(heroId: HeroId, currentMode: GameMode, currentAppearance: HeroAppearance) {
      const appearanceKey = `${currentAppearance.gender}:${currentAppearance.outfitStyle}:${currentAppearance.accentColor}`;
      if (activePlayerHeroId !== heroId || activePlayerAppearanceKey !== appearanceKey) {
        activePlayerHeroId = heroId;
        activePlayerAppearanceKey = appearanceKey;
        if (playerModelGroup) disposeObject3D(playerModelGroup);
        playerActorSlot.clear();
        playerModelGroup = buildHeroModel(heroId, currentAppearance);
        playerRig = (playerModelGroup.userData.heroRig as HeroRig | undefined) ?? null;
        playerActorSlot.add(playerModelGroup);
      }

      if (activeEnemyMode !== currentMode) {
        activeEnemyMode = currentMode;
        if (enemyModelGroup) disposeObject3D(enemyModelGroup);
        enemyActorSlot.clear();
        enemyModelGroup = buildEnemyModel(currentMode);
        enemyRig = (enemyModelGroup.userData.enemyRig as EnemyRig | undefined) ?? null;
        enemyActorSlot.add(enemyModelGroup);
      }

      alliesGroup.visible = currentMode === 'raid' || currentMode === 'team';
      raidStadiumGroup.visible = currentMode === 'raid';
      forestPerimeterGroup.visible = currentMode !== 'raid';

      if (currentMode === 'raid') {
        scene.background = new THREE.Color(0x7dd3fc);
        scene.fog = new THREE.FogExp2(0xbae6fd, 0.008);
        turfMat.color.setHex(0x2e8b57);
        hemiLight.color.setHex(0xe0f2fe);
        hemiLight.groundColor.setHex(0x15803d);
        keyLight.intensity = 2.05;
      } else if (currentMode === 'training') {
        scene.background = new THREE.Color(0x93c5fd);
        scene.fog = new THREE.FogExp2(0xfde68a, 0.009);
        turfMat.color.setHex(0x2f855a);
        hemiLight.color.setHex(0xfffbeb);
        hemiLight.groundColor.setHex(0x3f2e21);
        keyLight.intensity = 1.95;
      } else {
        scene.background = new THREE.Color(0x60a5fa);
        scene.fog = new THREE.FogExp2(0xbfdbfe, 0.009);
        turfMat.color.setHex(0x2e7d32);
        hemiLight.color.setHex(0xe0f2fe);
        hemiLight.groundColor.setHex(0x166534);
        keyLight.intensity = 1.95;
      }
    }

    syncArenaActors(stateRef.current.selectedHero, stateRef.current.mode, stateRef.current.appearance);

    if (!isSoftwareGl) {
      try {
        renderer.compile(scene, camera);
      } catch (e) {
        console.warn('Renderer compile skipped:', e);
      }
    }

    // Resize listener
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', handleResize);

    // Combat animation state variables (zero per-frame allocations)
    let lastEventId = 0;
    let animProgress = 0;
    let activeAnimType: CombatVisualEvent['type'] | null = null;
    let activeIsCritical = false;
    let activeBlockedByPlayer = false;
    let impactTriggered = false;
    let hitstopTimer = 0;
    let trauma = 0;
    let enemyFlashTimer = 0;
    let playerFlashTimer = 0;
    let enemyRecoil = 0;
    let playerRecoil = 0;
    let shieldBlockFlashTimer = 0;
    let shockwaveProgress = 0;
    let allyStrikeOverlayTimer = 0;

    // Second-order spring physics state for Dojo Training Dummy
    let dummySpringAngle = 0;
    let dummySpringVel = 0;
    let dummySpinAngle = 0;
    let dummySpinVel = 0;

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
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const {
        shellState: curShell,
        mode: curMode,
        selectedHero: curHero,
        classmates: curClassmates,
        localPlayerId: curLocalId,
        isShieldArmed: curShieldArmed,
        battleOutcome: curOutcome,
      } = stateRef.current;

      if (curShell === 'title') {
        syncLobbyAppearance(stateRef.current.appearance);
        lobbyGroup.visible = true;
        arenaGroup.visible = false;
        activeAnimType = null;
        animProgress = 0;
        projectileGroup.visible = false;
        allyProjectileOrb.visible = false;
        shockwaveRing1.visible = false;
        shockwaveRing2.visible = false;
        chargeAuraRing.visible = false;
        scene.background = new THREE.Color(0x93c5fd);
        scene.fog = new THREE.FogExp2(0xfbcfe8, 0.01);
        hemiLight.color.setHex(0xfff1f2);
        hemiLight.groundColor.setHex(0x451a03);
        keyLight.intensity = 1.9;

        syncLobbySquad(curClassmates, curLocalId);

        elapsed += dt;
        _camTargetPos.set(0, 1.52, 4.15);
        _camLookTarget.set(0, 1.48, 0);
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-6 * dt));
        _currentLook.lerp(_camLookTarget, 1 - Math.exp(-6 * dt));
        camera.lookAt(_currentLook);

        // Animate studying student breathing & reading head tilt + otter + sunflowers + clouds
        studyRoom.studentTorso.position.y = Math.sin(elapsed * 2.1) * 0.015;
        studyRoom.studentHead.position.y = 1.54 + Math.sin(elapsed * 2.1) * 0.018;
        studyRoom.studentHead.rotation.x = 0.06 + Math.sin(elapsed * 1.3) * 0.04;
        studyRoom.studentHead.rotation.y = Math.sin(elapsed * 0.85) * 0.08;

        studyRoom.otterMascot.position.y = 1.05 + Math.sin(elapsed * 2.6 + 0.8) * 0.045;
        studyRoom.otterMascot.rotation.z = Math.sin(elapsed * 1.9) * 0.04;
        studyRoom.cloudsGroup.position.x = Math.sin(elapsed * 0.25) * 0.18;
        studyRoom.sunflowerGroup.rotation.z = Math.sin(elapsed * 1.2) * 0.025;

        for (let i = 0; i < squadModels.length; i++) {
          const rig = squadModels[i].userData.heroRig as HeroRig | undefined;
          if (rig) {
            rig.torsoPivot.position.y = 0.88 + Math.sin(elapsed * 2.5 + i * 1.1) * 0.02;
            rig.headPivot.rotation.y = Math.sin(elapsed * 1.1 + i) * 0.1;
            rig.rightArmPivot.rotation.x = rig.baseRightArmRot.x + Math.sin(elapsed * 2.2 + i) * 0.08;
          } else {
            squadModels[i].position.y = Math.sin(elapsed * 2.5 + i * 1.1) * 0.025;
          }
        }
      } else {
        // =====================================================================
        // BATTLE ARENA MODE
        // =====================================================================
        lobbyGroup.visible = false;
        arenaGroup.visible = true;
        syncArenaActors(curHero, curMode, stateRef.current.appearance);

        // Check for new combat visual trigger
        if (combatEventRef.current && combatEventRef.current.id !== lastEventId) {
          lastEventId = combatEventRef.current.id;
          activeAnimType = combatEventRef.current.type;
          activeIsCritical = Boolean(combatEventRef.current.isCritical);
          activeBlockedByPlayer = Boolean(combatEventRef.current.blockedByPlayer);
          animProgress = 0.001;
          impactTriggered = false;
          projectileGroup.visible = false;
          allyProjectileOrb.visible = false;
          chargeAuraRing.visible = false;
          if (activeAnimType === 'player_charged' && (curMode === 'raid' || curMode === 'team')) {
            allyStrikeOverlayTimer = 0.65;
          }
        }

        // Hitstop & clock progression
        if (hitstopTimer > 0) {
          hitstopTimer = Math.max(0, hitstopTimer - dt);
        } else if (curShell === 'playing' || curShell === 'gameover') {
          elapsed += dt;
        }

        const simDt = hitstopTimer > 0 ? 0 : dt;

        // Default target joint offsets for this frame (blended smoothly via damp)
        let playerLungeDist = 0;
        let playerArcY = 0;
        let playerBodyPitch = 0;
        let playerTorsoTwist = 0;
        let playerRightArmX = playerRig ? playerRig.baseRightArmRot.x : 0;
        let playerRightArmZ = playerRig ? playerRig.baseRightArmRot.z : 0;
        let playerLeftArmX = playerRig ? playerRig.baseLeftArmRot.x : 0;
        let playerLeftArmZ = playerRig ? playerRig.baseLeftArmRot.z : 0;
        let playerLegStride = 0;

        let enemyLungeDist = 0;
        let enemyArcY = 0;
        let enemyBodyPitch = 0;
        let enemyNeckPitch = 0;
        let enemyTrainerArmRaise = 0;

        let camBiasX = 0;
        let camBiasY = 0;
        let camBiasZ = 0;
        let lookBiasX = 0;
        let lookBiasY = 0;

        // Subtle idle combat stances
        const breath = Math.sin(elapsed * 2.8);
        const fastPulse = Math.sin(elapsed * 5.2);

        if (curShell === 'gameover' && curOutcome) {
          if (curOutcome === 'victory') {
            playerArcY = Math.abs(Math.sin(elapsed * 3.8)) * 0.22;
            playerRightArmX = -2.45;
            playerLeftArmX = -0.5;
            enemyBodyPitch = 0.22;
            enemyNeckPitch = 0.35;
          } else {
            playerBodyPitch = 0.28;
            playerArcY = -0.14;
            playerRightArmX = 0.3;
            playerLeftArmX = 0.3;
            enemyArcY = Math.abs(Math.sin(elapsed * 2.6)) * 0.1;
          }
        } else {
          // Active battle guard pose
          playerBodyPitch = 0.05 + breath * 0.015;
          playerTorsoTwist = -0.12 + breath * 0.04;
          playerRightArmX -= 0.28 + breath * 0.06;
          playerLeftArmX -= curShieldArmed ? 1.05 : 0.22 - breath * 0.05;
          playerLeftArmZ += curShieldArmed ? 0.55 : 0;
        }

        // Advance multi-phase combat animation
        if (activeAnimType && animProgress > 0) {
          const duration =
            activeAnimType === 'player_charged'
              ? 1.02
              : activeAnimType === 'enemy_counter'
              ? 0.72
              : activeAnimType === 'ally_strike'
              ? 0.62
              : 0.64;

          animProgress += simDt / duration;
          const t = Math.min(1, animProgress);

          if (activeAnimType === 'player_fast') {
            const impactT = 0.56;
            if (t < 0.24) {
              // Phase 1: Wind-up anticipation
              const w = t / 0.24;
              playerLungeDist = -0.18 * w;
              playerArcY = -0.06 * w;
              playerTorsoTwist = -0.65 * w;
              playerRightArmX = -0.55 + 1.15 * w;
              playerRightArmZ = -0.55 * w;
              playerLegStride = -0.35 * w;
              projectileGroup.visible = false;
            } else if (t < impactT) {
              // Phase 2: Forward dash lunge + arm whip + streaking orb
              const s = (t - 0.24) / (impactT - 0.24);
              const easeOut = 1 - Math.pow(1 - s, 2.2);
              playerLungeDist = THREE.MathUtils.lerp(-0.18, 0.92, easeOut);
              playerArcY = Math.sin(s * Math.PI) * 0.18;
              playerBodyPitch = 0.22 * easeOut;
              playerTorsoTwist = THREE.MathUtils.lerp(-0.65, 0.72, easeOut);
              playerRightArmX = THREE.MathUtils.lerp(0.6, -1.75, easeOut);
              playerLeftArmX = 0.45 * easeOut;
              playerLegStride = 0.55 * easeOut;

              projectileGroup.visible = true;
              projectileMat.color.copy(_cyanColor);
              projectileMat.emissive.setHex(0x0ea5e9);
              projectileRingMat.color.copy(_goldColor);
              _projPos.set(
                THREE.MathUtils.lerp(PLAYER_BASE_POS.x + 0.35, ENEMY_BASE_POS.x, s),
                THREE.MathUtils.lerp(1.45, curMode === 'raid' ? 1.85 : 1.35, s) + Math.sin(s * Math.PI) * 0.48,
                THREE.MathUtils.lerp(PLAYER_BASE_POS.z - 0.35, ENEMY_BASE_POS.z, s)
              );
              projectileGroup.position.copy(_projPos);
              projectileGroup.scale.setScalar(activeIsCritical ? 1.25 : 0.95);
              projectileHalo.rotation.x = elapsed * 10;
              projectileHalo.rotation.y = elapsed * 8;
            } else {
              // Phase 3: Impact + Follow-through recovery
              if (!impactTriggered) {
                impactTriggered = true;
                projectileGroup.visible = false;
                hitstopTimer = activeIsCritical ? 0.07 : 0.048;
                trauma = activeIsCritical ? 0.56 : 0.38;
                enemyFlashTimer = 0.22;
                enemyRecoil = activeIsCritical ? 1.0 : 0.78;
                shockwaveProgress = 0.001;
                shockwaveRing1.position.set(
                  ENEMY_BASE_POS.x,
                  curMode === 'raid' ? 1.75 : 1.25,
                  ENEMY_BASE_POS.z + 0.2
                );
                shockwaveRing1.rotation.y = ENEMY_BASE_YAW;
                shockwaveRing2.position.set(ENEMY_BASE_POS.x, 0.06, ENEMY_BASE_POS.z);
                shockwaveMat1.color.copy(activeIsCritical ? _goldColor : _cyanColor);
                shockwaveMat2.color.copy(_cyanColor);
                dummySpringVel += activeIsCritical ? 15 : 11;
                dummySpinVel += (Math.random() > 0.5 ? 1 : -1) * 9;
                spawnParticleBurst(
                  ENEMY_BASE_POS.x,
                  curMode === 'raid' ? 1.8 : 1.3,
                  ENEMY_BASE_POS.z,
                  22,
                  activeIsCritical,
                  activeIsCritical ? _goldColor : _cyanColor
                );
              }
              const r = (t - impactT) / (1 - impactT);
              const recover = 1 - Math.pow(r, 1.6);
              playerLungeDist = 0.92 * recover;
              playerBodyPitch = 0.22 * recover;
              playerTorsoTwist = 0.72 * recover;
              playerRightArmX = -1.75 * recover;
              playerLegStride = 0.55 * recover;
            }
          } else if (activeAnimType === 'player_charged') {
            const impactT = 0.64;
            if (t < 0.32) {
              // Phase 1: Power-up crouch + ground charge ring + dramatic camera push-in
              const c = t / 0.32;
              playerArcY = -0.14 * c;
              playerBodyPitch = -0.1 * c;
              playerRightArmX = -2.35 * c;
              playerLeftArmX = -2.1 * c;
              chargeAuraRing.visible = true;
              chargeAuraRing.scale.setScalar(0.75 + Math.sin(c * Math.PI) * 0.65);
              chargeAuraMat.opacity = 0.85 * Math.sin(c * Math.PI);
              projectileGroup.visible = true;
              projectileMat.color.copy(_goldColor);
              projectileMat.emissive.setHex(0xf59e0b);
              projectileRingMat.color.copy(_whiteColor);
              projectileGroup.position.set(
                PLAYER_BASE_POS.x + BATTLE_DIR_X * 0.25,
                2.45 - 0.1 * c,
                PLAYER_BASE_POS.z + BATTLE_DIR_Z * 0.25
              );
              projectileGroup.scale.setScalar(0.45 + c * 1.15);
              projectileHalo.rotation.x = elapsed * 14;
              projectileHalo.rotation.y = elapsed * 12;

              camBiasX = -0.35 * c;
              camBiasY = -0.18 * c;
              camBiasZ = -0.85 * c;
              lookBiasY = 0.12 * c;
            } else if (t < impactT) {
              // Phase 2: Leaping charged strike + giant plasma orb
              chargeAuraRing.visible = false;
              const s = (t - 0.32) / (impactT - 0.32);
              const ease = 1 - Math.pow(1 - s, 2.0);
              playerLungeDist = 1.22 * ease;
              playerArcY = Math.sin(s * Math.PI) * 0.55;
              playerBodyPitch = 0.28 * ease;
              playerTorsoTwist = 0.82 * ease;
              playerRightArmX = THREE.MathUtils.lerp(-2.35, -1.55, ease);
              playerLeftArmX = THREE.MathUtils.lerp(-2.1, 0.45, ease);
              playerLegStride = 0.65 * ease;

              projectileGroup.visible = true;
              _projPos.set(
                THREE.MathUtils.lerp(PLAYER_BASE_POS.x + 0.3, ENEMY_BASE_POS.x, s),
                THREE.MathUtils.lerp(2.1, curMode === 'raid' ? 1.85 : 1.35, s) + Math.sin(s * Math.PI) * 0.45,
                THREE.MathUtils.lerp(PLAYER_BASE_POS.z - 0.3, ENEMY_BASE_POS.z, s)
              );
              projectileGroup.position.copy(_projPos);
              projectileGroup.scale.setScalar(1.75 + Math.sin(s * Math.PI) * 0.35);
              projectileHalo.rotation.x = elapsed * 16;
              projectileHalo.rotation.y = elapsed * 14;

              camBiasX = THREE.MathUtils.lerp(-0.35, 0.35, ease);
              camBiasY = -0.12;
              camBiasZ = THREE.MathUtils.lerp(-0.85, -0.45, ease);
              lookBiasX = 0.3 * ease;
              lookBiasY = 0.15;
            } else {
              if (!impactTriggered) {
                impactTriggered = true;
                projectileGroup.visible = false;
                chargeAuraRing.visible = false;
                hitstopTimer = 0.085;
                trauma = 0.78;
                enemyFlashTimer = 0.28;
                enemyRecoil = 1.25;
                shockwaveProgress = 0.001;
                shockwaveRing1.position.set(
                  ENEMY_BASE_POS.x,
                  curMode === 'raid' ? 1.75 : 1.25,
                  ENEMY_BASE_POS.z + 0.25
                );
                shockwaveRing1.rotation.y = ENEMY_BASE_YAW;
                shockwaveRing2.position.set(ENEMY_BASE_POS.x, 0.06, ENEMY_BASE_POS.z);
                shockwaveMat1.color.copy(_goldColor);
                shockwaveMat2.color.copy(_goldColor);
                dummySpringVel += 22;
                dummySpinVel += 14;
                spawnParticleBurst(
                  ENEMY_BASE_POS.x,
                  curMode === 'raid' ? 1.85 : 1.35,
                  ENEMY_BASE_POS.z,
                  32,
                  true,
                  _goldColor
                );
              }
              const r = (t - impactT) / (1 - impactT);
              const recover = 1 - Math.pow(r, 1.5);
              playerLungeDist = 1.22 * recover;
              playerBodyPitch = 0.28 * recover;
              playerTorsoTwist = 0.82 * recover;
              playerRightArmX = -1.55 * recover;
              playerLegStride = 0.65 * recover;
              camBiasX = 0.35 * recover;
              camBiasZ = -0.45 * recover;
            }
          } else if (activeAnimType === 'enemy_counter') {
            const impactT = 0.6;
            if (t < 0.28) {
              // Phase 1: Enemy telegraph wind-up & Rival Trainer command
              const w = t / 0.28;
              enemyLungeDist = -0.22 * w;
              enemyBodyPitch = -0.24 * w;
              enemyNeckPitch = -0.28 * w;
              enemyTrainerArmRaise = -2.1 * w;
              if (activeBlockedByPlayer) {
                playerLeftArmX = -1.35 * w;
                playerLeftArmZ = 0.85 * w;
                playerRightArmX = -1.2 * w;
                playerRightArmZ = -0.65 * w;
              }
              projectileGroup.visible = false;
            } else if (t < impactT) {
              // Phase 2: Enemy pounce lunge + crimson blast toward player
              const s = (t - 0.28) / (impactT - 0.28);
              const ease = 1 - Math.pow(1 - s, 2);
              enemyLungeDist = THREE.MathUtils.lerp(-0.22, 0.85, ease);
              enemyArcY = Math.sin(s * Math.PI) * 0.25;
              enemyBodyPitch = 0.18 * ease;
              enemyNeckPitch = 0.22 * ease;
              enemyTrainerArmRaise = THREE.MathUtils.lerp(-2.1, -1.2, ease);

              projectileGroup.visible = true;
              projectileMat.color.copy(_redColor);
              projectileMat.emissive.setHex(0xe11d48);
              projectileRingMat.color.copy(_redColor);
              _projPos.set(
                THREE.MathUtils.lerp(ENEMY_BASE_POS.x, PLAYER_BASE_POS.x, s),
                THREE.MathUtils.lerp(curMode === 'raid' ? 1.85 : 1.3, 1.25, s) + Math.sin(s * Math.PI) * 0.42,
                THREE.MathUtils.lerp(ENEMY_BASE_POS.z, PLAYER_BASE_POS.z, s)
              );
              projectileGroup.position.copy(_projPos);
              projectileGroup.scale.setScalar(1.15);
              projectileHalo.rotation.x = elapsed * 12;
              projectileHalo.rotation.z = elapsed * 10;

              if (activeBlockedByPlayer) {
                playerLeftArmX = -1.35;
                playerLeftArmZ = 0.85;
                playerRightArmX = -1.2;
                playerRightArmZ = -0.65;
              }
            } else {
              if (!impactTriggered) {
                impactTriggered = true;
                projectileGroup.visible = false;
                if (activeBlockedByPlayer) {
                  hitstopTimer = 0.04;
                  trauma = 0.22;
                  shieldBlockFlashTimer = 0.48;
                  playerRecoil = 0.28;
                  shockwaveProgress = 0.001;
                  shockwaveRing1.position.set(PLAYER_BASE_POS.x, 1.2, PLAYER_BASE_POS.z - 0.2);
                  shockwaveRing1.rotation.y = PLAYER_BASE_YAW;
                  shockwaveRing2.position.set(PLAYER_BASE_POS.x, 0.06, PLAYER_BASE_POS.z);
                  shockwaveMat1.color.copy(_magentaColor);
                  shockwaveMat2.color.copy(_magentaColor);
                  spawnParticleBurst(
                    PLAYER_BASE_POS.x,
                    1.3,
                    PLAYER_BASE_POS.z,
                    18,
                    false,
                    _magentaColor
                  );
                } else {
                  hitstopTimer = 0.055;
                  trauma = 0.52;
                  playerFlashTimer = 0.22;
                  playerRecoil = 0.85;
                  spawnParticleBurst(
                    PLAYER_BASE_POS.x,
                    1.2,
                    PLAYER_BASE_POS.z,
                    16,
                    false,
                    _redColor
                  );
                }
              }
              const r = (t - impactT) / (1 - impactT);
              const recover = 1 - Math.pow(r, 1.5);
              enemyLungeDist = 0.85 * recover;
              enemyBodyPitch = 0.18 * recover;
              enemyTrainerArmRaise = -1.2 * recover;
            }
          } else if (activeAnimType === 'ally_strike') {
            const impactT = 0.58;
            if (t < impactT) {
              const s = t / impactT;
              allyProjectileOrb.visible = true;
              const startX = (Math.floor(lastEventId) % 2 === 0 ? ALLY_LEFT_POS.x : ALLY_RIGHT_POS.x);
              const startZ = (Math.floor(lastEventId) % 2 === 0 ? ALLY_LEFT_POS.z : ALLY_RIGHT_POS.z);
              _allyProjPos.set(
                THREE.MathUtils.lerp(startX, ENEMY_BASE_POS.x, s),
                THREE.MathUtils.lerp(1.3, curMode === 'raid' ? 1.8 : 1.3, s) + Math.sin(s * Math.PI) * 0.5,
                THREE.MathUtils.lerp(startZ, ENEMY_BASE_POS.z, s)
              );
              allyProjectileOrb.position.copy(_allyProjPos);
            } else {
              if (!impactTriggered) {
                impactTriggered = true;
                allyProjectileOrb.visible = false;
                trauma = Math.max(trauma, 0.25);
                enemyFlashTimer = 0.16;
                enemyRecoil = 0.55;
                spawnParticleBurst(
                  ENEMY_BASE_POS.x,
                  curMode === 'raid' ? 1.7 : 1.25,
                  ENEMY_BASE_POS.z,
                  14,
                  false,
                  _cyanColor
                );
              }
            }
          }

          if (animProgress >= 1.0) {
            activeAnimType = null;
            animProgress = 0;
            projectileGroup.visible = false;
            allyProjectileOrb.visible = false;
            chargeAuraRing.visible = false;
          }
        }

        // Decay hit reactions & shield dome flashes
        enemyFlashTimer = Math.max(0, enemyFlashTimer - dt);
        playerFlashTimer = Math.max(0, playerFlashTimer - dt);
        enemyRecoil = THREE.MathUtils.damp(enemyRecoil, 0, 10, dt);
        playerRecoil = THREE.MathUtils.damp(playerRecoil, 0, 10, dt);
        shieldBlockFlashTimer = Math.max(0, shieldBlockFlashTimer - dt);
        allyStrikeOverlayTimer = Math.max(0, allyStrikeOverlayTimer - dt);

        // Update expanding impact shockwave rings
        if (shockwaveProgress > 0) {
          shockwaveProgress += dt * 3.1;
          const sw = Math.min(1, shockwaveProgress);
          shockwaveRing1.visible = true;
          shockwaveRing2.visible = true;
          const ringScale = 0.6 + sw * 2.4;
          shockwaveRing1.scale.setScalar(ringScale);
          shockwaveRing2.scale.setScalar(0.8 + sw * 2.1);
          shockwaveMat1.opacity = (1 - sw) * 0.85;
          shockwaveMat2.opacity = (1 - sw) * 0.6;
          if (shockwaveProgress >= 1) {
            shockwaveProgress = 0;
            shockwaveRing1.visible = false;
            shockwaveRing2.visible = false;
          }
        }

        // Second-order damped spring physics for Training Dummy
        if (curMode === 'training') {
          if (enemyRecoil > 0.2 && Math.abs(dummySpringVel) < 2) {
            dummySpringVel += enemyRecoil * 6;
          }
          const force = -140 * dummySpringAngle - 8.5 * dummySpringVel;
          dummySpringVel += force * dt;
          dummySpringAngle += dummySpringVel * dt;

          const spinForce = -45 * dummySpinAngle - 6 * dummySpinVel;
          dummySpinVel += spinForce * dt;
          dummySpinAngle += dummySpinVel * dt;
        }

        // Apply world slot positions (base + lunge - recoil along battle axis)
        const netPlayerMove = playerLungeDist - playerRecoil * 0.36;
        playerActorSlot.position.set(
          PLAYER_BASE_POS.x + BATTLE_DIR_X * netPlayerMove,
          playerArcY,
          PLAYER_BASE_POS.z + BATTLE_DIR_Z * netPlayerMove
        );
        playerActorSlot.rotation.y = PLAYER_BASE_YAW;

        const netEnemyMove = -enemyLungeDist + enemyRecoil * 0.38;
        enemyActorSlot.position.set(
          ENEMY_BASE_POS.x + BATTLE_DIR_X * netEnemyMove,
          enemyArcY,
          ENEMY_BASE_POS.z + BATTLE_DIR_Z * netEnemyMove
        );
        enemyActorSlot.rotation.y = ENEMY_BASE_YAW;

        // Apply articulated Hero Rig joints smoothly
        if (playerRig) {
          const dampSpeed = 18;
          playerRig.bodyPivot.rotation.x = THREE.MathUtils.damp(
            playerRig.bodyPivot.rotation.x,
            playerBodyPitch - playerRecoil * 0.38,
            dampSpeed,
            dt
          );
          playerRig.torsoPivot.rotation.y = THREE.MathUtils.damp(
            playerRig.torsoPivot.rotation.y,
            playerTorsoTwist,
            dampSpeed,
            dt
          );
          playerRig.headPivot.rotation.x = THREE.MathUtils.damp(
            playerRig.headPivot.rotation.x,
            -playerBodyPitch * 0.45 + breath * 0.03,
            dampSpeed,
            dt
          );
          playerRig.rightArmPivot.rotation.x = THREE.MathUtils.damp(
            playerRig.rightArmPivot.rotation.x,
            playerRightArmX,
            dampSpeed,
            dt
          );
          playerRig.rightArmPivot.rotation.z = THREE.MathUtils.damp(
            playerRig.rightArmPivot.rotation.z,
            playerRightArmZ,
            dampSpeed,
            dt
          );
          playerRig.leftArmPivot.rotation.x = THREE.MathUtils.damp(
            playerRig.leftArmPivot.rotation.x,
            playerLeftArmX,
            dampSpeed,
            dt
          );
          playerRig.leftArmPivot.rotation.z = THREE.MathUtils.damp(
            playerRig.leftArmPivot.rotation.z,
            playerLeftArmZ,
            dampSpeed,
            dt
          );
          playerRig.leftLegPivot.rotation.x = THREE.MathUtils.damp(
            playerRig.leftLegPivot.rotation.x,
            playerLegStride,
            dampSpeed,
            dt
          );
          playerRig.rightLegPivot.rotation.x = THREE.MathUtils.damp(
            playerRig.rightLegPivot.rotation.x,
            -playerLegStride * 0.85,
            dampSpeed,
            dt
          );

          // Shield Ring & Dome visualization (armed vs active deflection flash)
          const ringMat = playerRig.shieldRing.material as THREE.MeshBasicMaterial;
          const domeMat = playerRig.shieldDome.material as THREE.MeshBasicMaterial;
          if (shieldBlockFlashTimer > 0) {
            const flashRatio = shieldBlockFlashTimer / 0.48;
            playerRig.shieldDome.visible = true;
            playerRig.shieldDome.rotation.y += dt * 4.5;
            playerRig.shieldDome.scale.setScalar(1 + (1 - flashRatio) * 0.18);
            domeMat.opacity = flashRatio * 0.65;
            ringMat.opacity = 0.9;
            playerRig.shieldRing.scale.setScalar(1.18);
          } else if (curShieldArmed) {
            playerRig.shieldDome.visible = true;
            playerRig.shieldDome.rotation.y += dt * 1.4;
            playerRig.shieldDome.scale.setScalar(1 + Math.sin(elapsed * 5) * 0.03);
            domeMat.opacity = 0.22;
            ringMat.opacity = 0.65 + Math.sin(elapsed * 6) * 0.15;
            playerRig.shieldRing.scale.setScalar(1.04);
          } else {
            playerRig.shieldDome.visible = false;
            domeMat.opacity = 0;
            ringMat.opacity = 0;
          }

          applyFlashTint(
            playerRig.flashMaterials,
            playerFlashTimer > 0 ? playerFlashTimer / 0.22 : 0,
            _redColor
          );
        }

        // Apply articulated Enemy Rig joints smoothly
        if (enemyRig) {
          if (enemyRig.mode === 'training' && enemyRig.springPivot) {
            enemyRig.springPivot.rotation.x = -dummySpringAngle;
            enemyRig.springPivot.rotation.y = dummySpinAngle;
            enemyRig.springPivot.rotation.z = Math.sin(elapsed * 2.4) * 0.02 + dummySpringAngle * 0.18;
          } else {
            const recoilPitch = enemyRecoil * 0.26;
            enemyRig.bodyPivot.rotation.x = THREE.MathUtils.damp(
              enemyRig.bodyPivot.rotation.x,
              enemyBodyPitch - recoilPitch,
              15,
              dt
            );
            enemyRig.torsoPivot.position.y =
              (enemyRig.mode === 'raid' ? 1.75 : 0.88) + Math.sin(elapsed * 2.7 + 0.6) * 0.035;
            enemyRig.neckPivot.rotation.x = THREE.MathUtils.damp(
              enemyRig.neckPivot.rotation.x,
              enemyNeckPitch + Math.sin(elapsed * 2.7) * 0.05 - recoilPitch * 0.6,
              14,
              dt
            );
            enemyRig.headPivot.rotation.y = Math.sin(elapsed * 1.3) * 0.08;
            if (enemyRig.scarfPivot) {
              enemyRig.scarfPivot.rotation.y = Math.sin(elapsed * 4.5) * 0.18;
              enemyRig.scarfPivot.rotation.x = Math.cos(elapsed * 3.8) * 0.1;
            }
            if (enemyRig.chestCore) {
              const corePulse = 1 + Math.sin(elapsed * 4.5) * 0.12 + (activeAnimType === 'enemy_counter' ? 0.35 : 0);
              enemyRig.chestCore.scale.setScalar(corePulse);
              enemyRig.chestCore.rotation.y += dt * 2.2;
            }
            // Quadruped leg stomp/gallop motion during attack or idle breath
            for (let i = 0; i < enemyRig.legPivots.length; i++) {
              const phase = i < 2 ? 1 : -1;
              const targetLegRot =
                activeAnimType === 'enemy_counter'
                  ? phase * 0.35 * Math.sin(Math.min(1, animProgress) * Math.PI)
                  : phase * Math.sin(elapsed * 2.7) * 0.04;
              enemyRig.legPivots[i].rotation.x = THREE.MathUtils.damp(
                enemyRig.legPivots[i].rotation.x,
                targetLegRot,
                14,
                dt
              );
            }
            if (enemyRig.trainerRightArmPivot && enemyRig.trainerHeadPivot) {
              enemyRig.trainerRightArmPivot.rotation.x = THREE.MathUtils.damp(
                enemyRig.trainerRightArmPivot.rotation.x,
                enemyTrainerArmRaise + Math.sin(elapsed * 2.4) * 0.06,
                14,
                dt
              );
              enemyRig.trainerHeadPivot.rotation.y = Math.sin(elapsed * 1.1) * 0.1;
            }
          }

          applyFlashTint(
            enemyRig.flashMaterials,
            enemyFlashTimer > 0 ? enemyFlashTimer / 0.22 : 0,
            _whiteColor
          );
        }

        // Flanking Allies idle & assist animation
        const allyAssistWave =
          activeAnimType === 'ally_strike' || allyStrikeOverlayTimer > 0
            ? Math.sin(Math.min(1, activeAnimType === 'ally_strike' ? animProgress : 1 - allyStrikeOverlayTimer / 0.65) * Math.PI)
            : 0;
        if (allyLeftRig) {
          allyLeftRig.torsoPivot.position.y = 0.88 + breath * 0.025;
          allyLeftRig.rightArmPivot.rotation.x = allyLeftRig.baseRightArmRot.x - 0.25 - allyAssistWave * 1.35;
          allyLeft.position.z = ALLY_LEFT_POS.z - allyAssistWave * 0.35;
        }
        if (allyRightRig) {
          allyRightRig.torsoPivot.position.y = 0.88 + fastPulse * 0.02;
          allyRightRig.rightArmPivot.rotation.x = allyRightRig.baseRightArmRot.x - 0.25 - allyAssistWave * 1.35;
          allyRight.position.z = ALLY_RIGHT_POS.z - allyAssistWave * 0.35;
        }

        // Pulse floor duel pads subtly
        playerPadRing.scale.setScalar(1 + Math.sin(elapsed * 3.0) * 0.03);
        enemyPadRing.scale.setScalar(1 + Math.cos(elapsed * 3.0) * 0.03);

        // Update pooled particles in-place
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const p = particles[i];
          if (p.active) {
            p.life -= dt;
            if (p.life <= 0) {
              p.active = false;
              _dummy.position.set(0, -20, 0);
              _dummy.scale.setScalar(0.001);
            } else {
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.z += p.vz * dt;
              p.vy -= 9.8 * dt;
              const s = (p.life / p.maxLife) * p.scale;
              _dummy.position.set(p.x, Math.max(0.05, p.y), p.z);
              _dummy.scale.setScalar(s);
              _dummy.rotation.set(p.life * 6, p.life * 8, 0);
            }
          } else {
            _dummy.position.set(0, -20, 0);
            _dummy.scale.setScalar(0.001);
          }
          _dummy.updateMatrix();
          particleInst.setMatrixAt(i, _dummy.matrix);
        }
        particleInst.instanceMatrix.needsUpdate = true;

        // Centered Over-the-Shoulder Duel Camera Framing (Player & Enemy both cleanly above Quiz Dock)
        _camTargetPos.set(-0.45 + camBiasX, 2.1 + camBiasY, 7.65 + camBiasZ);
        _camLookTarget.set(0.12 + lookBiasX, 0.15 + lookBiasY, -0.75);

        camera.position.lerp(_camTargetPos, 1 - Math.exp(-6 * dt));
        _currentLook.lerp(_camLookTarget, 1 - Math.exp(-7 * dt));

        // Decaying trauma * trauma camera shake
        if (trauma > 0) {
          const shake = trauma * trauma * 0.28;
          camera.position.x += (Math.random() - 0.5) * shake;
          camera.position.y += (Math.random() - 0.5) * shake;
          trauma = Math.max(0, trauma - dt * 1.9);
        }

        camera.lookAt(_currentLook);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      if (playerModelGroup) disposeObject3D(playerModelGroup);
      if (enemyModelGroup) disposeObject3D(enemyModelGroup);
      disposeObject3D(allyLeft);
      disposeObject3D(allyRight);
      squadModels.forEach((m) => disposeObject3D(m));
      disposeObject3D(studyRoom.root);
      if (envTexture) envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="three-stage-canvas"
      className="fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none"
    />
  );
};
