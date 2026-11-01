import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { ClassmateMember, GameMode, GameShellState, HEROES, HeroId } from '../game/rules';
import { buildEnemyModel, buildHeroModel, buildStudyRoomDiorama } from '../game/models3d';

export interface CombatVisualEvent {
  id: number;
  type: 'player_fast' | 'player_charged' | 'enemy_counter' | 'ally_strike';
  isCritical?: boolean;
}

interface ThreeStageProps {
  shellState: GameShellState;
  mode: GameMode;
  selectedHero: HeroId;
  onSelectHero?: (heroId: HeroId) => void;
  combatEvent: CombatVisualEvent | null;
  classmates?: ClassmateMember[];
  localPlayerId?: string;
  isJoinedInRoom?: boolean;
}

// Pre-allocated scratch helpers outside the render loop (Zero GC)
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.48, 0);
const _projPos = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

const PARTICLE_COUNT = 32;

export const ThreeStage: React.FC<ThreeStageProps> = ({
  shellState,
  mode,
  selectedHero,
  onSelectHero,
  combatEvent,
  classmates = [],
  localPlayerId = 'local-player',
  isJoinedInRoom = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store mutable React props in refs so WebGLRenderer is initialized once and never torn down
  const stateRef = useRef({
    shellState,
    mode,
    selectedHero,
    onSelectHero,
    classmates,
    localPlayerId,
    isJoinedInRoom,
  });

  useEffect(() => {
    stateRef.current = {
      shellState,
      mode,
      selectedHero,
      onSelectHero,
      classmates,
      localPlayerId,
      isJoinedInRoom,
    };
  }, [shellState, mode, selectedHero, onSelectHero, classmates, localPlayerId, isJoinedInRoom]);

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
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.FogExp2(0x7dd3fc, 0.014);

    // 2. Studio Environment Map via RoomEnvironment + PMREMGenerator
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch (e) {
      console.warn('PMREMGenerator skipped:', e);
    }

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 160);
    camera.position.set(0, 1.52, 4.15);
    camera.lookAt(0, 1.48, 0);

    // 3. Balanced Studio & Arena Lighting (Warm Key Light + Cool Hemisphere Fill)
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x15803d, 1.15);
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

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-7, 6, -6);
    scene.add(rimLight);

    // =========================================================================
    // STAGE A: Cozy Study Room with Student & Joined Room Squad (Max 6 Players)
    // =========================================================================
    const lobbyGroup = new THREE.Group();
    scene.add(lobbyGroup);

    const studyRoom = buildStudyRoomDiorama();
    lobbyGroup.add(studyRoom.root);
    studyRoom.root.visible = false;

    const lobbyRoomGroup = new THREE.Group();
    lobbyGroup.add(lobbyRoomGroup);

    const lobbySofaGroup = new THREE.Group();
    lobbySofaGroup.position.set(0, 0, -0.75);
    lobbyGroup.add(lobbySofaGroup);
    lobbySofaGroup.visible = false;

    const sofaWoodMaterial = new THREE.MeshStandardMaterial({
      color: 0x3f241b,
      roughness: 0.68,
      metalness: 0.08,
    });
    const sofaFabricMaterial = new THREE.MeshStandardMaterial({
      color: 0x671d1d,
      roughness: 0.82,
      metalness: 0.02,
    });
    const sofaTrimMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b3a30,
      roughness: 0.7,
      metalness: 0.04,
    });

    const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.72, 1.25), sofaFabricMaterial);
    sofaSeat.position.set(0, 0.58, 0.05);
    sofaSeat.castShadow = true;
    sofaSeat.receiveShadow = true;
    lobbySofaGroup.add(sofaSeat);

    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.38, 0.32), sofaFabricMaterial);
    sofaBack.position.set(0, 1.42, -0.58);
    sofaBack.castShadow = true;
    lobbySofaGroup.add(sofaBack);

    [-2.55, 2.55].forEach((x) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.06, 1.35), sofaTrimMaterial);
      arm.position.set(x, 0.86, 0.02);
      arm.castShadow = true;
      lobbySofaGroup.add(arm);
    });

    [-1.72, -0.86, 0, 0.86, 1.72].forEach((x) => {
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.16, 1.16), sofaTrimMaterial);
      cushion.position.set(x, 0.98, 0.08);
      cushion.rotation.x = -0.04;
      lobbySofaGroup.add(cushion);
    });

    [-2.38, 2.38].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18), sofaWoodMaterial);
      leg.position.set(x, 0.21, 0.42);
      lobbySofaGroup.add(leg);
    });

    const lobbyLoader = new FBXLoader();
    lobbyLoader.setResourcePath(`${import.meta.env.BASE_URL}assets/gryffindor-room/textures/`);
    lobbyLoader.load(
      `${import.meta.env.BASE_URL}assets/gryffindor-room/source/GryffindorRoom.fbx`,
      (roomObject) => {
        lobbyRoomGroup.clear();
        roomObject.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = !isSoftwareGl;
          child.receiveShadow = !isSoftwareGl;
          if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhongMaterial) {
            child.material.side = THREE.DoubleSide;
          }
        });

        const roomBox = new THREE.Box3().setFromObject(roomObject);
        const roomSize = roomBox.getSize(new THREE.Vector3());
        const maxDimension = Math.max(roomSize.x, roomSize.y, roomSize.z);
        const roomScale = maxDimension > 0 ? 12 / maxDimension : 1;
        roomObject.scale.setScalar(roomScale);
        roomObject.updateMatrixWorld(true);

        const scaledBox = new THREE.Box3().setFromObject(roomObject);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        roomObject.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);
        lobbyRoomGroup.add(roomObject);
      },
      undefined,
      (error) => console.warn('Gryffindor room model could not be loaded:', error)
    );

    // Squadmate slots standing beside the player in the lobby (up to 5 peers = 6 room limit)
    const lobbySquadGroup = new THREE.Group();
    lobbyGroup.add(lobbySquadGroup);

    const SOFA_PEER_SLOTS: { x: number; y: number; z: number; scale: number }[] = [
      { x: -0.86, y: 0.42, z: -0.58, scale: 0.48 },
      { x: 0.86, y: 0.42, z: -0.58, scale: 0.48 },
      { x: 1.72, y: 0.42, z: -0.58, scale: 0.48 },
    ];
    const STANDING_PEER_SLOTS: { x: number; y: number; z: number; scale: number }[] = [
      { x: -2.25, y: 0.05, z: 0.65, scale: 0.64 },
      { x: 2.25, y: 0.05, z: 0.65, scale: 0.64 },
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
    const lobbyLocalGroup = new THREE.Group();
    lobbySofaGroup.add(lobbyLocalGroup);
    const lobbySoloCharacterGroup = new THREE.Group();
    lobbyGroup.add(lobbySoloCharacterGroup);

    function syncLobbySquad(members: ClassmateMember[], curLocalId: string, localHeroId: HeroId, joined: boolean) {
      lobbySofaGroup.visible = joined;
      // Filter peers besides the local player, capped at 5 peers (total 6 in room)
      const peers = members.filter((m) => m.id !== curLocalId && m.id !== 'local-player').slice(0, 5);
      const sig = `${joined}:${localHeroId}|${peers.map((p) => `${p.id}:${p.heroId}`).join('|')}`;
      if (sig === lastSquadSignature) return;
      lastSquadSignature = sig;

      lobbySquadGroup.clear();
      squadModels.length = 0;
      lobbyLocalGroup.clear();
      lobbySoloCharacterGroup.clear();

      if (joined) {
        const localCharacter = buildHeroModel(localHeroId);
        localCharacter.scale.setScalar(0.52);
        localCharacter.position.set(-1.72, 0.44, -0.58);
        localCharacter.rotation.y = 0;
        lobbyLocalGroup.add(localCharacter);
        squadModels.push(localCharacter);
      } else {
        const soloCharacter = buildHeroModel(localHeroId);
        soloCharacter.scale.setScalar(0.48);
        soloCharacter.position.set(-0.82, 0.42, 1.18);
        soloCharacter.rotation.y = 0;
        lobbySoloCharacterGroup.add(soloCharacter);
        squadModels.push(soloCharacter);
      }

      peers.forEach((peer, idx) => {
        const slotHolder = new THREE.Group();
        const seated = idx < SOFA_PEER_SLOTS.length;
        const slot = seated ? SOFA_PEER_SLOTS[idx] : STANDING_PEER_SLOTS[idx - SOFA_PEER_SLOTS.length];
        if (!slot) return;
        slotHolder.position.set(slot.x, slot.y, slot.z);
        slotHolder.rotation.y = 0;

        const peerHero = buildHeroModel(peer.heroId);
        peerHero.scale.setScalar(slot.scale);
        peerHero.rotation.y = 0;
        slotHolder.add(peerHero);

        lobbySquadGroup.add(slotHolder);
        squadModels.push(peerHero);
      });
    }

    // =========================================================================
    // STAGE B: Transparent Blue Wizard Academy Battle Arena
    // =========================================================================
    const arenaGroup = new THREE.Group();
    arenaGroup.visible = false;
    scene.add(arenaGroup);

    // 1. Turf Ground Plane (stacked Y offsets >= 0.02 to prevent Z-fighting)
    const turfMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.82,
      metalness: 0.05,
      transparent: true,
      opacity: 0.72,
    });
    const turfDisc = new THREE.Mesh(new THREE.CircleGeometry(36, 48), turfMat);
    turfDisc.rotation.x = -Math.PI / 2;
    turfDisc.position.y = 0;
    turfDisc.receiveShadow = !isSoftwareGl;
    arenaGroup.add(turfDisc);

    // 2. Blue translucent wizard arena ring markings
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.88,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const outerRing = new THREE.Mesh(new THREE.RingGeometry(5.6, 5.95, 48), lineMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.025;

    const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.75, 2.08, 36), lineMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.028;

    const centerCircle = new THREE.Mesh(new THREE.CircleGeometry(0.95, 28), lineMat);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = 0.03;

    const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 0.28), lineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.026;

    const frontLaneL = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 3.8), lineMat);
    frontLaneL.rotation.x = -Math.PI / 2;
    frontLaneL.position.set(-0.65, 0.027, 3.7);

    const frontLaneR = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 3.8), lineMat);
    frontLaneR.rotation.x = -Math.PI / 2;
    frontLaneR.position.set(0.65, 0.027, 3.7);

    arenaGroup.add(outerRing, innerRing, centerCircle, centerLine, frontLaneL, frontLaneR);

    // 3. Raid Stadium Perimeter (Daylight Gym Bowl + Fluffy Clouds for Reference Picture 1)
    const raidStadiumGroup = new THREE.Group();
    arenaGroup.add(raidStadiumGroup);

    const stadiumWallMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5, metalness: 0.2 });
    const stadiumTrimMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.4 });
    const tierLower = new THREE.Mesh(
      new THREE.CylinderGeometry(17.5, 15.5, 3.2, 32, 1, true),
      stadiumWallMat
    );
    tierLower.material.side = THREE.DoubleSide;
    tierLower.position.y = 1.6;

    const tierRibbon = new THREE.Mesh(
      new THREE.CylinderGeometry(17.7, 17.6, 0.65, 32, 1, true),
      stadiumTrimMat
    );
    tierRibbon.material.side = THREE.DoubleSide;
    tierRibbon.position.y = 3.4;

    raidStadiumGroup.add(tierLower, tierRibbon);

    // Procedural Sky Clouds for Raid Stadium
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 1.4 - Math.PI * 0.7 - Math.PI / 2;
      const cloudCluster = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.6 - j * 0.3, 10, 10), cloudMat);
        puff.position.set((j - 1) * 1.3, (j % 2) * 0.4, 0);
        cloudCluster.add(puff);
      }
      cloudCluster.position.set(Math.cos(angle) * 26, 9 + (i % 3) * 1.8, Math.sin(angle) * 26);
      cloudCluster.lookAt(0, 4, 0);
      raidStadiumGroup.add(cloudCluster);
    }

    // 4. Natural Outdoor Forest Clearing Perimeter (for PvP, Team Fight & Training - Reference Picture 2)
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

    // 5. Dynamic Combat Actors (Player on Left, Enemy/Boss on Right, Allied Classmates Flanking)
    const playerActorSlot = new THREE.Group();
    // Positioned in the left foreground facing the right/midground guardian
    playerActorSlot.position.set(-1.95, 0, 2.15);
    playerActorSlot.rotation.y = Math.PI * 0.76;
    arenaGroup.add(playerActorSlot);

    const enemyActorSlot = new THREE.Group();
    enemyActorSlot.position.set(1.15, 0, -1.25);
    enemyActorSlot.rotation.y = -Math.PI * 0.2;
    arenaGroup.add(enemyActorSlot);

    // Allied Classmate Guardians flanking in Raid & Team modes (Reference Picture 1!)
    const alliesGroup = new THREE.Group();
    arenaGroup.add(alliesGroup);

    const allyLeft = buildHeroModel('arcane_scout');
    allyLeft.position.set(-4.1, 0, 0.35);
    allyLeft.rotation.y = Math.PI * 0.65;
    allyLeft.scale.setScalar(0.88);

    const allyRight = buildHeroModel('aether_valkyrie');
    allyRight.position.set(3.85, 0, 0.65);
    allyRight.rotation.y = -Math.PI * 0.55;
    allyRight.scale.setScalar(0.88);

    alliesGroup.add(allyLeft, allyRight);

    // Energy Projectile & Zero-GC Pooled Particle Ring Buffer
    const projectileOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 14, 14),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 2.2,
        roughness: 0.1,
      })
    );
    projectileOrb.visible = false;
    arenaGroup.add(projectileOrb);

    const particleInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.14, 0),
      new THREE.MeshBasicMaterial({ color: 0xfef08a }),
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

    function spawnParticleBurst(originX: number, originY: number, originZ: number, count: number, isHeavy: boolean) {
      let spawned = 0;
      for (let i = 0; i < PARTICLE_COUNT && spawned < count; i++) {
        const p = particles[i];
        if (!p.active) {
          p.active = true;
          p.x = originX;
          p.y = originY;
          p.z = originZ;
          const angle = Math.random() * Math.PI * 2;
          const speed = (isHeavy ? 4.5 : 2.6) + Math.random() * 3.2;
          p.vx = Math.cos(angle) * speed;
          p.vy = 1.8 + Math.random() * 3.5;
          p.vz = Math.sin(angle) * speed;
          p.maxLife = isHeavy ? 0.55 : 0.35;
          p.life = p.maxLife;
          p.scale = isHeavy ? 1.45 : 0.95;
          spawned++;
        }
      }
    }

    // Track loaded actor models so we rebuild only when hero/mode changes
    let activePlayerHeroId: HeroId | null = null;
    let activeEnemyMode: GameMode | null = null;
    let playerModelGroup: THREE.Group | null = null;
    let enemyModelGroup: THREE.Group | null = null;

    function syncArenaActors(heroId: HeroId, currentMode: GameMode) {
      if (activePlayerHeroId !== heroId) {
        activePlayerHeroId = heroId;
        playerActorSlot.clear();
        playerModelGroup = buildHeroModel(heroId);
        playerActorSlot.add(playerModelGroup);
      }

      if (activeEnemyMode !== currentMode) {
        activeEnemyMode = currentMode;
        enemyActorSlot.clear();
        enemyModelGroup = buildEnemyModel(currentMode);
        enemyActorSlot.add(enemyModelGroup);
      }

      alliesGroup.visible = currentMode === 'raid' || currentMode === 'team';
      raidStadiumGroup.visible = false;
      forestPerimeterGroup.visible = false;

      // Keep the cozy study room background and pastel sunset sky consistent across all battle modes
      studyRoom.root.visible = true;
      scene.background = new THREE.Color(0x93c5fd);
      scene.fog = new THREE.FogExp2(0xfbcfe8, 0.009);
      turfMat.color.setHex(0x2e8b57);
      hemiLight.color.setHex(0xfff1f2);
      hemiLight.groundColor.setHex(0x451a03);
      keyLight.intensity = 1.9;
    }

    syncArenaActors(stateRef.current.selectedHero, stateRef.current.mode);

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

    // Combat animation state variables
    let lastEventId = 0;
    let animProgress = 0;
    let activeAnimType: CombatVisualEvent['type'] | null = null;
    let hitstopTimer = 0;
    let trauma = 0;
    let targetFlashTimer = 0;

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
        isJoinedInRoom: curJoinedInRoom,
      } = stateRef.current;

      if (curShell === 'title') {
        lobbyGroup.visible = true;
        arenaGroup.visible = false;
        activeAnimType = null;
        animProgress = 0;
        projectileOrb.visible = false;
        scene.background = new THREE.Color(0x07111f);
        scene.fog = new THREE.FogExp2(0x07111f, 0.018);
        hemiLight.color.setHex(0xfff1f2);
        hemiLight.groundColor.setHex(0x451a03);
        keyLight.intensity = 1.9;

        syncLobbySquad(curClassmates, curLocalId, curHero, curJoinedInRoom);

        elapsed += dt;
        if (curJoinedInRoom) {
          _camTargetPos.set(0, 3.15, 8.6);
          _camLookTarget.set(0, 1.25, -0.45);
        } else {
          _camTargetPos.set(0, 1.52, 4.15);
          _camLookTarget.set(0, 1.48, 0);
        }
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-6 * dt));
        _currentLook.lerp(_camLookTarget, 1 - Math.exp(-6 * dt));
        camera.lookAt(_currentLook);

        // Animate studying student breathing & reading head tilt + otter mascot bobbing
        studyRoom.studentTorso.position.y = Math.sin(elapsed * 2.1) * 0.015;
        studyRoom.studentHead.position.y = 1.54 + Math.sin(elapsed * 2.1) * 0.018;
        studyRoom.studentHead.rotation.x = 0.06 + Math.sin(elapsed * 1.3) * 0.04;
        studyRoom.studentHead.rotation.y = Math.sin(elapsed * 0.85) * 0.08;

        studyRoom.otterMascot.position.y = 1.05 + Math.sin(elapsed * 2.6 + 0.8) * 0.045;
        studyRoom.otterMascot.rotation.z = Math.sin(elapsed * 1.9) * 0.04;
        studyRoom.cloudsGroup.position.x = Math.sin(elapsed * 0.25) * 0.18;

        // Animate joined room classmates standing beside you in the lobby
        for (let i = 0; i < squadModels.length; i++) {
          squadModels[i].position.y = Math.sin(elapsed * 2.5 + i * 1.1) * 0.025;
        }
      } else {
        // Battle Arena Mode
        lobbyGroup.visible = false;
        arenaGroup.visible = true;
        syncArenaActors(curHero, curMode);

        // Check for new combat visual trigger
        if (combatEventRef.current && combatEventRef.current.id !== lastEventId) {
          lastEventId = combatEventRef.current.id;
          activeAnimType = combatEventRef.current.type;
          animProgress = 0.001;
          projectileOrb.visible = true;
        }

        // Hitstop & camera trauma decay
        if (hitstopTimer > 0) {
          hitstopTimer = Math.max(0, hitstopTimer - dt);
        } else if (curShell === 'playing') {
          elapsed += dt;
        }

        const simDt = hitstopTimer > 0 ? 0 : dt;

        // Idle bobbing on player, allies, and enemy
        if (playerModelGroup) {
          playerModelGroup.position.y = Math.sin(elapsed * 3.1) * 0.05;
        }
        if (enemyModelGroup) {
          enemyModelGroup.position.y = Math.sin(elapsed * 2.4 + 1.2) * 0.06;
        }
        allyLeft.position.y = Math.sin(elapsed * 2.8 + 0.5) * 0.04;
        allyRight.position.y = Math.sin(elapsed * 2.9 + 2.0) * 0.04;

        // Advance active attack animation
        if (activeAnimType && animProgress > 0) {
          const speed = activeAnimType === 'player_charged' ? 1.45 : 2.4;
          animProgress += simDt * speed;

          if (activeAnimType === 'player_fast' || activeAnimType === 'player_charged') {
            const t = Math.min(1, animProgress);
            // Lunge player forward in first half
            const lunge = Math.sin(t * Math.PI) * 0.65;
            playerActorSlot.position.set(-1.95 + lunge * 0.6, 0, 2.15 - lunge * 0.6);

            // Projectile flies from player (-1.8, 1.3, 1.9) to enemy (1.15, 1.6, -1.25)
            _projPos.set(
              THREE.MathUtils.lerp(-1.8, 1.15, t),
              THREE.MathUtils.lerp(1.3, 1.75, t) + Math.sin(t * Math.PI) * 0.85,
              THREE.MathUtils.lerp(1.9, -1.25, t)
            );
            projectileOrb.position.copy(_projPos);
            projectileOrb.scale.setScalar(activeAnimType === 'player_charged' ? 1.85 : 1.0);

            if (animProgress >= 1.0) {
              // Impact!
              activeAnimType = null;
              animProgress = 0;
              projectileOrb.visible = false;
              playerActorSlot.position.set(-1.95, 0, 2.15);
              hitstopTimer = 0.055;
              trauma = combatEventRef.current?.isCritical ? 0.65 : 0.42;
              targetFlashTimer = 0.12;
              spawnParticleBurst(1.15, 1.65, -1.25, 22, true);
            }
          } else if (activeAnimType === 'enemy_counter') {
            const t = Math.min(1, animProgress);
            const lunge = Math.sin(t * Math.PI) * 0.65;
            enemyActorSlot.position.set(1.15 - lunge * 0.6, 0, -1.25 + lunge * 0.6);

            _projPos.set(
              THREE.MathUtils.lerp(1.15, -1.95, t),
              THREE.MathUtils.lerp(1.6, 1.2, t) + Math.sin(t * Math.PI) * 0.6,
              THREE.MathUtils.lerp(-1.25, 2.15, t)
            );
            projectileOrb.position.copy(_projPos);
            projectileOrb.scale.setScalar(1.15);

            if (animProgress >= 1.0) {
              activeAnimType = null;
              animProgress = 0;
              projectileOrb.visible = false;
              enemyActorSlot.position.set(1.15, 0, -1.25);
              hitstopTimer = 0.045;
              trauma = 0.48;
              spawnParticleBurst(-1.95, 1.2, 2.15, 14, false);
            }
          }
        }

        // Target recoil / spin on hit
        if (targetFlashTimer > 0) {
          targetFlashTimer = Math.max(0, targetFlashTimer - dt);
          enemyActorSlot.rotation.y = -Math.PI * 0.2 + Math.sin(targetFlashTimer * 50) * 0.28;
        } else {
          enemyActorSlot.rotation.y = THREE.MathUtils.damp(enemyActorSlot.rotation.y, -Math.PI * 0.2, 8, dt);
        }

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

        // Perfectly Centerized Battle Camera Framing matching the cozy observatory atmosphere
        _camTargetPos.set(0, 1.65, 4.85);
        _camLookTarget.set(0, 1.25, 0.2);

        camera.position.lerp(_camTargetPos, 1 - Math.exp(-5 * dt));
        _currentLook.lerp(_camLookTarget, 1 - Math.exp(-6 * dt));

        // Decaying trauma * trauma shake
        if (trauma > 0) {
          const shake = trauma * trauma * 0.28;
          camera.position.x += (Math.random() - 0.5) * shake;
          camera.position.y += (Math.random() - 0.5) * shake;
          trauma = Math.max(0, trauma - dt * 1.8);
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
