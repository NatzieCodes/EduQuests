import * as THREE from 'three';
import { GameMode, HeroId } from './rules';

/**
 * Helper to add a soft radial contact shadow disc at y = 0.015 under any grounded actor
 */
export function createContactShadow(radius = 1.1, opacity = 0.42): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 24);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x050811,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.015;
  return mesh;
}

/**
 * Builds one of the 4 playable 3D Heroes (8-12 parts each, bottom-center pivot at y=0)
 * matching both the Venge.io 4-hero squad and Pokémon GO battle companions.
 */
export function buildHeroModel(heroId: HeroId): THREE.Group {
  const root = new THREE.Group();
  root.name = `hero_${heroId}`;
  root.add(createContactShadow(0.95, 0.42));

  // Pokémon GO Trainer Shared Toon Materials & Pokéball Helper
  const trainerGlovesMat = new THREE.MeshToonMaterial({ color: 0xfbbf24 });
  const beltMat = new THREE.MeshToonMaterial({ color: 0x18181b });
  const beltBuckleMat = new THREE.MeshToonMaterial({ color: 0xfacc15 });

  // Helper for Pokémon GO Pokéball in hand
  const createPokeBall = () => {
    const ballGroup = new THREE.Group();
    const bottomHemi = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshToonMaterial({ color: 0xf8fafc })
    );
    const topHemi = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
      new THREE.MeshToonMaterial({ color: 0xef4444 })
    );
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.102, 0.102, 0.02, 12),
      new THREE.MeshToonMaterial({ color: 0x0f172a })
    );
    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10),
      new THREE.MeshToonMaterial({ color: 0x67e8f9 })
    );
    button.rotation.x = Math.PI / 2;
    button.position.set(0, 0, 0.09);
    ballGroup.add(bottomHemi, topHemi, band, button);
    return ballGroup;
  };

  // Helper to add expressive eyes, catchlights, eyebrows, and smile to any Trainer Head
  const addTrainerFace = (headY: number, headZ: number, irisHex = 0x2563eb) => {
    const faceGroup = new THREE.Group();
    faceGroup.position.set(0, headY, headZ);

    const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const irisMat = new THREE.MeshBasicMaterial({ color: irisHex });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const blushMat = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0.4,
    });

    [-1, 1].forEach((dir) => {
      const eye = new THREE.Group();
      eye.position.set(dir * 0.11, 0.01, 0.295);
      eye.rotation.y = dir * 0.22;

      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.052, 16), scleraMat);
      const iris = new THREE.Mesh(new THREE.CircleGeometry(0.036, 16), irisMat);
      iris.position.z = 0.003;
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), pupilMat);
      pupil.position.z = 0.006;
      const catchlight = new THREE.Mesh(new THREE.CircleGeometry(0.011, 10), scleraMat);
      catchlight.position.set(-0.01, 0.012, 0.009);
      const lash = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.015), pupilMat);
      lash.position.set(0, 0.045, 0.008);

      eye.add(sclera, iris, pupil, catchlight, lash);
      faceGroup.add(eye);

      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), blushMat);
      blush.position.set(dir * 0.15, -0.045, 0.285);
      blush.rotation.y = dir * 0.35;
      faceGroup.add(blush);
    });

    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.032, 0.006, 8, 14, Math.PI),
      pupilMat
    );
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.075, 0.298);
    faceGroup.add(smile);

    root.add(faceGroup);
  };

  if (heroId === 'shadow_shinobi') {
    // Spark Style (Team Instinct Yellow & Black Trainer Jacket, Spiky Blonde Hair, Sporty Belt & Gloves)
    const jacketMat = new THREE.MeshToonMaterial({ color: 0x18181b });
    const accentYellow = new THREE.MeshToonMaterial({ color: 0xf59e0b });
    const pantMat = new THREE.MeshToonMaterial({ color: 0x27272a });
    const hairMat = new THREE.MeshToonMaterial({ color: 0xfde047 });
    const skinMat = new THREE.MeshToonMaterial({ color: 0xf5d0b1 });

    // 1. Sporty Trainer Pants & Sneakers
    const legGeo = new THREE.CapsuleGeometry(0.15, 0.62, 6, 12);
    const leftLeg = new THREE.Mesh(legGeo, pantMat);
    leftLeg.position.set(-0.2, 0.46, 0);
    const rightLeg = new THREE.Mesh(legGeo, pantMat);
    rightLeg.position.set(0.2, 0.46, 0);
    root.add(leftLeg, rightLeg);

    // 2. Instinct Yellow & Black Zip Jacket
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.29, 0.92, 10), jacketMat);
    torso.position.set(0, 1.2, 0);
    const yellowHoodieLayer = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.26, 0.85, 10), accentYellow);
    yellowHoodieLayer.position.set(0, 1.18, 0.04);
    root.add(torso, yellowHoodieLayer);

    // 3. Trainer Belt with Buckle
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.38), beltMat);
    belt.position.set(0, 0.84, 0);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.42), beltBuckleMat);
    buckle.position.set(0, 0.84, 0.02);
    root.add(belt, buckle);

    // 4. Athletic Arms & Gloves
    const armGeo = new THREE.CapsuleGeometry(0.11, 0.5, 6, 10);
    const leftArm = new THREE.Mesh(armGeo, jacketMat);
    leftArm.position.set(-0.52, 1.26, 0.1);
    leftArm.rotation.z = 0.3;
    const rightArm = new THREE.Mesh(armGeo, jacketMat);
    rightArm.position.set(0.52, 1.26, 0.1);
    rightArm.rotation.z = -0.3;
    const leftGlove = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), trainerGlovesMat);
    leftGlove.position.set(-0.62, 0.98, 0.15);
    const rightHand = new THREE.Group();
    rightHand.position.set(0.62, 0.98, 0.25);
    rightHand.add(createPokeBall());
    root.add(leftArm, rightArm, leftGlove, rightHand);

    // 5. Confident Trainer Head & Spiky Hair
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 14), skinMat);
    head.position.set(0, 1.88, 0.04);
    const hair = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 1), hairMat);
    hair.scale.set(1.1, 0.8, 1.2);
    hair.position.set(0, 2.12, -0.02);
    root.add(head, hair);
    addTrainerFace(1.88, 0.04, 0xd97706);
  } else if (heroId === 'arcane_scout') {
    // Blanche Style (Team Mystic Blue Coat, Scarf, Sleek Boots, Holding Pokéball)
    const coatMat = new THREE.MeshToonMaterial({ color: 0x3b82f6 });
    const darkSuitMat = new THREE.MeshToonMaterial({ color: 0x1e1b4b });
    const scarfMat = new THREE.MeshToonMaterial({ color: 0xf8fafc });
    const hairMat = new THREE.MeshToonMaterial({ color: 0x94a3b8 });
    const skinMat = new THREE.MeshToonMaterial({ color: 0xedd1b0 });

    // 1. Sleek Boots & Tights
    const legGeo = new THREE.CapsuleGeometry(0.14, 0.65, 6, 12);
    const lLeg = new THREE.Mesh(legGeo, darkSuitMat);
    lLeg.position.set(-0.2, 0.45, 0);
    const rLeg = new THREE.Mesh(legGeo, darkSuitMat);
    rLeg.position.set(0.2, 0.45, 0);
    root.add(lLeg, rLeg);

    // 2. Team Mystic Long Coat & Belt
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 1.15, 10), coatMat);
    coat.position.set(0, 1.22, 0);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.36), beltMat);
    belt.position.set(0, 0.88, 0);
    root.add(coat, belt);

    // 3. Long White Scarf
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.85, 0.12), scarfMat);
    scarf.position.set(0.22, 1.45, -0.15);
    scarf.rotation.x = 0.4;
    root.add(scarf);

    // 4. Arms & Pokéball Hand
    const armGeo = new THREE.CapsuleGeometry(0.1, 0.52, 6, 10);
    const lArm = new THREE.Mesh(armGeo, coatMat);
    lArm.position.set(-0.48, 1.25, 0.1);
    lArm.rotation.z = 0.2;
    const rArm = new THREE.Mesh(armGeo, coatMat);
    rArm.position.set(0.48, 1.25, 0.1);
    rArm.rotation.z = -0.2;
    const ballHolder = new THREE.Group();
    ballHolder.position.set(0.58, 1.05, 0.28);
    ballHolder.add(createPokeBall());
    root.add(lArm, rArm, ballHolder);

    // 5. Head & Sleek Hair
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 14), skinMat);
    head.position.set(0, 1.9, 0.04);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), hairMat);
    hair.scale.set(1.02, 0.9, 1.1);
    hair.position.set(0, 2.02, -0.05);
    root.add(head, hair);
    addTrainerFace(1.9, 0.04, 0x0284c7);
  } else if (heroId === 'verdant_warden') {
    // Candela Style (Team Valor White & Red Sporty Trench Coat, Dark Leggings, Gloves, Pokéball)
    const coatMat = new THREE.MeshToonMaterial({ color: 0xf8fafc });
    const redAccent = new THREE.MeshToonMaterial({ color: 0xef4444 });
    const tightMat = new THREE.MeshToonMaterial({ color: 0x18181b });
    const hairMat = new THREE.MeshToonMaterial({ color: 0x451a03 });
    const skinMat = new THREE.MeshToonMaterial({ color: 0xc68b59 });

    // 1. Leggings & Boots
    const legGeo = new THREE.CapsuleGeometry(0.14, 0.65, 6, 12);
    const lLeg = new THREE.Mesh(legGeo, tightMat);
    lLeg.position.set(-0.2, 0.45, 0);
    const rLeg = new THREE.Mesh(legGeo, tightMat);
    rLeg.position.set(0.2, 0.45, 0);
    root.add(lLeg, rLeg);

    // 2. White & Red Valor Sporty Coat & Belt
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.33, 1.1, 10), coatMat);
    coat.position.set(0, 1.2, 0);
    const redLapel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.95, 0.38), redAccent);
    redLapel.position.set(0.12, 1.2, 0.16);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.36), beltMat);
    belt.position.set(0, 0.86, 0);
    root.add(coat, redLapel, belt);

    // 3. Arms, Gloves & Outstretched Pokéball Hand
    const armGeo = new THREE.CapsuleGeometry(0.1, 0.5, 6, 10);
    const lArm = new THREE.Mesh(armGeo, coatMat);
    lArm.position.set(-0.48, 1.25, 0.1);
    lArm.rotation.z = 0.25;
    const rArm = new THREE.Mesh(armGeo, coatMat);
    rArm.position.set(0.55, 1.32, 0.25);
    rArm.rotation.z = -1.15;
    const rGlove = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), redAccent);
    rGlove.position.set(0.85, 1.42, 0.42);
    const outstretchedBall = new THREE.Group();
    outstretchedBall.position.set(0.98, 1.48, 0.52);
    outstretchedBall.add(createPokeBall());
    root.add(lArm, rArm, rGlove, outstretchedBall);

    // 4. Head & Styled Brown Hair
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 14), skinMat);
    head.position.set(0, 1.88, 0.04);
    const hair = new THREE.Mesh(new THREE.DodecahedronGeometry(0.33, 1), hairMat);
    hair.scale.set(1.1, 0.85, 1.15);
    hair.position.set(0, 2.12, -0.04);
    root.add(head, hair);
    addTrainerFace(1.88, 0.04, 0xb91c1c);
  } else {
    // Lilium Style (Elite Pokémon GO Trainer with Pink Ponytails & Sporty Jacket)
    const jacketMat = new THREE.MeshToonMaterial({ color: 0x0284c7 });
    const pinkHairMat = new THREE.MeshToonMaterial({ color: 0xf472b6 });
    const pantMat = new THREE.MeshToonMaterial({ color: 0x1e293b });
    const skinMat = new THREE.MeshToonMaterial({ color: 0xe2c1a0 });

    const legGeo = new THREE.CapsuleGeometry(0.14, 0.62, 6, 10);
    const lLeg = new THREE.Mesh(legGeo, pantMat);
    lLeg.position.set(-0.2, 0.46, 0);
    const rLeg = new THREE.Mesh(legGeo, pantMat);
    rLeg.position.set(0.2, 0.46, 0);
    root.add(lLeg, rLeg);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.25, 0.88, 10), jacketMat);
    torso.position.set(0, 1.18, 0);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.09, 0.35), beltMat);
    belt.position.set(0, 0.84, 0);
    root.add(torso, belt);

    const armGeo = new THREE.CapsuleGeometry(0.1, 0.48, 6, 10);
    const lArm = new THREE.Mesh(armGeo, jacketMat);
    lArm.position.set(-0.44, 1.24, 0.18);
    const rArm = new THREE.Mesh(armGeo, jacketMat);
    rArm.position.set(0.44, 1.24, 0.18);
    const ballHolder = new THREE.Group();
    ballHolder.position.set(0.55, 1.02, 0.28);
    ballHolder.add(createPokeBall());
    root.add(lArm, rArm, ballHolder);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 14), skinMat);
    head.position.set(0, 1.86, 0.04);
    const tailGeo = new THREE.ConeGeometry(0.22, 0.9, 10);
    const lTail = new THREE.Mesh(tailGeo, pinkHairMat);
    lTail.position.set(-0.52, 1.7, -0.05);
    lTail.rotation.z = -0.55;
    const rTail = new THREE.Mesh(tailGeo, pinkHairMat);
    rTail.position.set(0.52, 1.7, -0.05);
    rTail.rotation.z = 0.55;
    root.add(head, lTail, rTail);
    addTrainerFace(1.86, 0.04, 0xdb2777);
  }

  return root;
}

/**
 * Builds the Enemy / Raid Boss / PvP Opponent / Training Dummy based on active mode:
 * - raid: Towering Virizion Finals Titan (Reference Picture 1)
 * - pvp / team: Zygarde Hound + Rival Classmate Trainer standing behind on the right (Reference Picture 2)
 * - training: Mechanical Dojo Training Dummy Mk.IV
 */
export function buildEnemyModel(mode: GameMode): THREE.Group {
  const root = new THREE.Group();
  root.name = `enemy_${mode}`;

  if (mode === 'raid') {
    // Towering Virizion Finals Titan (Reference Picture 1)
    root.add(createContactShadow(2.2, 0.5));
    const emeraldMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.38, metalness: 0.15 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xecfccb, roughness: 0.45, metalness: 0.1 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.35, metalness: 0.2 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.7, metalness: 0.4 });

    // 4 Tall Stag Legs with Pink Bands & Dark Hooves
    const legPositions = [
      [-0.48, 0.85, 0.55],
      [0.48, 0.85, 0.55],
      [-0.48, 0.85, -0.65],
      [0.48, 0.85, -0.65],
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 1.7, 10), emeraldMat);
      leg.position.set(x, y, z);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.035, 8, 16), pinkMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(x, 0.55, z);
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.35, 8), hoofMat);
      hoof.position.set(x, 0.18, z);
      root.add(leg, band, hoof);
    });

    // Sleek Quadruped Body + Cream Chest Crest + Leaf Flanks
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.25, 10, 16), emeraldMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 1.75, -0.05);
    root.add(body);

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.58, 14, 14), creamMat);
    chest.scale.set(0.88, 1.15, 0.75);
    chest.position.set(0, 1.95, 0.52);
    root.add(chest);

    // Tall Regal Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 1.35, 10), emeraldMat);
    neck.position.set(0, 2.65, 0.55);
    neck.rotation.x = -0.15;
    root.add(neck);

    // Pink Neck Collar Frills
    const lFrill = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 8), pinkMat);
    lFrill.position.set(-0.36, 2.75, 0.52);
    lFrill.rotation.z = 0.85;
    const rFrill = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 8), pinkMat);
    rFrill.position.set(0.36, 2.75, 0.52);
    rFrill.rotation.z = -0.85;
    root.add(lFrill, rFrill);

    // Head & Swept-out Virizion Blade Horns + Crimson Eyes
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), creamMat);
    head.scale.set(0.88, 0.82, 1.18);
    head.position.set(0, 3.28, 0.65);

    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 12), emeraldMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 3.24, 0.96);

    const bossEyeMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      emissive: 0xbe123c,
      emissiveIntensity: 1.2,
    });
    const lBossEye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), bossEyeMat);
    lBossEye.position.set(-0.18, 3.32, 0.88);
    const rBossEye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), bossEyeMat);
    rBossEye.position.set(0.18, 3.32, 0.88);

    root.add(head, snout, lBossEye, rBossEye);

    const hornGeo = new THREE.ConeGeometry(0.18, 1.45, 6);
    const lHorn = new THREE.Mesh(hornGeo, emeraldMat);
    lHorn.position.set(-0.68, 3.48, 0.55);
    lHorn.rotation.z = 1.32;
    const rHorn = new THREE.Mesh(hornGeo, emeraldMat);
    rHorn.position.set(0.68, 3.48, 0.55);
    rHorn.rotation.z = -1.32;

    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 6), hoofMat);
    crest.position.set(0, 3.62, 0.68);
    crest.rotation.x = 0.35;

    root.add(lHorn, rHorn, crest);
  } else if (mode === 'pvp' || mode === 'team') {
    // Reference Picture 2: Zygarde 10% Cyber-Hound in front + Rival Classmate Trainer standing behind on the right!
    root.add(createContactShadow(1.25, 0.45));

    const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.4 });
    const neonGreenMat = new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      emissive: 0x4d7c0f,
      emissiveIntensity: 0.5,
      roughness: 0.25,
    });
    const redCoreMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.8,
    });

    // Zygarde Hound Group
    const hound = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.85, 8, 12), obsidianMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.88, 0);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.65, 8), obsidianMat);
    neck.position.set(0, 1.32, 0.42);
    neck.rotation.x = -0.25;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.48), obsidianMat);
    head.position.set(0, 1.65, 0.56);

    const zEyeGeo = new THREE.BoxGeometry(0.06, 0.04, 0.04);
    const zEyeL = new THREE.Mesh(zEyeGeo, neonGreenMat);
    zEyeL.position.set(-0.1, 1.7, 0.79);
    const zEyeR = new THREE.Mesh(zEyeGeo, neonGreenMat);
    zEyeR.position.set(0.1, 1.7, 0.79);

    const earGeo = new THREE.ConeGeometry(0.08, 0.28, 5);
    const lEar = new THREE.Mesh(earGeo, obsidianMat);
    lEar.position.set(-0.12, 1.88, 0.48);
    const rEar = new THREE.Mesh(earGeo, obsidianMat);
    rEar.position.set(0.12, 1.88, 0.48);

    // Green Scarf Tentacle & Red Chest Core
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.95), neonGreenMat);
    scarf.position.set(-0.22, 1.35, 0.15);
    scarf.rotation.y = -0.45;
    scarf.rotation.x = 0.35;

    const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), redCoreMat);
    chestCore.position.set(0, 1.05, 0.48);

    // 4 Hound Legs (Front-left leg is neon green just like Zygarde 10%!)
    const legCoords: [number, number, number, boolean][] = [
      [-0.18, 0.42, 0.36, true],
      [0.18, 0.42, 0.36, false],
      [-0.18, 0.42, -0.36, false],
      [0.18, 0.42, -0.36, false],
    ];
    legCoords.forEach(([x, y, z, isGreen]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.05, 0.84, 8),
        isGreen ? neonGreenMat : obsidianMat
      );
      leg.position.set(x, y, z);
      hound.add(leg);
    });

    hound.add(body, neck, head, zEyeL, zEyeR, lEar, rEar, scarf, chestCore);
    root.add(hound);

    // Rival Classmate Trainer standing behind on the right (exactly like Reference Picture 2!)
    const trainer = new THREE.Group();
    trainer.position.set(1.85, 0, -1.65);
    trainer.rotation.y = -0.35;
    trainer.add(createContactShadow(0.75, 0.35));

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xeab68c, roughness: 0.55 });
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.45 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.65 });

    const tL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.58, 6, 8), shortsMat);
    tL.position.set(-0.16, 0.44, 0);
    const tR = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.58, 6, 8), shortsMat);
    tR.position.set(0.16, 0.44, 0);
    const tTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.21, 0.78, 8), tankMat);
    tTorso.position.set(0, 1.08, 0);
    const tHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), skinMat);
    tHead.position.set(0, 1.66, 0);
    const tHair = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 1), hairMat);
    tHair.position.set(0, 1.78, -0.04);

    const tEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), shortsMat);
    tEyeL.position.set(-0.07, 1.66, 0.2);
    const tEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), shortsMat);
    tEyeR.position.set(0.07, 1.66, 0.2);

    const tArmL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.46, 6, 8), skinMat);
    tArmL.position.set(-0.36, 1.08, 0);
    tArmL.rotation.z = 0.28;
    const tArmR = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.46, 6, 8), skinMat);
    tArmR.position.set(0.36, 1.08, 0);
    tArmR.rotation.z = -0.28;

    const gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), shortsMat);
    gloveL.position.set(-0.44, 0.84, 0.04);
    const gloveR = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), shortsMat);
    gloveR.position.set(0.44, 0.84, 0.04);

    trainer.add(tL, tR, tTorso, tHead, tHair, tEyeL, tEyeR, tArmL, tArmR, gloveL, gloveR);
    root.add(trainer);
  } else {
    // Training Mode: Mechanical Wooden Dojo Training Dummy Mk.IV
    root.add(createContactShadow(1.2, 0.42));
    const oakMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65, metalness: 0.1 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 });
    const targetRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const targetWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

    // Heavy Iron/Brass Base & Spring Post
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.78, 0.22, 16), brassMat);
    base.position.set(0, 0.11, 0);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.85, 12), oakMat);
    post.position.set(0, 1.02, 0);

    // Padded Wooden Body & Crossbar Arms
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 1.05, 12), oakMat);
    body.position.set(0, 1.35, 0);

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.65, 10), oakMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 1.48, 0);

    // Bullseye Target Shield on Chest
    const shieldOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 18), targetRedMat);
    shieldOuter.rotation.x = Math.PI / 2;
    shieldOuter.position.set(0, 1.38, 0.36);

    const shieldInner = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 18), targetWhiteMat);
    shieldInner.rotation.x = Math.PI / 2;
    shieldInner.position.set(0, 1.38, 0.38);

    // Dummy Head with Scholar Headband
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), oakMat);
    head.position.set(0, 2.15, 0);
    const headband = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.045, 8, 20), targetRedMat);
    headband.rotation.x = Math.PI / 2;
    headband.position.set(0, 2.24, 0);

    root.add(base, post, body, crossbar, shieldOuter, shieldInner, head, headband);
  }

  return root;
}

export interface StudyRoomDiorama {
  root: THREE.Group;
  studentHead: THREE.Group;
  studentTorso: THREE.Group;
  otterMascot: THREE.Group;
  cloudsGroup: THREE.Group;
  sunflowerGroup: THREE.Group;
}

/**
 * Builds the 3D Cozy Study Room & Student Studying in the Middle
 * matching the user's reference image (/public/assets/aistudio/image_e8a97dfa.png):
 * - Panoramic observatory window with iron beams, cogs, and pastel sunset clouds outside
 * - Potted sunflowers on the left windowsill
 * - Student in a cozy brown knit turtleneck sweater with chestnut hair & ear tufts studying at the desk in the middle
 * - Cute goggled otter companion with a blue scarf & backpack beside the student
 */
export function buildStudyRoomDiorama(): StudyRoomDiorama {
  const root = new THREE.Group();
  root.name = 'study_room_diorama';

  // ===========================================================================
  // 1. EXTENDED FULL-BLEED PASTEL SUNSET SKY BACKDROP & VOLUMETRIC CLOUDS
  // ===========================================================================
  const skyPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(56, 30),
    new THREE.MeshBasicMaterial({ color: 0x60a5fa })
  );
  skyPlane.position.set(0, 3.2, -5.8);
  root.add(skyPlane);

  // Upper sky gradient band extended full width
  const upperSkyBand = new THREE.Mesh(
    new THREE.PlaneGeometry(56, 11.0),
    new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.85,
    })
  );
  upperSkyBand.position.set(0, 2.55, -5.5);
  root.add(upperSkyBand);

  // Warm sunset horizon glow band extended full width
  const sunsetGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(56, 7.5),
    new THREE.MeshBasicMaterial({
      color: 0xf9a8d4,
      transparent: true,
      opacity: 0.72,
    })
  );
  sunsetGlow.position.set(0, 1.35, -5.3);
  root.add(sunsetGlow);

  // Lower golden-peach cloud glow band extended full width
  const goldenBand = new THREE.Mesh(
    new THREE.PlaneGeometry(56, 4.8),
    new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.75,
    })
  );
  goldenBand.position.set(0, 0.35, -5.1);
  root.add(goldenBand);

  // Soft glowing cyan-white atmospheric sun orb in upper-center window
  const sunOrb = new THREE.Mesh(
    new THREE.CircleGeometry(1.18, 32),
    new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.75,
    })
  );
  sunOrb.position.set(0.45, 2.32, -4.4);
  root.add(sunOrb);

  // Fluffy 3D Sunset Clouds spanning the full extended window width
  const cloudsGroup = new THREE.Group();
  const cloudCreamMat = new THREE.MeshStandardMaterial({
    color: 0xfff7ed,
    emissive: 0xfed7aa,
    emissiveIntensity: 0.28,
    roughness: 0.88,
  });
  const cloudPinkMat = new THREE.MeshStandardMaterial({
    color: 0xfce7f3,
    emissive: 0xf9a8d4,
    emissiveIntensity: 0.24,
    roughness: 0.88,
  });

  const cloudClusters: [number, number, number, number][] = [
    [-5.2, 1.55, -4.2, 1.28],
    [-3.1, 1.42, -3.9, 1.22],
    [-1.1, 1.88, -4.1, 1.42],
    [0.85, 1.32, -3.95, 1.18],
    [2.55, 1.72, -3.85, 1.28],
    [4.45, 1.5, -4.05, 1.25],
  ];
  cloudClusters.forEach(([cx, cy, cz, cScale], idx) => {
    const cluster = new THREE.Group();
    const mat = idx % 2 === 0 ? cloudCreamMat : cloudPinkMat;
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry((0.72 - i * 0.08) * cScale, 14, 14),
        mat
      );
      puff.position.set((i - 1.5) * 0.55 * cScale, (i % 2) * 0.22 * cScale, (i % 2) * 0.1);
      cluster.add(puff);
    }
    cluster.position.set(cx, cy, cz);
    cloudsGroup.add(cluster);
  });
  root.add(cloudsGroup);

  // ===========================================================================
  // 2. EXTENDED COZY OBSERVATORY ROOM ARCHITECTURE, WINDOW FRAME, PIPES & GEARS
  // ===========================================================================
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x272a35,
    roughness: 0.55,
    metalness: 0.55,
  });
  const warmSteelMat = new THREE.MeshStandardMaterial({
    color: 0x3f4454,
    roughness: 0.5,
    metalness: 0.45,
  });
  const woodWallMat = new THREE.MeshStandardMaterial({
    color: 0x3b2820,
    roughness: 0.78,
    metalness: 0.1,
  });
  const bronzeGearMat = new THREE.MeshStandardMaterial({
    color: 0x574133,
    roughness: 0.45,
    metalness: 0.65,
  });

  // Lower indoor wainscoting wall below windowsill extended full width
  const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(36, 1.8, 0.4), woodWallMat);
  lowerWall.position.set(0, -0.05, -0.95);
  root.add(lowerWall);

  // Wide windowsill ledge extended full width
  const windowSill = new THREE.Mesh(new THREE.BoxGeometry(36, 0.18, 0.65), darkIronMat);
  windowSill.position.set(0, 0.82, -0.75);
  root.add(windowSill);

  // Left vertical iron window column + pipe rings
  const leftPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.15, 5.2, 16),
    darkIronMat
  );
  leftPillar.position.set(-2.35, 2.35, -0.75);
  root.add(leftPillar);

  [1.2, 2.2, 3.1].forEach((py) => {
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.035, 8, 20),
      warmSteelMat
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(-2.35, py, -0.75);
    root.add(collar);
  });

  // Top horizontal window beam & pipe conduit extended across the entire top edge
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(36, 1.1, 0.5), darkIronMat);
  topBeam.position.set(0, 3.95, -0.75);
  root.add(topBeam);

  const topPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 18, 12),
    warmSteelMat
  );
  topPipe.rotation.z = Math.PI / 2;
  topPipe.position.set(0, 3.35, -0.68);
  root.add(topPipe);

  // Right observatory arched wall & circular porthole frame extended seamlessly to the far right edge
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(8.0, 7.5, 0.7), woodWallMat);
  rightWall.position.set(6.75, 2.2, -0.65);
  root.add(rightWall);

  const rightArchPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 5.2, 12),
    darkIronMat
  );
  rightArchPipe.position.set(2.75, 2.3, -0.68);
  root.add(rightArchPipe);

  const portholeRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.16, 12, 28),
    darkIronMat
  );
  portholeRing.rotation.y = -0.35;
  portholeRing.position.set(3.85, 1.95, -0.25);
  root.add(portholeRing);

  // Decorative Steampunk/Observatory Gears along the extended windowsill
  const gearPositions: [number, number, number, number][] = [
    [-2.65, 0.65, -0.52, 0.34],
    [-1.45, 0.62, -0.54, 0.26],
    [0.85, 0.64, -0.52, 0.32],
    [1.45, 0.58, -0.5, 0.24],
    [2.15, 0.64, -0.52, 0.3],
  ];
  gearPositions.forEach(([gx, gy, gz, gr]) => {
    const gear = new THREE.Mesh(new THREE.TorusGeometry(gr, 0.06, 8, 12), bronzeGearMat);
    gear.position.set(gx, gy, gz);
    root.add(gear);
  });

  // ===========================================================================
  // 3. POTTED SUNFLOWERS ON THE LEFT WINDOWSILL
  // ===========================================================================
  const sunflowerGroup = new THREE.Group();
  sunflowerGroup.position.set(-2.08, 0.75, -0.32);

  const potMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.75 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.21, 0.36, 16), potMat);
  pot.position.set(0, -0.1, 0);
  sunflowerGroup.add(pot);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
  const leafBush = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), leafMat);
  leafBush.scale.set(1.25, 0.85, 0.95);
  leafBush.position.set(0, 0.12, 0);
  sunflowerGroup.add(leafBush);

  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xeab308,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });
  const centerMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });

  const bloomOffsets: [number, number, number, number][] = [
    [-0.19, 0.28, 0.25, 0.12],
    [0.0, 0.38, 0.27, 0.135],
    [0.19, 0.27, 0.25, 0.12],
    [-0.11, 0.13, 0.31, 0.115],
    [0.11, 0.13, 0.31, 0.115],
  ];
  bloomOffsets.forEach(([bx, by, bz, br]) => {
    const bloom = new THREE.Group();
    // Ring of golden petals facing the camera (+Z)
    for (let p = 0; p < 10; p++) {
      const pAngle = (p / 10) * Math.PI * 2;
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(br * 0.42, 8, 8),
        petalMat
      );
      petal.scale.set(0.65, 1.35, 0.35);
      petal.position.set(Math.cos(pAngle) * br * 0.78, Math.sin(pAngle) * br * 0.78, 0);
      petal.rotation.z = pAngle - Math.PI / 2;
      bloom.add(petal);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(br * 0.55, 12, 12), centerMat);
    core.scale.set(1, 1, 0.45);
    core.position.set(0, 0, 0.02);
    bloom.add(core);
    bloom.position.set(bx, by, bz);
    bloom.rotation.y = 0.18;
    bloom.rotation.x = -0.12;
    sunflowerGroup.add(bloom);
  });
  root.add(sunflowerGroup);

  // ===========================================================================
  // 4. EXTENDED FOREGROUND STUDY DESK, OPEN NOTEBOOK & TEXTBOOK STACK
  // ===========================================================================
  const deskMat = new THREE.MeshStandardMaterial({
    color: 0x2d313b,
    roughness: 0.65,
    metalness: 0.25,
  });
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(28, 0.32, 2.5), deskMat);
  deskTop.position.set(0, 0.2, 1.15);
  root.add(deskTop);

  // Open Study Textbook / Notes directly in front of the centered studying student
  const bookGroup = new THREE.Group();
  bookGroup.position.set(0, 0.38, 0.88);
  bookGroup.rotation.y = 0;

  const coverMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.8 });
  const lineInkMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.03, 0.58), coverMat);
  const pageLeft = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.04, 0.54), pageMat);
  pageLeft.position.set(-0.21, 0.02, 0);
  pageLeft.rotation.z = 0.05;
  const pageRight = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.04, 0.54), pageMat);
  pageRight.position.set(0.21, 0.02, 0);
  pageRight.rotation.z = -0.05;

  // Written text lines on the open study notebook
  for (let i = 0; i < 4; i++) {
    const lineL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.006, 0.03), lineInkMat);
    lineL.position.set(-0.21, 0.045, -0.14 + i * 0.09);
    const lineR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.006, 0.03), lineInkMat);
    lineR.position.set(0.21, 0.045, -0.14 + i * 0.09);
    bookGroup.add(lineL, lineR);
  }
  bookGroup.add(bookCover, pageLeft, pageRight);
  root.add(bookGroup);

  // Stack of Reference Books on Desk (placed symmetrically on the left side of the centered book)
  const stackBook1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.09, 0.38),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 })
  );
  stackBook1.position.set(-0.64, 0.39, 0.72);
  stackBook1.rotation.y = 0.22;

  const stackBook2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.08, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 })
  );
  stackBook2.position.set(-0.64, 0.47, 0.72);
  stackBook2.rotation.y = 0.08;
  root.add(stackBook1, stackBook2);

  // ===========================================================================
  // 5. THE STUDENT PERFECTLY CENTERED IN THE MIDDLE STUDYING AT THE DESK
  // ===========================================================================
  const studentRoot = new THREE.Group();
  studentRoot.position.set(0, 0.35, 0.18);
  studentRoot.rotation.y = 0;

  const sweaterMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.82,
    metalness: 0.04,
  });
  const sweaterRibMat = new THREE.MeshStandardMaterial({
    color: 0x4a3228,
    roughness: 0.85,
    metalness: 0.04,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xfde2d2,
    roughness: 0.5,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x4e2a21,
    roughness: 0.62,
    metalness: 0.08,
  });
  const hairDarkMat = new THREE.MeshStandardMaterial({
    color: 0x3b1d16,
    roughness: 0.68,
    metalness: 0.06,
  });

  const studentTorso = new THREE.Group();
  studentRoot.add(studentTorso);

  // Cozy oversized knit sweater torso
  const torsoMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.48, 1.05, 18),
    sweaterMat
  );
  torsoMesh.scale.set(1.12, 1.0, 0.82);
  torsoMesh.position.set(0, 0.52, 0);
  studentTorso.add(torsoMesh);

  // Chunky folded turtleneck collar (matching the cozy knit collar in the picture)
  const collarLower = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.11, 12, 24),
    sweaterRibMat
  );
  collarLower.rotation.x = Math.PI / 2 + 0.08;
  collarLower.position.set(0, 1.02, 0.04);
  const collarUpper = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.095, 12, 24),
    sweaterMat
  );
  collarUpper.rotation.x = Math.PI / 2 + 0.08;
  collarUpper.position.set(0, 1.13, 0.04);
  studentTorso.add(collarLower, collarUpper);

  // Cozy sweater sleeves & crossed forearms resting on the desk
  const leftUpperArm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.145, 0.52, 8, 12),
    sweaterMat
  );
  leftUpperArm.position.set(-0.46, 0.62, 0.12);
  leftUpperArm.rotation.z = 0.28;
  leftUpperArm.rotation.x = -0.55;

  const rightUpperArm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.145, 0.52, 8, 12),
    sweaterMat
  );
  rightUpperArm.position.set(0.46, 0.62, 0.14);
  rightUpperArm.rotation.z = -0.28;
  rightUpperArm.rotation.x = -0.55;

  // Forearms folded forward on the study desk
  const leftForearm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.135, 0.55, 8, 12),
    sweaterRibMat
  );
  leftForearm.position.set(-0.12, 0.24, 0.36);
  leftForearm.rotation.z = Math.PI / 2 - 0.15;
  leftForearm.rotation.y = 0.25;

  const rightForearm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.135, 0.55, 8, 12),
    sweaterMat
  );
  rightForearm.position.set(0.08, 0.26, 0.42);
  rightForearm.rotation.z = Math.PI / 2 + 0.12;
  rightForearm.rotation.y = -0.2;

  // Student hands resting softly on the desk/arm (holding a study pen in right hand!)
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), skinMat);
  leftHand.scale.set(1.25, 0.75, 0.95);
  leftHand.position.set(-0.34, 0.28, 0.45);
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), skinMat);
  rightHand.scale.set(1.25, 0.75, 0.95);
  rightHand.position.set(0.32, 0.24, 0.44);

  const studyPen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.012, 0.32, 8),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 })
  );
  studyPen.position.set(0.34, 0.34, 0.52);
  studyPen.rotation.z = 0.45;
  studyPen.rotation.x = 0.35;

  studentTorso.add(
    leftUpperArm,
    rightUpperArm,
    leftForearm,
    rightForearm,
    leftHand,
    rightHand,
    studyPen
  );

  // Braided side ponytail resting over shoulder (matching the long braid in the picture)
  const braidGroup = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const segment = new THREE.Mesh(
      new THREE.SphereGeometry(0.13 - i * 0.012, 10, 10),
      hairMat
    );
    segment.scale.set(1.0, 1.15, 0.9);
    segment.position.set(0.32 + i * 0.03, 1.05 - i * 0.15, 0.26 + i * 0.02);
    braidGroup.add(segment);
  }
  studentTorso.add(braidGroup);

  // Student Head Group (animates with gentle reading & breathing nod)
  const studentHead = new THREE.Group();
  studentHead.position.set(0, 1.54, 0.06);
  studentRoot.add(studentHead);

  // Soft anime-proportioned head sphere (clean warm skin front hemisphere)
  const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.38, 28, 28), skinMat);
  headSphere.scale.set(0.96, 1.05, 0.92);
  studentHead.add(headSphere);

  // Rosy blush cheeks (placed cleanly in front of skin surface)
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xfb7185,
    transparent: true,
    opacity: 0.45,
  });
  const blushL = new THREE.Mesh(new THREE.CircleGeometry(0.062, 16), blushMat);
  blushL.position.set(-0.185, -0.055, 0.335);
  blushL.rotation.y = -0.38;
  const blushR = new THREE.Mesh(new THREE.CircleGeometry(0.062, 16), blushMat);
  blushR.position.set(0.185, -0.055, 0.335);
  blushR.rotation.y = 0.38;
  studentHead.add(blushL, blushR);

  // Large Expressive Anime Eyes (Sclera + Warm Hazel-Rose Iris + Pupil + Catchlights + Lashes)
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const irisMat = new THREE.MeshBasicMaterial({ color: 0x8b5e3c });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1e1b18 });
  const lashMat = new THREE.MeshBasicMaterial({ color: 0x2d1812 });

  [-1, 1].forEach((dir) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(dir * 0.14, 0.02, 0.342);
    eyeGroup.rotation.y = dir * 0.24;

    const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.072, 20), scleraMat);
    sclera.scale.set(1.08, 0.95, 1);

    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), irisMat);
    iris.position.set(0, 0, 0.004);

    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), pupilMat);
    pupil.position.set(0, 0, 0.008);

    const catchlight = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), scleraMat);
    catchlight.position.set(-0.016, 0.018, 0.012);

    const upperLash = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.022, 0.02), lashMat);
    upperLash.position.set(0, 0.062, 0.01);
    upperLash.rotation.z = dir * -0.06;

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.016, 0.015), hairDarkMat);
    brow.position.set(0, 0.125, 0.01);
    brow.rotation.z = dir * 0.05;

    eyeGroup.add(sclera, iris, pupil, catchlight, upperLash, brow);
    studentHead.add(eyeGroup);
  });

  // Cute nose & warm smile facing +Z
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), hairDarkMat);
  nose.scale.set(0.8, 0.6, 0.5);
  nose.position.set(0, -0.035, 0.362);

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.007, 8, 16, Math.PI),
    lashMat
  );
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.105, 0.348);
  studentHead.add(nose, smile);

  // Full Chestnut Hair Cap set cleanly behind the forehead/face so zero skin clipping occurs
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.405, 24, 24), hairMat);
  hairBack.scale.set(1.03, 1.07, 0.94);
  hairBack.position.set(0, 0.09, -0.11);
  studentHead.add(hairBack);

  // Top Crown Hair Volume
  const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), hairMat);
  hairCrown.scale.set(1.04, 0.65, 0.95);
  hairCrown.position.set(0, 0.27, 0.04);
  studentHead.add(hairCrown);

  // Swept front bangs framing the sides of the forehead without covering the eyes
  const bangLeft = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.26, 8, 12), hairMat);
  bangLeft.position.set(-0.22, 0.21, 0.25);
  bangLeft.rotation.z = -0.68;
  bangLeft.rotation.x = 0.22;

  const bangRight = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.26, 8, 12), hairMat);
  bangRight.position.set(0.22, 0.21, 0.25);
  bangRight.rotation.z = 0.68;
  bangRight.rotation.x = 0.22;

  const sideLockL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.36, 8, 10), hairDarkMat);
  sideLockL.position.set(-0.34, -0.05, 0.14);
  sideLockL.rotation.z = 0.12;

  const sideLockR = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.36, 8, 10), hairDarkMat);
  sideLockR.position.set(0.34, -0.05, 0.14);
  sideLockR.rotation.z = -0.12;

  studentHead.add(bangLeft, bangRight, sideLockL, sideLockR);

  // Cute Cat-Ear Hair Tufts on top of the student's head (just like in the reference image!)
  const earInnerMat = new THREE.MeshStandardMaterial({ color: 0x3b1d16, roughness: 0.7 });
  [-1, 1].forEach((dir) => {
    const earOuter = new THREE.Mesh(new THREE.ConeGeometry(0.135, 0.3, 12), hairMat);
    earOuter.position.set(dir * 0.23, 0.45, 0.02);
    earOuter.rotation.z = dir * -0.25;
    const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 10), earInnerMat);
    earInner.position.set(dir * 0.23, 0.43, 0.075);
    earInner.rotation.z = dir * -0.25;
    studentHead.add(earOuter, earInner);
  });

  root.add(studentRoot);

  // ===========================================================================
  // 6. CUTE GOGGLED OTTER STUDY COMPANION BESIDE THE STUDENT
  // ===========================================================================
  const otterMascot = new THREE.Group();
  otterMascot.position.set(0.64, 1.02, -0.14);
  otterMascot.rotation.y = -0.2;

  const otterFurMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.75 });
  const otterCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.55 });
  const goggleLensMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x0284c7,
    emissiveIntensity: 0.3,
    roughness: 0.15,
    metalness: 0.6,
  });
  const goggleRimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

  // Otter body & cream belly patch
  const otterBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.36, 12, 16), otterFurMat);
  otterBody.position.set(0, 0, 0);
  const otterBelly = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.28, 10, 14), otterCreamMat);
  otterBelly.position.set(0, -0.02, 0.09);
  otterMascot.add(otterBody, otterBelly);

  // Blue Study Backpack behind the otter
  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.34, 0.24),
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.5 })
  );
  backpack.position.set(0, 0.04, -0.18);
  otterMascot.add(backpack);

  // Cozy Sky-Blue Scarf
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 10, 20), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.set(0, 0.22, 0.02);
  otterMascot.add(scarf);

  // Otter Head, Cream Muzzle, Cute Nose & Ears
  const otterHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), otterFurMat);
  otterHead.scale.set(1.08, 0.96, 1.0);
  otterHead.position.set(0, 0.44, 0.02);
  otterMascot.add(otterHead);

  const muzzleL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), otterCreamMat);
  muzzleL.position.set(-0.06, 0.39, 0.21);
  const muzzleR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), otterCreamMat);
  muzzleR.position.set(0.06, 0.39, 0.21);
  const otterNose = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), pupilMat);
  otterNose.position.set(0, 0.43, 0.27);
  otterMascot.add(muzzleL, muzzleR, otterNose);

  // Otter Eyes & Round Ears
  [-1, 1].forEach((dir) => {
    const oEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), pupilMat);
    oEye.position.set(dir * 0.1, 0.48, 0.22);
    const oEar = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), otterFurMat);
    oEar.position.set(dir * 0.22, 0.56, -0.02);
    otterMascot.add(oEye, oEar);

    // Aviator Goggles perched on forehead
    const gRim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 18), goggleRimMat);
    gRim.position.set(dir * 0.095, 0.59, 0.19);
    gRim.rotation.x = -0.25;
    const gLens = new THREE.Mesh(new THREE.CircleGeometry(0.068, 16), goggleLensMat);
    gLens.position.set(dir * 0.095, 0.59, 0.195);
    gLens.rotation.x = -0.25;
    otterMascot.add(gRim, gLens);

    // Cute Paws & Feet
    const paw = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.14, 6, 10), otterFurMat);
    paw.position.set(dir * 0.22, 0.05, 0.12);
    paw.rotation.z = dir * -0.4;
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.14, 6, 10), otterFurMat);
    foot.position.set(dir * 0.12, -0.32, 0.06);
    otterMascot.add(paw, foot);
  });

  root.add(otterMascot);

  return {
    root,
    studentHead,
    studentTorso,
    otterMascot,
    cloudsGroup,
    sunflowerGroup,
  };
}

export interface StandingStudentRig {
  root: THREE.Group;
  characterGroup: THREE.Group;
  studentHead: THREE.Group;
  upperBodyGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  otterMascot: THREE.Group;
  pedestalRing: THREE.Mesh;
}

export function buildStandingStudentModel(options?: {
  gender?: 'male' | 'female' | 'neutral';
  topHex?: number;
  trimHex?: number;
  pantsHex?: number;
  shoeHex?: number;
  accentHex?: number;
}): StandingStudentRig {
  const gender = options?.gender ?? 'neutral';
  const topHex = options?.topHex ?? 0x5c4033;
  const trimHex = options?.trimHex ?? 0x4a3228;
  const pantsHex = options?.pantsHex ?? 0x1e293b;
  const shoeHex = options?.shoeHex ?? 0xfacc15;
  const accentHex = options?.accentHex ?? 0xfacc15;

  const root = new THREE.Group();

  // 1. Glowing Pedestal Platform at y = 0
  const pedestalGroup = new THREE.Group();
  const baseDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.28, 0.08, 36),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.5,
    })
  );
  baseDisc.position.y = 0.04;
  pedestalGroup.add(baseDisc);

  const pedestalRing = new THREE.Mesh(
    new THREE.RingGeometry(0.96, 1.12, 40),
    new THREE.MeshBasicMaterial({
      color: accentHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    })
  );
  pedestalRing.rotation.x = -Math.PI / 2;
  pedestalRing.position.y = 0.085;
  pedestalGroup.add(pedestalRing);

  const innerGlowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 36),
    new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.16,
    })
  );
  innerGlowDisc.rotation.x = -Math.PI / 2;
  innerGlowDisc.position.y = 0.083;
  pedestalGroup.add(innerGlowDisc);

  root.add(pedestalGroup);

  // Materials matching the lobby 3D character
  const sweaterMat = new THREE.MeshStandardMaterial({
    color: topHex,
    roughness: 0.78,
    metalness: 0.06,
  });
  const sweaterRibMat = new THREE.MeshStandardMaterial({
    color: trimHex,
    roughness: 0.82,
    metalness: 0.05,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsHex,
    roughness: 0.75,
    metalness: 0.08,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: shoeHex,
    roughness: 0.45,
    metalness: 0.18,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.6,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xfde2d2,
    roughness: 0.5,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x4e2a21,
    roughness: 0.62,
    metalness: 0.08,
  });
  const hairDarkMat = new THREE.MeshStandardMaterial({
    color: 0x3b1d16,
    roughness: 0.68,
    metalness: 0.06,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.4,
  });

  // 2. Full-Body Standing Student Group (Centered at x = -0.14 so student + otter feel balanced)
  const characterGroup = new THREE.Group();
  characterGroup.position.set(-0.12, 0.08, 0.08);
  root.add(characterGroup);

  // Standing Legs, Trousers & Sneakers (y = 0.0 to 1.05)
  [-1, 1].forEach((dir) => {
    const legX = dir * 0.19;

    // Sneaker Sole
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.38), soleMat);
    sole.position.set(legX, 0.035, 0.04);
    characterGroup.add(sole);

    // Sneaker Upper
    const shoeUpper = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.105, 0.14, 8, 12),
      shoeMat
    );
    shoeUpper.rotation.x = Math.PI / 2;
    shoeUpper.position.set(legX, 0.11, 0.04);
    characterGroup.add(shoeUpper);

    // Sneaker Tongue Accent
    const shoeTongue = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.08), accentMat);
    shoeTongue.position.set(legX, 0.17, 0.11);
    characterGroup.add(shoeTongue);

    // Full-Length Trouser Leg
    const pantLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.13, 0.88, 14),
      pantsMat
    );
    pantLeg.position.set(legX, 0.58, 0);
    characterGroup.add(pantLeg);

    // Trouser Cuff Roll
    const pantCuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.132, 0.026, 8, 18),
      sweaterRibMat
    );
    pantCuff.rotation.x = Math.PI / 2;
    pantCuff.position.set(legX, 0.19, 0);
    characterGroup.add(pantCuff);
  });

  // Pelvis / Hips & Belt with Glowing Buckle
  const hipsMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.34, 0.24, 16),
    pantsMat
  );
  hipsMesh.scale.set(1.05, 1, 0.8);
  hipsMesh.position.set(0, 1.02, 0);
  characterGroup.add(hipsMesh);

  const beltMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.365, 0.365, 0.08, 18),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.3 })
  );
  beltMesh.scale.set(1.06, 1, 0.82);
  beltMesh.position.set(0, 1.11, 0);
  characterGroup.add(beltMesh);

  const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.06), accentMat);
  beltBuckle.position.set(0, 1.11, 0.29);
  characterGroup.add(beltBuckle);

  // Upper Body Group (Torso + Collar + Braid + Arms — animates with breathing)
  const upperBodyGroup = new THREE.Group();
  upperBodyGroup.position.set(0, 1.12, 0);
  characterGroup.add(upperBodyGroup);

  const torsoScaleX = gender === 'male' ? 1.16 : gender === 'female' ? 1.02 : 1.09;
  const torsoMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.36, 0.86, 18),
    sweaterMat
  );
  torsoMesh.scale.set(torsoScaleX, 1.0, 0.8);
  torsoMesh.position.set(0, 0.42, 0);
  upperBodyGroup.add(torsoMesh);

  // Cozy Ribbed Waistband Hem
  const waistHem = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.055, 10, 22),
    sweaterRibMat
  );
  waistHem.rotation.x = Math.PI / 2;
  waistHem.scale.set(torsoScaleX, 0.82, 1);
  waistHem.position.set(0, 0.04, 0);
  upperBodyGroup.add(waistHem);

  // Chunky Folded Turtleneck Collar (matching the lobby character)
  const collarLower = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.095, 12, 24),
    sweaterRibMat
  );
  collarLower.rotation.x = Math.PI / 2 + 0.06;
  collarLower.position.set(0, 0.84, 0.03);

  const collarUpper = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.082, 12, 24),
    sweaterMat
  );
  collarUpper.rotation.x = Math.PI / 2 + 0.06;
  collarUpper.position.set(0, 0.93, 0.03);
  upperBodyGroup.add(collarLower, collarUpper);

  // Braided Side Ponytail resting over shoulder (same as lobby character)
  const braidGroup = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const segment = new THREE.Mesh(
      new THREE.SphereGeometry(0.115 - i * 0.01, 10, 10),
      hairMat
    );
    segment.scale.set(1.0, 1.15, 0.9);
    segment.position.set(0.28 + i * 0.025, 0.86 - i * 0.13, 0.22 + i * 0.018);
    braidGroup.add(segment);
  }
  upperBodyGroup.add(braidGroup);

  // Standing Left & Right Arms with natural relaxed pose & study pen
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.42 * torsoScaleX, 0.74, 0.02);
  upperBodyGroup.add(leftArmGroup);

  const leftSleeve = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.115, 0.56, 8, 12),
    sweaterMat
  );
  leftSleeve.position.set(-0.04, -0.28, 0.03);
  leftSleeve.rotation.z = 0.12;
  leftSleeve.rotation.x = -0.08;
  leftArmGroup.add(leftSleeve);

  const leftCuff = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.028, 8, 16),
    sweaterRibMat
  );
  leftCuff.rotation.x = Math.PI / 2;
  leftCuff.position.set(-0.08, -0.58, 0.05);
  leftArmGroup.add(leftCuff);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), skinMat);
  leftHand.scale.set(0.95, 1.15, 0.85);
  leftHand.position.set(-0.09, -0.68, 0.06);
  leftArmGroup.add(leftHand);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.42 * torsoScaleX, 0.74, 0.02);
  upperBodyGroup.add(rightArmGroup);

  const rightSleeve = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.115, 0.56, 8, 12),
    sweaterMat
  );
  rightSleeve.position.set(0.04, -0.26, 0.06);
  rightSleeve.rotation.z = -0.14;
  rightSleeve.rotation.x = -0.22;
  rightArmGroup.add(rightSleeve);

  const rightCuff = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.028, 8, 16),
    sweaterRibMat
  );
  rightCuff.rotation.x = Math.PI / 2 - 0.22;
  rightCuff.position.set(0.08, -0.55, 0.13);
  rightArmGroup.add(rightCuff);

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), skinMat);
  rightHand.scale.set(0.95, 1.15, 0.85);
  rightHand.position.set(0.09, -0.64, 0.16);
  rightArmGroup.add(rightHand);

  // Study Pen held in right hand (matching lobby character)
  const studyPen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.011, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 })
  );
  studyPen.position.set(0.06, -0.63, 0.24);
  studyPen.rotation.z = 0.55;
  studyPen.rotation.x = 0.45;
  rightArmGroup.add(studyPen);

  // 3. Student Head (Exact 3D head, anime eyes, blush, chestnut hair & cat-ear tufts from lobby!)
  const studentHead = new THREE.Group();
  studentHead.position.set(0, 2.42, 0.04);
  characterGroup.add(studentHead);

  const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 28, 28), skinMat);
  headSphere.scale.set(0.96, 1.05, 0.92);
  studentHead.add(headSphere);

  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xfb7185,
    transparent: true,
    opacity: 0.45,
  });
  const blushL = new THREE.Mesh(new THREE.CircleGeometry(0.056, 16), blushMat);
  blushL.position.set(-0.17, -0.05, 0.31);
  blushL.rotation.y = -0.38;
  const blushR = new THREE.Mesh(new THREE.CircleGeometry(0.056, 16), blushMat);
  blushR.position.set(0.17, -0.05, 0.31);
  blushR.rotation.y = 0.38;
  studentHead.add(blushL, blushR);

  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const irisMat = new THREE.MeshBasicMaterial({ color: 0x8b5e3c });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1e1b18 });
  const lashMat = new THREE.MeshBasicMaterial({ color: 0x2d1812 });

  [-1, 1].forEach((dir) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(dir * 0.13, 0.02, 0.315);
    eyeGroup.rotation.y = dir * 0.24;

    const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.066, 20), scleraMat);
    sclera.scale.set(1.08, 0.95, 1);

    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.046, 20), irisMat);
    iris.position.set(0, 0, 0.004);

    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.024, 16), pupilMat);
    pupil.position.set(0, 0, 0.008);

    const catchlight = new THREE.Mesh(new THREE.CircleGeometry(0.015, 12), scleraMat);
    catchlight.position.set(-0.014, 0.016, 0.012);

    const upperLash = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.02), lashMat);
    upperLash.position.set(0, 0.056, 0.01);
    upperLash.rotation.z = dir * -0.06;

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.015, 0.015), hairDarkMat);
    brow.position.set(0, 0.115, 0.01);
    brow.rotation.z = dir * 0.05;

    eyeGroup.add(sclera, iris, pupil, catchlight, upperLash, brow);
    studentHead.add(eyeGroup);
  });

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), hairDarkMat);
  nose.scale.set(0.8, 0.6, 0.5);
  nose.position.set(0, -0.032, 0.334);

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.036, 0.0065, 8, 16, Math.PI),
    lashMat
  );
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.095, 0.32);
  studentHead.add(nose, smile);

  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.375, 24, 24), hairMat);
  hairBack.scale.set(1.03, 1.07, 0.94);
  hairBack.position.set(0, 0.08, -0.1);
  studentHead.add(hairBack);

  const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 16), hairMat);
  hairCrown.scale.set(1.04, 0.65, 0.95);
  hairCrown.position.set(0, 0.25, 0.035);
  studentHead.add(hairCrown);

  const bangLeft = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.24, 8, 12), hairMat);
  bangLeft.position.set(-0.2, 0.19, 0.23);
  bangLeft.rotation.z = -0.68;
  bangLeft.rotation.x = 0.22;

  const bangRight = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.24, 8, 12), hairMat);
  bangRight.position.set(0.2, 0.19, 0.23);
  bangRight.rotation.z = 0.68;
  bangRight.rotation.x = 0.22;

  const sideLockL = new THREE.Mesh(new THREE.CapsuleGeometry(0.074, 0.33, 8, 10), hairDarkMat);
  sideLockL.position.set(-0.31, -0.045, 0.13);
  sideLockL.rotation.z = 0.12;

  const sideLockR = new THREE.Mesh(new THREE.CapsuleGeometry(0.074, 0.33, 8, 10), hairDarkMat);
  sideLockR.position.set(0.31, -0.045, 0.13);
  sideLockR.rotation.z = -0.12;

  studentHead.add(bangLeft, bangRight, sideLockL, sideLockR);

  const earInnerMat = new THREE.MeshStandardMaterial({ color: 0x3b1d16, roughness: 0.7 });
  [-1, 1].forEach((dir) => {
    const earOuter = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.27, 12), hairMat);
    earOuter.position.set(dir * 0.21, 0.41, 0.02);
    earOuter.rotation.z = dir * -0.25;
    const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.18, 10), earInnerMat);
    earInner.position.set(dir * 0.21, 0.39, 0.07);
    earInner.rotation.z = dir * -0.25;
    studentHead.add(earOuter, earInner);
  });

  // 4. Cute 3D Goggled Otter Companion Standing Beside the Student on the Pedestal
  const otterMascot = new THREE.Group();
  otterMascot.position.set(0.56, 0.48, 0.02);
  otterMascot.rotation.y = -0.26;
  otterMascot.scale.setScalar(0.86);

  const otterFurMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.75 });
  const otterCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.55 });
  const goggleLensMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x0284c7,
    emissiveIntensity: 0.3,
    roughness: 0.15,
    metalness: 0.6,
  });
  const goggleRimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

  const otterBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.36, 12, 16), otterFurMat);
  const otterBelly = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.28, 10, 14), otterCreamMat);
  otterBelly.position.set(0, -0.02, 0.09);
  otterMascot.add(otterBody, otterBelly);

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.34, 0.24),
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.5 })
  );
  backpack.position.set(0, 0.04, -0.18);
  otterMascot.add(backpack);

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 10, 20), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.set(0, 0.22, 0.02);
  otterMascot.add(scarf);

  const otterHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), otterFurMat);
  otterHead.scale.set(1.08, 0.96, 1.0);
  otterHead.position.set(0, 0.44, 0.02);
  otterMascot.add(otterHead);

  const muzzleL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), otterCreamMat);
  muzzleL.position.set(-0.06, 0.39, 0.21);
  const muzzleR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), otterCreamMat);
  muzzleR.position.set(0.06, 0.39, 0.21);
  const otterNose = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), pupilMat);
  otterNose.position.set(0, 0.43, 0.27);
  otterMascot.add(muzzleL, muzzleR, otterNose);

  [-1, 1].forEach((dir) => {
    const oEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), pupilMat);
    oEye.position.set(dir * 0.1, 0.48, 0.22);
    const oEar = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), otterFurMat);
    oEar.position.set(dir * 0.22, 0.56, -0.02);
    otterMascot.add(oEye, oEar);

    const gRim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 18), goggleRimMat);
    gRim.position.set(dir * 0.095, 0.59, 0.19);
    gRim.rotation.x = -0.25;
    const gLens = new THREE.Mesh(new THREE.CircleGeometry(0.068, 16), goggleLensMat);
    gLens.position.set(dir * 0.095, 0.59, 0.195);
    gLens.rotation.x = -0.25;
    otterMascot.add(gRim, gLens);

    const paw = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.14, 6, 10), otterFurMat);
    paw.position.set(dir * 0.22, 0.05, 0.12);
    paw.rotation.z = dir * -0.4;
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.14, 6, 10), otterFurMat);
    foot.position.set(dir * 0.12, -0.32, 0.06);
    otterMascot.add(paw, foot);
  });

  root.add(otterMascot);

  return {
    root,
    characterGroup,
    studentHead,
    upperBodyGroup,
    leftArmGroup,
    rightArmGroup,
    otterMascot,
    pedestalRing,
  };
}


