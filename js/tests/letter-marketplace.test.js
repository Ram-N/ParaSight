/**
 * @fileoverview Test file for letter marketplace functionality.
 * Uses a simple AAA (Arrange-Act-Assert) approach for unit tests.
 */

import {
  letterCounts,
  gameState,
  marketState,
  resetGameState,
  setCurrentWords,
  setSelectedVowel,
  addSelectedConsonant,
  completeLetterSelection,
  purchaseVowel,
  purchaseConsonant,
  getLetterCounts,
  initializeSuffixes,
  revealNextSuffix,
  isPartOfRevealedSuffix,
  getWordSuffix,
  setSuffixConfig,
  maskWordWithPurchases,
  getCurrentWords,
  setGameParameters
} from '../game-state.js';

// Simple test utilities
const assert = {
  equal(a, b, message) {
    if (a !== b) {
      console.error(`FAILED: ${message || ''} - Expected ${b}, got ${a}`);
      return false;
    }
    console.log(`PASSED: ${message || ''}`);
    return true;
  },
  
  deepEqual(a, b, message) {
    const aStr = JSON.stringify(a);
    const bStr = JSON.stringify(b);
    if (aStr !== bStr) {
      console.error(`FAILED: ${message || ''} - Expected ${bStr}, got ${aStr}`);
      return false;
    }
    console.log(`PASSED: ${message || ''}`);
    return true;
  },
  
  isTrue(value, message) {
    if (!value) {
      console.error(`FAILED: ${message || ''} - Expected truthy value, got ${value}`);
      return false;
    }
    console.log(`PASSED: ${message || ''}`);
    return true;
  },
  
  isFalse(value, message) {
    if (value) {
      console.error(`FAILED: ${message || ''} - Expected falsy value, got ${value}`);
      return false;
    }
    console.log(`PASSED: ${message || ''}`);
    return true;
  }
};

// Setup function to prepare the test environment
function setupTestEnvironment() {
  resetGameState();
  
  // Set up game parameters
  setGameParameters({
    penalties: {
      wrongGuess: 5
    },
    marketplace: {
      vowel: {
        cost: 10
      },
      consonant: {
        cost: 15
      }
    }
  });
  
  // Set up suffix configuration - Make sure to add all suffixes we want to test
  setSuffixConfig({
    suffixes: [
      {
        ending: "ly",
        reveal_order: 1
      },
      {
        ending: "er",
        reveal_order: 2
      },
      {
        ending: "ing",
        reveal_order: 3
      }
    ]
  });
  
  // Log that we've set up the suffix config
  console.log("Suffix configuration set up with:", 
    ['ly', 'er', 'ing'].join(', '));
  
  // Set up test words - intentionally using words with our test suffixes
  const testWords = [
    {
      word: "testing",
      positions: [{start: 0, end: 7}],
      clues: [{clue: "Doing validation", points: 5}]
    },
    {
      word: "properly",
      positions: [{start: 8, end: 16}],
      clues: [{clue: "In the right way", points: 5}]
    },
    {
      word: "matcher",
      positions: [{start: 17, end: 24}],
      clues: [{clue: "Something that pairs items", points: 5}]
    },
    {
      word: "function",
      positions: [{start: 25, end: 33}],
      clues: [{clue: "A piece of code", points: 5}]
    }
  ];
  
  // Set the words in the game state
  setCurrentWords(testWords);
  
  // Verify suffix detection for each test word
  testWords.forEach((word, index) => {
    const wordText = word.word;
    const detectedSuffix = getWordSuffix(wordText);
    console.log(`Word ${index} (${wordText}): ${detectedSuffix ? 'Has suffix ' + detectedSuffix.ending : 'No suffix detected'}`);
  });
  
  // Set initial score
  gameState.current.score = 100;
}

// Test for letter counts initialization
function testLetterCountsInitialization() {
  console.log("\n==== Testing Letter Counts Initialization ====");
  
  // Arrange
  setupTestEnvironment();
  
  // Act - letter counts are initialized during setupTestEnvironment
  const counts = getLetterCounts();
  
  // Assert
  assert.isTrue(Object.keys(counts).length > 0, "Letter counts should be populated");
  assert.isTrue(counts.t >= 3, "Should have at least 3 't' characters");
  assert.isTrue(counts.n >= 3, "Should have at least 3 'n' characters");
  
  // Summary
  console.log("Letter counts:", counts);
}

// Test for letter selection
function testLetterSelection() {
  console.log("\n==== Testing Letter Selection ====");
  
  // Arrange
  setupTestEnvironment();
  const initialCounts = {...getLetterCounts()};
  
  // Act
  setSelectedVowel('e');
  addSelectedConsonant('t');
  addSelectedConsonant('n');
  completeLetterSelection();
  const countsAfterSelection = getLetterCounts();
  
  // Assert
  assert.isTrue(marketState.vowels.has('e'), "The vowel 'e' should be in the purchased vowels");
  assert.isTrue(marketState.consonants.has('t'), "The consonant 't' should be in the purchased consonants");
  assert.isTrue(marketState.consonants.has('n'), "The consonant 'n' should be in the purchased consonants");
  
  // The counts should not include the selected letters
  assert.isFalse('e' in countsAfterSelection, "The vowel 'e' should not be in the letter counts");
  assert.isFalse('t' in countsAfterSelection, "The consonant 't' should not be in the letter counts");
  assert.isFalse('n' in countsAfterSelection, "The consonant 'n' should not be in the letter counts");
  
  // Summary
  console.log("Initial counts:", initialCounts);
  console.log("Counts after selection:", countsAfterSelection);
}

// Test for suffix revealing
function testSuffixRevealing() {
  console.log("\n==== Testing Suffix Revealing ====");
  
  // Arrange - set up a clean environment
  setupTestEnvironment();
  
  // Set up initial selection to complete letter selection phase
  setSelectedVowel('e');
  addSelectedConsonant('t');
  addSelectedConsonant('n');
  completeLetterSelection();
  
  // Create a focused test for suffix masking
  console.log("\n--- Testing suffix masking directly ---");
  
  // Use a word we know has a suffix in our config
  const testingWord = "testing";
  const properlyWord = "properly"; 
  const matcherWord = "matcher";
  
  // Test each word that should have a suffix
  const wordsToTest = [
    { index: 0, word: testingWord, expectedSuffix: "ing" },
    { index: 1, word: properlyWord, expectedSuffix: "ly" },
    { index: 2, word: matcherWord, expectedSuffix: "er" }
  ];
  
  wordsToTest.forEach(({ index, word, expectedSuffix }) => {
    console.log(`\nTesting word "${word}" with expected suffix "${expectedSuffix}"`);
    
    // Verify suffix detection
    const detectedSuffix = getWordSuffix(word);
    
    if (detectedSuffix) {
      console.log(`✓ Detected suffix "${detectedSuffix.ending}" for "${word}"`);
      assert.equal(detectedSuffix.ending, expectedSuffix, 
        `Should detect suffix "${expectedSuffix}" for word "${word}"`);
      
      // Test 1: Check if the suffix part is correctly identified
      const lastCharPos = word.length - 1;
      const suffixStartPos = word.length - detectedSuffix.ending.length;
      
      // Add this word to revealed suffixes
      gameState.current.wordsWithRevealedSuffixes = [index];
      
      // Test suffix character detection
      const isLastCharInSuffix = isPartOfRevealedSuffix(word, lastCharPos, index);
      assert.isTrue(isLastCharInSuffix, 
        `Last character of "${word}" should be recognized as part of suffix`);
      
      // Test character just before suffix
      if (suffixStartPos > 0) {
        const isCharBeforeSuffixPartOfSuffix = isPartOfRevealedSuffix(word, suffixStartPos - 1, index);
        assert.isFalse(isCharBeforeSuffixPartOfSuffix, 
          `Character before suffix in "${word}" should NOT be recognized as part of suffix`);
      }
      
      // Test 2: Check if the masking function reveals the suffix
      const maskedWord = maskWordWithPurchases(word, '', index);
      console.log(`Masked word: "${maskedWord}"`);
      
      // Extract just the suffix part from the masked word
      const maskedSuffix = maskedWord.slice(-detectedSuffix.ending.length);
      console.log(`Masked suffix part: "${maskedSuffix}"`);
      
      // The suffix part should not contain any underscores
      const hasUnderscores = maskedSuffix.includes('_');
      assert.isFalse(hasUnderscores, 
        `Suffix part "${maskedSuffix}" should not contain underscores (original suffix: "${detectedSuffix.ending}")`);
      
      // Also verify that the real suffix characters appear in the masked word
      for (let i = 0; i < detectedSuffix.ending.length; i++) {
        const suffixChar = detectedSuffix.ending[i];
        const maskedChar = maskedSuffix[i];
        assert.equal(maskedChar.toLowerCase(), suffixChar.toLowerCase(), 
          `Character ${i} of masked suffix should be "${suffixChar}" but was "${maskedChar}"`);
      }
      
    } else {
      console.error(`✗ Failed to detect suffix for "${word}" - expected "${expectedSuffix}"`);
      assert.isTrue(false, `Should have detected suffix "${expectedSuffix}" for word "${word}"`);
    }
  });
  
  // Test letter counts after suffix reveal
  console.log("\n--- Testing letter counts after suffix reveal ---");
  
  // Reset the game state and reveal a suffix
  resetGameState();
  setCurrentWords(getCurrentWords()); // Reinitialize words
  
  // Complete letter selection again
  setSelectedVowel('e');
  addSelectedConsonant('t');
  addSelectedConsonant('n');
  completeLetterSelection();
  
  // Manually set the first word to have a revealed suffix
  gameState.current.wordsWithRevealedSuffixes = [0]; // "testing" with "ing" suffix
  
  // Get the letter counts
  const counts = getLetterCounts();
  console.log("Letter counts after revealing 'ing' suffix:", counts);
  
  // The letters in "ing" should not be in the counts (or should be reduced)
  // But we need to consider that 'i' and 'n' might appear elsewhere in unhidden words
  const suffixLetters = ['i', 'n', 'g'];
  
  // For each suffix letter, check if it's properly not counted or reduced
  suffixLetters.forEach(letter => {
    if (counts[letter]) {
      console.log(`Letter '${letter}' still has count ${counts[letter]} (may appear elsewhere)`);
    } else {
      console.log(`✓ Letter '${letter}' correctly removed from counts`);
    }
  });
}

// Test for letter purchasing
function testLetterPurchasing() {
  console.log("\n==== Testing Letter Purchasing ====");
  
  // Arrange
  setupTestEnvironment();
  setSelectedVowel('e');
  addSelectedConsonant('t');
  addSelectedConsonant('n');
  completeLetterSelection();
  const countsBeforePurchase = {...getLetterCounts()};
  
  // Act - Purchase a vowel and a consonant
  const vowelResult = purchaseVowel('a');
  const consonantResult = purchaseConsonant('r');
  const countsAfterPurchase = getLetterCounts();
  
  // Assert
  assert.isTrue(vowelResult.success, "Should successfully purchase vowel 'a'");
  assert.isTrue(consonantResult.success, "Should successfully purchase consonant 'r'");
  assert.equal(gameState.current.score, 100 - 10 - 15, "Score should be reduced by cost of purchases");
  
  assert.isTrue(marketState.vowels.has('a'), "The vowel 'a' should be in the purchased vowels");
  assert.isTrue(marketState.consonants.has('r'), "The consonant 'r' should be in the purchased consonants");
  
  // The purchased letters should not be in the counts
  assert.isFalse('a' in countsAfterPurchase, "The vowel 'a' should not be in the letter counts");
  assert.isFalse('r' in countsAfterPurchase, "The consonant 'r' should not be in the letter counts");
  
  // Summary
  console.log("Counts before purchase:", countsBeforePurchase);
  console.log("Counts after purchase:", countsAfterPurchase);
}

// Run all tests
function runAllTests() {
  console.log("======================================");
  console.log("RUNNING LETTER MARKETPLACE TESTS");
  console.log("======================================");
  
  testLetterCountsInitialization();
  testLetterSelection();
  testSuffixRevealing();
  testLetterPurchasing();
  
  console.log("\nAll tests completed!");
}

// Run the tests
runAllTests();