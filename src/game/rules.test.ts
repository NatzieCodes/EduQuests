import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateQuizDamage,
  createInitialCombatState,
  applyBattleTurn,
  parseNotesIntoFallbackQuestions,
  computeCircularPreviewOrbit,
  BATTLE_MODES,
  HEROES,
} from './rules';

test('calculateQuizDamage rewards fast correct answers and increments energy', () => {
  const fastHit = calculateQuizDamage({
    isCorrect: true,
    answerTimeSec: 2.5,
    streak: 3,
    heroId: 'shadow_shinobi',
    mode: 'raid',
  });

  const slowHit = calculateQuizDamage({
    isCorrect: true,
    answerTimeSec: 11.0,
    streak: 1,
    heroId: 'shadow_shinobi',
    mode: 'raid',
  });

  assert.equal(fastHit.isCritical, true);
  assert.ok(fastHit.totalDamage > slowHit.totalDamage, 'Fast answer should deal more damage than slow answer');
  assert.ok(fastHit.energyDelta >= 34, 'Energy delta should charge special meter');
});

test('wrong answer deals 0 player damage and triggers enemy counter-attack in PvP', () => {
  const miss = calculateQuizDamage({
    isCorrect: false,
    answerTimeSec: 6.0,
    streak: 0,
    heroId: 'aether_valkyrie',
    mode: 'pvp',
  });

  assert.equal(miss.playerDamage, 0);
  assert.equal(miss.totalDamage, 0);
  assert.ok(miss.enemyCounterDamage > 0, 'Enemy should counter-attack on wrong PvP answer');
});

test('applyBattleTurn depletes enemy HP and triggers victory when boss HP hits 0', () => {
  const initial = createInitialCombatState('pvp', 'shadow_shinobi');
  const nearVictoryState = {
    ...initial,
    enemyHp: 80,
    energy: 100,
  };

  const { nextState, result } = applyBattleTurn(nearVictoryState, {
    isCorrect: true,
    answerTimeSec: 3.0,
    heroId: 'shadow_shinobi',
  });

  assert.ok(result.totalDamage >= 80);
  assert.equal(nextState.enemyHp, 0);
  assert.equal(nextState.status, 'victory');
  assert.equal(nextState.correctCount, 1);
});

test('applyBattleTurn uses Protect Shield in PvP to block enemy counter-attack', () => {
  const initial = createInitialCombatState('pvp', 'verdant_warden');
  assert.equal(initial.playerShields, 2);

  const { nextState, shieldUsedByPlayer } = applyBattleTurn(initial, {
    isCorrect: false,
    answerTimeSec: 5.0,
    heroId: 'verdant_warden',
    useShieldOnWrong: true,
  });

  assert.equal(shieldUsedByPlayer, true);
  assert.equal(nextState.playerShields, 1);
  assert.equal(nextState.playerHp, initial.playerMaxHp, 'Shield should block all counter-attack damage');
});

test('parseNotesIntoFallbackQuestions extracts structured quiz questions from pasted study notes', () => {
  const sampleNotes = `
    Mitosis: Cell division that results in two genetically identical diploid daughter cells.
    Meiosis: Reduction division producing four genetically diverse haploid gametes.
    Ribosomes: Molecular machines responsible for translating mRNA sequences into polypeptide chains.
    Mitochondria: Double-membrane organelles that generate most of the cell supply of ATP.
  `;

  const questions = parseNotesIntoFallbackQuestions('Cell Division & Organelles', sampleNotes, 10);
  assert.equal(questions.length, 10);
  for (const q of questions) {
    assert.equal(q.options.length, 4);
    assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
    assert.ok(q.options[q.correctIndex].length > 10);
  }
});

test('all 4 battle modes and 4 heroes have valid stats', () => {
  assert.equal(HEROES.length, 4);
  assert.ok(BATTLE_MODES.raid.enemyCp === 39601);
  assert.ok(BATTLE_MODES.pvp.enemyCp === 1497);
  assert.ok(BATTLE_MODES.training.timeLimitSec === 0);
});

test('computeCircularPreviewOrbit maximizes middle card, shifts right, and hides back wrap-around cards', () => {
  const middle = computeCircularPreviewOrbit(0, 5, 0);
  const topNeighbor = computeCircularPreviewOrbit(4, 5, 0); // signedOffset = -1
  const bottomNeighbor = computeCircularPreviewOrbit(1, 5, 0); // signedOffset = +1
  const backBottom = computeCircularPreviewOrbit(2, 5, 0); // signedOffset = +2 (back wrap-around)

  assert.equal(middle.isMiddleMaximized, true);
  assert.equal(middle.isVisible, true);
  assert.equal(middle.scale, 1);
  assert.equal(middle.y, 0);
  assert.ok(middle.x > 0, 'Middle card should be shifted to the right');

  // Neighbor cards are symmetric vertically and curve further right along the circular arc
  assert.equal(topNeighbor.isMiddleMaximized, false);
  assert.equal(bottomNeighbor.isMiddleMaximized, false);
  assert.equal(topNeighbor.isVisible, true);
  assert.equal(bottomNeighbor.isVisible, true);
  assert.equal(topNeighbor.y, -bottomNeighbor.y);
  assert.ok(bottomNeighbor.x > middle.x, 'Orbiting neighbor should curve rightwards relative to middle apex');
  assert.ok(middle.scale > bottomNeighbor.scale);

  // Back wrap-around cards (|signedOffset| >= 1.48) are hidden so no card is shown going up/down at the back
  assert.equal(backBottom.opacity, 0);
  assert.equal(backBottom.isVisible, false);
});

