/**
 * @fileoverview Test file for navigation and game initialization functionality.
 * Tests arrow navigation, game reset, and letter selection flow.
 */

import {
  gameState,
  marketState,
  resetGameState,
  setCurrentWords,
  setCurrentParagraph,
  setGameParameters,
  isInitPhase,
  isSelectionComplete,
  setSelectedVowel,
  addSelectedConsonant,
  completeLetterSelection,
  showInitialClues,
  getShownWordIndices,
  getCurrentWords
} from '../game-state.js';

// Simple test utilities
const assert = {
  equal(a, b, message) {
    if (a !== b) {
      throw new Error(`${message}: expected ${b}, got ${a}`);
    }
  },
  isTrue(condition, message) {
    if (!condition) {
      throw new Error(`${message}: expected true, got false`);
    }
  },
  isFalse(condition, message) {
    if (condition) {
      throw new Error(`${message}: expected false, got true`);
    }
  },
  greaterThan(a, b, message) {
    if (a <= b) {
      throw new Error(`${message}: expected ${a} > ${b}`);
    }
  }
};

// Test data
const testParagraph = {
  id: "test-paragraph",
  title: "Test Paragraph",
  date: "2025-07-05",
  text: "The quick brown fox jumps over the lazy dog.",
  hiddenWords: [
    {
      word: "quick",
      difficulty: "Easy",
      clues: [
        { type: "Indirect", clue: "Fast moving", points: 4 },
        { type: "Suggestive", clue: "Speedy", points: 2 },
        { type: "Straight", clue: "Not slow", points: 1 }
      ]
    },
    {
      word: "brown",
      difficulty: "Easy", 
      clues: [
        { type: "Indirect", clue: "Color of earth", points: 4 },
        { type: "Suggestive", clue: "Dark color", points: 2 },
        { type: "Straight", clue: "Not black or white", points: 1 }
      ]
    },
    {
      word: "jumps",
      difficulty: "Medium",
      clues: [
        { type: "Indirect", clue: "Leaps through air", points: 5 },
        { type: "Suggestive", clue: "Bounds", points: 3 },
        { type: "Straight", clue: "Hops", points: 1 }
      ]
    },
    {
      word: "lazy",
      difficulty: "Easy",
      clues: [
        { type: "Indirect", clue: "Lacks motivation", points: 4 },
        { type: "Suggestive", clue: "Inactive", points: 2 },
        { type: "Straight", clue: "Not energetic", points: 1 }
      ]
    }
  ]
};

// Test parameters
const testParameters = {
  penalties: { wrongGuess: 10 },
  marketplace: {
    vowel: { cost: 25 },
    consonant: { cost: 15 }
  }
};

function runTest(testName, testFunction) {
  try {
    console.log(`Running test: ${testName}`);
    testFunction();
    console.log(`✓ ${testName} passed`);
    return true;
  } catch (error) {
    console.error(`✗ ${testName} failed: ${error.message}`);
    return false;
  }
}

// Test 1: Game state resets properly
function testGameStateReset() {
  // Setup initial state
  gameState.current.score = 50;
  gameState.current.chosenVowel = "e";
  gameState.current.initPhase = false;
  marketState.selectionComplete = true;
  marketState.vowels.add("e");
  marketState.consonants.add("t");

  // Reset
  resetGameState();

  // Verify reset
  assert.equal(gameState.current.score, 100, "Score should reset to 100");
  assert.equal(gameState.current.chosenVowel, "", "Chosen vowel should be empty");
  assert.isTrue(gameState.current.initPhase, "Should be in init phase");
  assert.isFalse(marketState.selectionComplete, "Selection should not be complete");
  assert.equal(marketState.vowels.size, 0, "Vowels should be cleared");
  assert.equal(marketState.consonants.size, 0, "Consonants should be cleared");
}

// Test 2: Initial clues are shown correctly
function testInitialCluesDisplay() {
  // Setup
  resetGameState();
  setGameParameters(testParameters);
  setCurrentParagraph(testParagraph);
  
  // Prepare words with positions
  const wordsWithPositions = testParagraph.hiddenWords.map(word => ({
    ...word,
    found: false,
    positions: [{ start: 0, end: word.word.length }]
  }));
  
  setCurrentWords(wordsWithPositions);

  // Show initial clues
  showInitialClues();
  
  const shownIndices = getShownWordIndices();
  
  // Verify
  assert.equal(shownIndices.length, 3, "Should show 3 initial clues");
  assert.isTrue(shownIndices.every(index => index >= 0 && index < 4), "All indices should be valid");
}

// Test 3: Letter selection flow works correctly
function testLetterSelectionFlow() {
  // Setup
  resetGameState();
  setGameParameters(testParameters);
  setCurrentParagraph(testParagraph);
  
  const wordsWithPositions = testParagraph.hiddenWords.map(word => ({
    ...word,
    found: false,
    positions: [{ start: 0, end: word.word.length }]
  }));
  
  setCurrentWords(wordsWithPositions);

  // Verify initial state
  assert.isTrue(isInitPhase(), "Should start in init phase");
  assert.isFalse(isSelectionComplete(), "Selection should not be complete initially");

  // Select letters
  setSelectedVowel("e");
  addSelectedConsonant("t");
  addSelectedConsonant("r");

  // Complete selection
  completeLetterSelection();

  // Verify completion
  assert.isFalse(isInitPhase(), "Should exit init phase");
  assert.isTrue(isSelectionComplete(), "Selection should be complete");
  assert.isTrue(marketState.vowels.has("e"), "Vowel should be in market state");
  assert.isTrue(marketState.consonants.has("t"), "First consonant should be in market state");
  assert.isTrue(marketState.consonants.has("r"), "Second consonant should be in market state");
}

// Test 4: Game properly handles navigation date changes
function testNavigationReset() {
  // Setup a game in progress
  resetGameState();
  setGameParameters(testParameters);
  setCurrentParagraph(testParagraph);
  
  const wordsWithPositions = testParagraph.hiddenWords.map(word => ({
    ...word,
    found: false,
    positions: [{ start: 0, end: word.word.length }]
  }));
  
  setCurrentWords(wordsWithPositions);

  // Complete letter selection and start game
  setSelectedVowel("a");
  addSelectedConsonant("n");
  addSelectedConsonant("s");
  completeLetterSelection();
  showInitialClues();

  // Verify game is in progress
  assert.isFalse(isInitPhase(), "Game should be out of init phase");
  assert.isTrue(isSelectionComplete(), "Selection should be complete");
  assert.greaterThan(getShownWordIndices().length, 0, "Should have shown clues");

  // Simulate navigation (reset for new date)
  resetGameState();

  // Verify complete reset
  assert.isTrue(isInitPhase(), "Should be back in init phase");
  assert.isFalse(isSelectionComplete(), "Selection should not be complete");
  assert.equal(getShownWordIndices().length, 0, "Should have no shown clues");
  assert.equal(marketState.vowels.size, 0, "Market vowels should be cleared");
  assert.equal(marketState.consonants.size, 0, "Market consonants should be cleared");
}

// Test 5: Words are properly initialized with required fields
function testWordInitialization() {
  resetGameState();
  setCurrentParagraph(testParagraph);
  
  const wordsWithPositions = testParagraph.hiddenWords.map(word => ({
    ...word,
    found: false,
    positions: [{ start: 0, end: word.word.length }]
  }));
  
  setCurrentWords(wordsWithPositions);
  
  const currentWords = getCurrentWords();
  
  // Verify each word has required fields
  currentWords.forEach((word, index) => {
    assert.isFalse(word.found, `Word ${index} should not be found initially`);
    assert.isTrue(Array.isArray(word.positions), `Word ${index} should have positions array`);
    assert.isTrue(Array.isArray(word.clues), `Word ${index} should have clues array`);
    assert.greaterThan(word.clues.length, 0, `Word ${index} should have at least one clue`);
  });
}

// Run all tests
export function runNavigationTests() {
  console.log("🚀 Starting Navigation Tests...");
  
  const tests = [
    ["Game State Reset", testGameStateReset],
    ["Initial Clues Display", testInitialCluesDisplay], 
    ["Letter Selection Flow", testLetterSelectionFlow],
    ["Navigation Reset", testNavigationReset],
    ["Word Initialization", testWordInitialization]
  ];

  let passed = 0;
  let total = tests.length;

  tests.forEach(([name, testFn]) => {
    if (runTest(name, testFn)) {
      passed++;
    }
  });

  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log("🎉 All navigation tests passed!");
  } else {
    console.log(`❌ ${total - passed} tests failed`);
  }
  
  return passed === total;
}

// Auto-run tests if this script is executed directly
if (typeof window !== 'undefined') {
  window.runNavigationTests = runNavigationTests;
}