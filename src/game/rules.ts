export type GameMode = 'raid' | 'pvp' | 'team' | 'training';
export type GameShellState = 'title' | 'playing' | 'paused' | 'gameover';
export type HeroId = 'shadow_shinobi' | 'arcane_scout' | 'verdant_warden' | 'aether_valkyrie';

export interface HeroSpec {
  id: HeroId;
  name: string;
  codename: string;
  role: string;
  cp: number;
  maxHp: number;
  elementA: string;
  elementB: string;
  primaryColor: string;
  accentColor: string;
  fastAttackName: string;
  chargedAttackName: string;
  secondaryChargedName: string;
  description: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  conceptTag: string;
  difficulty: 'Standard' | 'Advanced' | 'Boss Challenge';
}

export interface QuizDeck {
  id: string;
  title: string;
  subject: string;
  sourceSummary: string;
  createdAt: string;
  questions: QuizQuestion[];
}

export interface ClassmateMember {
  id: string;
  name: string;
  blockSection: string;
  heroId: HeroId;
  cp: number;
  team: 'alpha' | 'omega';
  score: number;
  damageDealt: number;
  isReady: boolean;
  isHost?: boolean;
}

export interface BattleModeSpec {
  id: GameMode;
  title: string;
  shortTitle: string;
  subtitle: string;
  enemyName: string;
  enemyTrainer?: string;
  enemyCp: number;
  enemyMaxHp: number;
  timeLimitSec: number; // 0 for unlimited (training)
  playerShields: number;
  enemyShields: number;
  partyOrbs: number;
  environmentName: string;
  description: string;
}

export const HEROES: HeroSpec[] = [
  {
    id: 'shadow_shinobi',
    name: 'Kurogami',
    codename: 'Honchkrow93 · Cyber Shinobi',
    role: 'Burst Striker · Critical Multiplier',
    cp: 2299,
    maxHp: 500,
    elementA: 'Dark',
    elementB: 'Flying',
    primaryColor: '#334155',
    accentColor: '#ef4444',
    fastAttackName: 'Night Slash',
    chargedAttackName: 'SKY ATTACK',
    secondaryChargedName: 'DARK PULSE',
    description: 'Stealth scholar in charcoal shinobi armor. Deals +20% bonus damage on fast answers under 5 seconds.',
  },
  {
    id: 'arcane_scout',
    name: 'Zeph',
    codename: 'Zeph · Bio Shaman',
    role: 'Tactical Caster · Fast Charge',
    cp: 2185,
    maxHp: 480,
    elementA: 'Psychic',
    elementB: 'Electric',
    primaryColor: '#6366f1',
    accentColor: '#f43f5e',
    fastAttackName: 'Volt Bolt',
    chargedAttackName: 'AETHER STORM',
    secondaryChargedName: 'THUNDER WAVE',
    description: 'Tribal arcane prodigy with horned skull pauldron. Builds Charged Attack energy 25% faster per answer.',
  },
  {
    id: 'verdant_warden',
    name: 'Trevenant',
    codename: 'Trevenant · Forest Sage',
    role: 'Guardian Tank · Shield Sustain',
    cp: 1484,
    maxHp: 580,
    elementA: 'Ghost',
    elementB: 'Grass',
    primaryColor: '#65a30d',
    accentColor: '#10b981',
    fastAttackName: 'Shadow Claw',
    chargedAttackName: 'SHADOW BALL',
    secondaryChargedName: 'SEED BOMB',
    description: 'Ancient wooden spirit guardian with emerald foliage crown. Absorbs 25% more counter-attack damage in PvP.',
  },
  {
    id: 'aether_valkyrie',
    name: 'Lilium',
    codename: 'Lilium · Plasma Valkyrie',
    role: 'Combo Duelist · Team Synergy',
    cp: 2410,
    maxHp: 510,
    elementA: 'Fairy',
    elementB: 'Fighting',
    primaryColor: '#ec4899',
    accentColor: '#06b6d4',
    fastAttackName: 'Twin Blaster',
    chargedAttackName: 'PETAL TEMPEST',
    secondaryChargedName: 'NOVA IMPACT',
    description: 'High-agility twin-tail valkyrie with lotus crest. Boosts allied classmate raid & team attack strikes.',
  },
];

export const BATTLE_MODES: Record<GameMode, BattleModeSpec> = {
  raid: {
    id: 'raid',
    title: 'Raid Battle',
    shortTitle: 'RAID BOSS',
    subtitle: 'Co-op Classmate Boss Raid',
    enemyName: 'Virizion',
    enemyCp: 39601,
    enemyMaxHp: 2400,
    timeLimitSec: 180,
    playerShields: 0,
    enemyShields: 0,
    partyOrbs: 6,
    environmentName: 'Academic Gym Stadium (Daylight)',
    description: 'All students in the room attack the towering Finals Raid Boss simultaneously by answering their own study questions before the 180s timer expires.',
  },
  pvp: {
    id: 'pvp',
    title: 'PvP Duel',
    shortTitle: 'PVP 1v1',
    subtitle: '1v1 Classmate Challenge',
    enemyName: 'Zygarde',
    enemyTrainer: 'Blockmate Marco',
    enemyCp: 1497,
    enemyMaxHp: 650,
    timeLimitSec: 150,
    playerShields: 2,
    enemyShields: 2,
    partyOrbs: 3,
    environmentName: 'Twilight Elder Clearing (Night)',
    description: 'Direct 1v1 duel against a classmate in the twilight arena. Answer accurately to charge dual moves and break your rival’s 2 Protect Shields.',
  },
  team: {
    id: 'team',
    title: 'Team Fight',
    shortTitle: 'TEAM 3v3',
    subtitle: 'Alpha Block vs Omega Block',
    enemyName: 'Omega Vanguard',
    enemyTrainer: 'Squad Leader Rina',
    enemyCp: 4480,
    enemyMaxHp: 1350,
    timeLimitSec: 160,
    playerShields: 2,
    enemyShields: 2,
    partyOrbs: 3,
    environmentName: 'Campus Championship Arena (Dusk)',
    description: 'Two student teams clash in synchronized quiz combat. Chain correct answers with your blockmates to unleash Coordinated Team Strikes.',
  },
  training: {
    id: 'training',
    title: 'Training Mode',
    shortTitle: 'TRAINING',
    subtitle: 'Solo Study & Dummy Practice',
    enemyName: 'Study Dummy Mk.IV',
    enemyCp: 1000,
    enemyMaxHp: 800,
    timeLimitSec: 0,
    playerShields: 3,
    enemyShields: 0,
    partyOrbs: 3,
    environmentName: 'Scholar Courtyard Dojo (Sunset)',
    description: 'Zero-pressure solo study ground against mechanical Training Dummies. Inspect full AI explanations after every question and master weak concepts.',
  },
};

export const DEFAULT_QUIZ_DECKS: QuizDeck[] = [
  {
    id: 'deck-cs-dsa',
    title: 'Data Structures & Algorithms',
    subject: 'Computer Science · BSCS-3A',
    sourceSummary: 'Lecture notes on Big-O complexity, binary search trees, hash tables, graph traversals (BFS/DFS), and dynamic programming.',
    createdAt: '2026-10-30',
    questions: [
      {
        id: 'cs-1',
        question: 'What is the worst-case time complexity of searching for a key in an unbalanced Binary Search Tree (BST) with n nodes?',
        options: ['O(log n)', 'O(n)', 'O(1)', 'O(n log n)'],
        correctIndex: 1,
        explanation: 'If elements are inserted in sorted order, an unbalanced BST degenerates into a linked list of height n, making lookup O(n).',
        conceptTag: 'Trees & Complexity',
        difficulty: 'Standard',
      },
      {
        id: 'cs-2',
        question: 'Which data structure is used internally by Breadth-First Search (BFS) to traverse a graph level by level?',
        options: ['Stack (LIFO)', 'Queue (FIFO)', 'Min-Heap Priority Queue', 'Disjoint Set Union'],
        correctIndex: 1,
        explanation: 'BFS explores vertices in order of their distance from the source using a First-In, First-Out (FIFO) Queue.',
        conceptTag: 'Graph Algorithms',
        difficulty: 'Standard',
      },
      {
        id: 'cs-3',
        question: 'In a Hash Table using separate chaining, what happens when two distinct keys hash to the same bucket index?',
        options: [
          'The older key is overwritten immediately',
          'The table doubles in size automatically',
          'Both key-value pairs are stored in a linked list at that bucket',
          'A secondary binary search is run across the whole array',
        ],
        correctIndex: 2,
        explanation: 'Separate chaining resolves collisions by maintaining a linked list (or dynamic bucket list) of colliding entries at each array index.',
        conceptTag: 'Hash Tables',
        difficulty: 'Standard',
      },
      {
        id: 'cs-4',
        question: 'Which shortest-path algorithm guarantees optimal results on graphs with negative-weight edges (assuming no negative cycles)?',
        options: ['Dijkstra’s Algorithm', 'Bellman-Ford Algorithm', 'Prim’s Minimum Spanning Tree', 'Kruskal’s Algorithm'],
        correctIndex: 1,
        explanation: 'Bellman-Ford relaxes all edges V - 1 times, handling negative edge weights correctly and detecting negative-weight cycles.',
        conceptTag: 'Shortest Paths',
        difficulty: 'Advanced',
      },
      {
        id: 'cs-5',
        question: 'What two properties must a problem exhibit to be solved effectively using Dynamic Programming?',
        options: [
          'Greedy choice property and bipartite structure',
          'Optimal substructure and overlapping subproblems',
          'Divide-and-conquer partitioning and tail recursion',
          'Constant space overhead and monotonic keys',
        ],
        correctIndex: 1,
        explanation: 'Dynamic Programming caches results of overlapping subproblems and combines optimal solutions of subproblems (optimal substructure).',
        conceptTag: 'Dynamic Programming',
        difficulty: 'Advanced',
      },
      {
        id: 'cs-6',
        question: 'What is the time complexity of extracting the minimum element from a Binary Min-Heap with n elements?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctIndex: 1,
        explanation: 'Peeking the minimum is O(1), but removing it swaps the last element to the root and heapifies down in O(log n) time.',
        conceptTag: 'Heaps & Priority Queues',
        difficulty: 'Standard',
      },
      {
        id: 'cs-7',
        question: 'Which sorting algorithm is NOT in-place and requires O(n) auxiliary memory in its standard array implementation?',
        options: ['HeapSort', 'Insertion Sort', 'MergeSort', 'QuickSort'],
        correctIndex: 2,
        explanation: 'Standard MergeSort allocates temporary arrays of total size O(n) during the merge step while achieving guaranteed O(n log n) time.',
        conceptTag: 'Sorting',
        difficulty: 'Standard',
      },
      {
        id: 'cs-8',
        question: 'In a Red-Black Tree or AVL Tree, why are tree rotations performed after insertions and deletions?',
        options: [
          'To sort keys in descending order',
          'To bound tree height to O(log n) while preserving BST ordering',
          'To convert the binary tree into a B+ tree',
          'To eliminate all leaf nodes at odd depths',
        ],
        correctIndex: 1,
        explanation: 'Local rotations rebalance the tree in O(1) structural steps while strictly preserving the inorder BST key invariant.',
        conceptTag: 'Balanced Trees',
        difficulty: 'Boss Challenge',
      },
    ],
  },
  {
    id: 'deck-bio-cell',
    title: 'Cellular Biology & Bioenergetics',
    subject: 'General Biology · BIO-102',
    sourceSummary: 'PDF study guide on ATP synthesis, glycolysis, Krebs cycle, oxidative phosphorylation, and cell membrane transport.',
    createdAt: '2026-10-30',
    questions: [
      {
        id: 'bio-1',
        question: 'Where in the eukaryotic cell does the Citric Acid Cycle (Krebs Cycle) take place?',
        options: ['Cytosol', 'Mitochondrial Matrix', 'Inner Nuclear Membrane', 'Rough Endoplasmic Reticulum'],
        correctIndex: 1,
        explanation: 'After glycolysis in the cytosol, pyruvate enters the mitochondrial matrix where it is oxidized in the Citric Acid Cycle.',
        conceptTag: 'Cellular Respiration',
        difficulty: 'Standard',
      },
      {
        id: 'bio-2',
        question: 'Which enzyme directly utilizes the proton-motive gradient across the inner mitochondrial membrane to synthesize ATP?',
        options: ['Hexokinase', 'ATP Synthase', 'Phosphofructokinase', 'RNA Polymerase II'],
        correctIndex: 1,
        explanation: 'ATP Synthase acts as a rotary molecular motor powered by H+ ions flowing down their electrochemical gradient (chemiosmosis).',
        conceptTag: 'Chemiosmosis',
        difficulty: 'Standard',
      },
      {
        id: 'bio-3',
        question: 'What is the final electron acceptor at the end of the aerobic Electron Transport Chain?',
        options: ['NAD+', 'Molecular Oxygen (O2)', 'Pyruvate', 'Carbon Dioxide (CO2)'],
        correctIndex: 1,
        explanation: 'Oxygen accepts electrons and protons at Complex IV to form water (H2O); without O2, the electron transport chain halts.',
        conceptTag: 'Electron Transport',
        difficulty: 'Standard',
      },
      {
        id: 'bio-4',
        question: 'How does active transport across a phospholipid bilayer differ from facilitated diffusion?',
        options: [
          'Active transport never uses transmembrane proteins',
          'Active transport moves solutes against their concentration gradient using metabolic energy (ATP)',
          'Facilitated diffusion only transports nonpolar gases',
          'Active transport only occurs in plant cell walls',
        ],
        correctIndex: 1,
        explanation: 'Active transport pumps molecules uphill against their electrochemical gradient, requiring ATP hydrolysis or ion co-transport.',
        conceptTag: 'Membrane Transport',
        difficulty: 'Standard',
      },
      {
        id: 'bio-5',
        question: 'During the light-dependent reactions of photosynthesis, splitting of water (photolysis) occurs at which complex?',
        options: ['Photosystem II (PSII)', 'Photosystem I (PSI)', 'Rubisco in the Stroma', 'Cytochrome c Oxidase'],
        correctIndex: 0,
        explanation: 'The oxygen-evolving complex of Photosystem II splits H2O to replace electrons excited by light, releasing O2 gas.',
        conceptTag: 'Photosynthesis',
        difficulty: 'Advanced',
      },
      {
        id: 'bio-6',
        question: 'What is the net gain of ATP molecules produced directly by Glycolysis per molecule of glucose?',
        options: ['2 ATP net (4 produced, 2 invested)', '36 ATP net', '1 ATP net', '8 ATP net'],
        correctIndex: 0,
        explanation: 'Glycolysis invests 2 ATP in the preparatory phase and generates 4 ATP via substrate-level phosphorylation, yielding 2 net ATP.',
        conceptTag: 'Glycolysis',
        difficulty: 'Standard',
      },
    ],
  },
  {
    id: 'deck-phys-thermo',
    title: 'Thermodynamics & Electromagnetism',
    subject: 'Engineering Physics · PHYS-201',
    sourceSummary: 'Reviewer notes covering Laws of Thermodynamics, Carnot efficiency, entropy, Gauss’s Law, and Faraday’s Law of Induction.',
    createdAt: '2026-10-30',
    questions: [
      {
        id: 'phys-1',
        question: 'In an isothermal expansion of an ideal gas, how does the internal energy (ΔU) of the gas change?',
        options: ['ΔU increases proportionally to volume', 'ΔU equals zero (0)', 'ΔU decreases exponentially', 'ΔU equals negative work'],
        correctIndex: 1,
        explanation: 'For an ideal gas, internal energy U depends solely on temperature T. Since ΔT = 0 in an isothermal process, ΔU = 0 and Q = W.',
        conceptTag: 'First Law of Thermo',
        difficulty: 'Standard',
      },
      {
        id: 'phys-2',
        question: 'What is the maximum theoretical efficiency of a Carnot heat engine operating between T_hot = 600 K and T_cold = 300 K?',
        options: ['25%', '50%', '75%', '100%'],
        correctIndex: 1,
        explanation: 'Carnot efficiency η = 1 - (T_cold / T_hot) = 1 - (300 / 600) = 0.50 or 50%.',
        conceptTag: 'Heat Engines',
        difficulty: 'Standard',
      },
      {
        id: 'phys-3',
        question: 'According to Faraday’s Law of Electromagnetic Induction, an electromotive force (EMF) is induced in a loop when:',
        options: [
          'A constant magnetic field runs parallel to the wire',
          'The magnetic flux through the loop changes over time',
          'The loop is placed near a stationary electric dipole',
          'The resistance of the wire drops to zero',
        ],
        correctIndex: 1,
        explanation: 'Faraday’s Law states ε = -dΦ_B/dt: a time-varying magnetic flux through a surface induces a circulating electric field and EMF.',
        conceptTag: 'Electromagnetism',
        difficulty: 'Standard',
      },
      {
        id: 'phys-4',
        question: 'Lenz’s Law explains the negative sign in Faraday’s Law, which represents the conservation of:',
        options: ['Electric Charge', 'Energy', 'Linear Momentum', 'Magnetic Monopoles'],
        correctIndex: 1,
        explanation: 'The induced current opposes the change in flux that created it; otherwise, it would create self-reinforcing infinite energy.',
        conceptTag: 'Lenz’s Law',
        difficulty: 'Advanced',
      },
    ],
  },
];

export const SAMPLE_STUDY_NOTES: Record<string, { title: string; subject: string; notes: string }> = {
  operating_systems: {
    title: 'Operating Systems & Concurrency',
    subject: 'Computer Science · CS-304',
    notes: `Process vs Thread: A process is an independent executing program with its own isolated virtual address space, whereas threads within the same process share heap memory and file descriptors while maintaining separate stacks and registers.
Deadlock Coffman Conditions: Four conditions must hold simultaneously for a deadlock to occur: (1) Mutual Exclusion, (2) Hold and Wait, (3) No Preemption, and (4) Circular Wait.
Virtual Memory & Paging: Virtual memory divides memory into fixed-size pages mapped to physical frames via a Page Table. A Translation Lookaside Buffer (TLB) caches recent virtual-to-physical address translations to minimize memory access latency.
Page Replacement: Least Recently Used (LRU) evicts the page that has not been accessed for the longest time, avoiding Belady's Anomaly which affects FIFO page replacement.
CPU Scheduling: Round Robin assigns a fixed time quantum to each ready process for fair response time, while Shortest Remaining Time First (SRTF) minimizes average waiting time.`,
  },
  organic_chemistry: {
    title: 'Organic Chemistry Reaction Mechanisms',
    subject: 'Chemistry · CHEM-210',
    notes: `SN2 Nucleophilic Substitution: SN2 is a concerted, single-step bimolecular reaction where the nucleophile attacks from the backside of the carbon-leaving group bond, resulting in complete stereochemical inversion (Walden inversion). Favored by primary substrates and polar aprotic solvents like DMSO or acetone.
SN1 Nucleophilic Substitution: SN1 proceeds in two steps via a planar carbocation intermediate, leading to racemization (both retention and inversion). Favored by tertiary substrates and polar protic solvents like water or ethanol.
Markovnikov's Rule: In hydrohalogenation of an unsymmetrical alkene, the hydrogen atom adds to the carbon with more hydrogens already attached, so the halide bonds to the more substituted, stable carbocation.
Aromaticity (Huckel's Rule): A compound is aromatic if it is cyclic, planar, fully conjugated, and contains 4n + 2 pi electrons.`,
  },
};

export interface DamageCalcInput {
  isCorrect: boolean;
  answerTimeSec: number;
  streak: number;
  heroId: HeroId;
  mode: GameMode;
  isChargedMove?: boolean;
  allyCount?: number;
}

export interface DamageCalcResult {
  playerDamage: number;
  allyDamage: number;
  totalDamage: number;
  energyDelta: number;
  enemyCounterDamage: number;
  isCritical: boolean;
}

/**
 * Pure calculation for damage, energy charge, and enemy counter-damage per quiz turn.
 */
export function calculateQuizDamage(input: DamageCalcInput): DamageCalcResult {
  const { isCorrect, answerTimeSec, streak, heroId, mode, isChargedMove = false, allyCount = 3 } = input;

  if (!isCorrect && !isChargedMove) {
    // Wrong answer: zero damage to enemy, enemy counter-attacks (except in training where counter is minimal)
    const baseCounter = mode === 'training' ? 0 : mode === 'raid' ? 48 : 75;
    const wardenMitigation = heroId === 'verdant_warden' ? 0.75 : 1.0;
    return {
      playerDamage: 0,
      allyDamage: mode === 'raid' ? Math.round(allyCount * 22) : 0,
      totalDamage: mode === 'raid' ? Math.round(allyCount * 22) : 0,
      energyDelta: 8, // Small consolation energy for attempting
      enemyCounterDamage: Math.round(baseCounter * wardenMitigation),
      isCritical: false,
    };
  }

  const speedBonus = Math.max(0, Math.min(1, (12 - Math.max(1, answerTimeSec)) / 10));
  const isCritical = answerTimeSec <= 4.5 || isChargedMove;
  const streakMultiplier = 1 + Math.min(streak, 6) * 0.12;

  let baseDamage = isChargedMove ? 210 : 95;
  if (mode === 'raid') baseDamage = isChargedMove ? 340 : 145;

  // Hero passive bonuses
  if (heroId === 'shadow_shinobi' && answerTimeSec <= 5) {
    baseDamage *= 1.2;
  }

  const playerDamage = Math.round(baseDamage * (1 + speedBonus * 0.35) * streakMultiplier);

  // Allied classmates in Raid or Team Fight also deal coordinated damage
  let allyDamage = 0;
  if (mode === 'raid') {
    const valkyrieBoost = heroId === 'aether_valkyrie' ? 1.25 : 1.0;
    allyDamage = Math.round(allyCount * (isChargedMove ? 75 : 45) * valkyrieBoost);
  } else if (mode === 'team') {
    const valkyrieBoost = heroId === 'aether_valkyrie' ? 1.25 : 1.0;
    allyDamage = Math.round(2 * (isChargedMove ? 55 : 30) * valkyrieBoost);
  }

  // Energy gain for Pokémon GO style Charged Attack meter (0..100)
  let energyDelta = isChargedMove ? -100 : Math.round(34 + speedBonus * 14);
  if (!isChargedMove && heroId === 'arcane_scout') {
    energyDelta = Math.round(energyDelta * 1.25);
  }

  // In Raid and PvP, the boss/opponent still performs light periodic chip attacks even on correct turns
  const chipDamage = mode === 'training' || isChargedMove ? 0 : mode === 'raid' ? 18 : 22;

  return {
    playerDamage,
    allyDamage,
    totalDamage: playerDamage + allyDamage,
    energyDelta,
    enemyCounterDamage: chipDamage,
    isCritical,
  };
}

export interface BattleCombatState {
  mode: GameMode;
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  energy: number; // 0..100
  playerShields: number;
  enemyShields: number;
  playerOrbs: number;
  enemyOrbs: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  answeredCount: number;
  totalDamageDealt: number;
  teamAlphaScore: number;
  teamOmegaScore: number;
  status: 'active' | 'victory' | 'defeat';
}

export function createInitialCombatState(mode: GameMode, heroId: HeroId): BattleCombatState {
  const hero = HEROES.find((h) => h.id === heroId) ?? HEROES[0];
  const modeSpec = BATTLE_MODES[mode];
  return {
    mode,
    playerHp: hero.maxHp,
    playerMaxHp: hero.maxHp,
    enemyHp: modeSpec.enemyMaxHp,
    enemyMaxHp: modeSpec.enemyMaxHp,
    energy: 35, // Start with partial charge so player can reach Charged Move in 2 correct answers
    playerShields: modeSpec.playerShields,
    enemyShields: modeSpec.enemyShields,
    playerOrbs: modeSpec.partyOrbs,
    enemyOrbs: modeSpec.partyOrbs,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    answeredCount: 0,
    totalDamageDealt: 0,
    teamAlphaScore: 0,
    teamOmegaScore: 0,
    status: 'active',
  };
}

export interface TurnActionInput {
  isCorrect: boolean;
  answerTimeSec: number;
  heroId: HeroId;
  useShieldOnWrong?: boolean;
  isChargedMove?: boolean;
  allyCount?: number;
}

export function applyBattleTurn(state: BattleCombatState, action: TurnActionInput): {
  nextState: BattleCombatState;
  result: DamageCalcResult;
  shieldUsedByPlayer: boolean;
  shieldUsedByEnemy: boolean;
} {
  if (state.status !== 'active') {
    return {
      nextState: state,
      result: {
        playerDamage: 0,
        allyDamage: 0,
        totalDamage: 0,
        energyDelta: 0,
        enemyCounterDamage: 0,
        isCritical: false,
      },
      shieldUsedByPlayer: false,
      shieldUsedByEnemy: false,
    };
  }

  const nextStreak = action.isChargedMove
    ? state.streak
    : action.isCorrect
      ? state.streak + 1
      : 0;

  const calc = calculateQuizDamage({
    isCorrect: action.isCorrect,
    answerTimeSec: action.answerTimeSec,
    streak: nextStreak,
    heroId: action.heroId,
    mode: state.mode,
    isChargedMove: action.isChargedMove,
    allyCount: action.allyCount,
  });

  let effectiveTotalDamage = calc.totalDamage;
  let shieldUsedByEnemy = false;
  let nextEnemyShields = state.enemyShields;

  // In PvP, if player unleashes a Charged Move and enemy still has shields, enemy blocks 70% of it with a shield
  if (action.isChargedMove && state.mode === 'pvp' && nextEnemyShields > 0) {
    shieldUsedByEnemy = true;
    nextEnemyShields -= 1;
    effectiveTotalDamage = Math.round(effectiveTotalDamage * 0.35);
  }

  let effectiveCounterDamage = calc.enemyCounterDamage;
  let shieldUsedByPlayer = false;
  let nextPlayerShields = state.playerShields;

  if (!action.isCorrect && action.useShieldOnWrong && nextPlayerShields > 0) {
    shieldUsedByPlayer = true;
    nextPlayerShields -= 1;
    effectiveCounterDamage = 0;
  }

  let nextEnemyHp = Math.max(0, state.enemyHp - effectiveTotalDamage);
  let nextPlayerHp = Math.max(0, state.playerHp - effectiveCounterDamage);
  let nextEnemyOrbs = state.enemyOrbs;
  let nextPlayerOrbs = state.playerOrbs;
  let status: 'active' | 'victory' | 'defeat' = 'active';

  // Training Dummy regenerates upon reaching 0 HP so solo study can continue until deck finishes or player exits
  if (state.mode === 'training' && nextEnemyHp === 0) {
    nextEnemyHp = state.enemyMaxHp;
    nextEnemyOrbs = Math.max(1, nextEnemyOrbs);
  } else if (nextEnemyHp === 0) {
    nextEnemyOrbs = Math.max(0, nextEnemyOrbs - 1);
    status = 'victory';
  }

  if (nextPlayerHp === 0 && state.mode !== 'training') {
    nextPlayerOrbs = Math.max(0, nextPlayerOrbs - 1);
    if (nextPlayerOrbs === 0 || state.mode === 'pvp') {
      status = 'defeat';
    } else {
      // Respawn next party Pokémon/Guardian in Raid or Team mode
      nextPlayerHp = state.playerMaxHp;
    }
  }

  const nextEnergy = Math.max(0, Math.min(100, state.energy + calc.energyDelta));
  const nextCorrect = action.isChargedMove
    ? state.correctCount
    : state.correctCount + (action.isCorrect ? 1 : 0);
  const nextAnswered = action.isChargedMove ? state.answeredCount : state.answeredCount + 1;

  const alphaGain = effectiveTotalDamage;
  const omegaGain = action.isCorrect ? Math.round(effectiveCounterDamage * 2.5) : 140;

  return {
    nextState: {
      ...state,
      playerHp: nextPlayerHp,
      enemyHp: nextEnemyHp,
      energy: nextEnergy,
      playerShields: nextPlayerShields,
      enemyShields: nextEnemyShields,
      playerOrbs: nextPlayerOrbs,
      enemyOrbs: nextEnemyOrbs,
      streak: nextStreak,
      maxStreak: Math.max(state.maxStreak, nextStreak),
      correctCount: nextCorrect,
      answeredCount: nextAnswered,
      totalDamageDealt: state.totalDamageDealt + effectiveTotalDamage,
      teamAlphaScore: state.teamAlphaScore + alphaGain,
      teamOmegaScore: state.teamOmegaScore + omegaGain,
      status,
    },
    result: {
      ...calc,
      totalDamage: effectiveTotalDamage,
      enemyCounterDamage: effectiveCounterDamage,
    },
    shieldUsedByPlayer,
    shieldUsedByEnemy,
  };
}

/**
 * Deterministic fallback parser that turns any pasted study notes / PDF text into structured quiz questions
 * if the Gemini API key is not configured or offline.
 */
export function parseNotesIntoFallbackQuestions(
  topicTitle: string,
  rawNotes: string,
  targetCount: number = 10
): QuizQuestion[] {
  const cleaned = rawNotes.trim();
  const sentences = cleaned
    .split(/(?:[.!?\n]+)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15);

  if (sentences.length === 0) {
    return DEFAULT_QUIZ_DECKS[0].questions;
  }

  const questions: QuizQuestion[] = [];
  const distractorPool = [
    'It operates strictly in constant O(1) space without state transitions.',
    'It bypasses cellular or system regulation by disabling feedback loops.',
    'It only applies under vacuum zero-kelvin equilibrium conditions.',
    'It reverses the primary causal direction described in the lecture notes.',
    'It substitutes static compile-time constants for dynamic runtime values.',
    'It assumes indefinite scaling without resource or latency constraints.',
    'It synchronizes through asynchronous polling rather than event-driven dispatch.',
  ];

  const totalToGenerate = Math.min(Math.max(4, targetCount), 100);
  for (let i = 0; i < totalToGenerate; i++) {
    const fact = sentences[i % sentences.length];
    const colonIdx = fact.indexOf(':');
    let concept = topicTitle || 'Study Concept';
    let statement = fact;

    if (colonIdx > 2 && colonIdx < 45) {
      concept = fact.slice(0, colonIdx).trim();
      statement = fact.slice(colonIdx + 1).trim();
    }

    const correctOption =
      statement.length > 115 ? `${statement.slice(0, 112).trim()}...` : statement;
    const d1 = distractorPool[i % distractorPool.length];
    const d2 = distractorPool[(i + 1) % distractorPool.length];
    const d3 = distractorPool[(i + 2) % distractorPool.length];

    const options: [string, string, string, string] = [d1, d2, d3, d1];
    const correctIndex = i % 4;
    const wrongChoices = [d1, d2, d3];
    let wIdx = 0;
    for (let slot = 0; slot < 4; slot++) {
      if (slot === correctIndex) {
        options[slot] = correctOption;
      } else {
        options[slot] = wrongChoices[wIdx++];
      }
    }

    questions.push({
      id: `custom-${Date.now()}-${i}`,
      question:
        colonIdx > 2 && colonIdx < 45
          ? `Based on your study notes, which statement accurately describes "${concept}"? (Q${i + 1})`
          : `According to your "${topicTitle}" review notes (Point #${i + 1}), which principle holds true?`,
      options,
      correctIndex,
      explanation: `From your notes: ${fact}`,
      conceptTag: concept.slice(0, 28),
      difficulty: i % 3 === 2 ? 'Advanced' : 'Standard',
    });
  }

  return questions;
}

export interface CircularPreviewTransform {
  signedOffset: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  zIndex: number;
  isMiddleMaximized: boolean;
  isVisible: boolean;
}

/**
 * Pure helper computing smooth circular slow-motion orbital coordinates for each game preview card.
 * `orbitPhase` is a continuous floating-point index in `[0, total)` that advances slowly over time.
 * Cards move strictly in one direction along the right-side circular arc; back-returning cards (`|offset| >= 1.48`)
 * are hidden (`opacity: 0, isVisible: false`) so no card is ever seen moving in reverse at the back.
 */
export function computeCircularPreviewOrbit(
  index: number,
  total: number,
  orbitPhase: number
): CircularPreviewTransform {
  const safeTotal = Math.max(1, total);
  const normalizedPhase = ((orbitPhase % safeTotal) + safeTotal) % safeTotal;
  let signedOffset = index - normalizedPhase;
  if (signedOffset > safeTotal / 2) signedOffset -= safeTotal;
  if (signedOffset < -safeTotal / 2) signedOffset += safeTotal;

  const absOffset = Math.abs(signedOffset);

  // Shifted to the right side of the viewport; middle card sits at x = 44, top/bottom cards curve further right (x = 112)
  const x = Math.round(44 + Math.pow(signedOffset, 2) * 68);
  // Larger, tall enough to reach near both screen edges while the center card stays in front.
  const y = Math.round(signedOffset * 300);

  // Smooth bell-curve maximization in the middle (offset === 0 -> scale 1.0, offset === ±1 -> scale ~0.66)
  const centerWeight = Math.exp(-Math.pow(absOffset / 0.9, 2));
  const scale = Number((0.52 + 0.48 * centerWeight).toFixed(3));

  // Hide cards on the return path at the back (|offset| >= 1.48) so the last picture is never seen going upward/downward at the back
  let opacity = 1;
  if (absOffset >= 1.48) {
    opacity = 0;
  } else if (absOffset > 1.05) {
    opacity = Number(((1.48 - absOffset) / (1.48 - 1.05)).toFixed(3));
  }

  const zIndex = Math.round(50 - absOffset * 15);
  const isMiddleMaximized = absOffset < 0.45;
  const isVisible = opacity > 0.01;

  return {
    signedOffset: Number(signedOffset.toFixed(3)),
    x,
    y,
    scale,
    opacity,
    zIndex,
    isMiddleMaximized,
    isVisible,
  };
}

