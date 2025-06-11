/**
 * @fileoverview Core game state management module for ParaSight.
 * Manages the game's state using a centralized object with getters and setters.
 * @module game-state
 */

/**
 * @typedef {Object} GameWord
 * @property {string} word - The actual word
 * @property {string} clue - Primary clue for the word
 * @property {string} [clue2] - Secondary clue for the word
 * @property {number} points - Points awarded for finding the word
 * @property {boolean} found - Whether the word has been found
 * @property {Array<{start: number, end: number}>} positions - Word positions in text
 */

/**
 * @typedef {Object} GameParagraph
 * @property {number} id - Unique identifier
 * @property {string} text - The paragraph text
 * @property {Array<GameWord>} hiddenWords - Words to find in the paragraph
 */

/**
 * @typedef {Object} MarketplaceVowelConfig
 * @property {number} cost - Cost to purchase a vowel
 */

/**
 * @typedef {Object} MarketplaceConsonantConfig
 * @property {number} cost - Cost to reveal a consonant
 */

/**
 * @typedef {Object} MarketplaceConfig
 * @property {MarketplaceVowelConfig} vowel - Vowel purchase configuration
 * @property {MarketplaceConsonantConfig} consonant - Consonant reveal configuration
 */

/**
 * @typedef {Object} GamePenalties
 * @property {number} wrongGuess - Points deducted for wrong guesses
 */

/**
 * @typedef {Object} GameParameters
 * @property {GamePenalties} penalties - Game penalties configuration
 * @property {MarketplaceConfig} marketplace - Marketplace configuration
 * @property {Object} styles - UI styling configuration
 */

/**
 * @typedef {Object} GameResult
 * @property {boolean} success - Whether the guess was correct
 * @property {boolean} gameComplete - Whether all words have been found
 * @property {number} pointsEarned - Points earned for the guess
 */

/**
 * @typedef {Object} GameState
 * @property {{
 *   paragraph: GameParagraph | null,
 *   chosenVowel: string,
 *   words: GameWord[],
 *   score: number,
 *   maxScore: number
 * }} current
 * @property {{
 *   parameters: GameParameters | null,
 *   paragraphs: GameParagraph[] | null
 * }} config
 */

// Interface definitions moved to JSDoc types above

/** @type {Record<string, number>} */
export const letterCounts = {}; // Tracks count of each letter remaining in hidden words

/** @type {GameState} */
export const gameState = {
  current: {
    paragraph: null, // Currently displayed paragraph
    chosenVowel: "", // Vowel selected by player for revelation
    words: [], // Array of word objects with found status
    score: 0, // Player's current score
    maxScore: 0, // Maximum achievable score for current paragraph
  },
  config: {
    parameters: null, // Game rules like penalties
    paragraphs: null, // All available game content
  },
};

// Marketplace state
export const marketState = {
  /** @type {Set<string>} */
  vowels: new Set(), // Set of purchased vowels
  /** @type {Set<string>} */
  consonants: new Set(), // Set of purchased consonants
  /** @type {number} */
  hints: 0, // Number of hints purchased
};

/** @type {{[key: string]: number}} */
export const letterState = {
  counts: {}, // Tracks count of each letter remaining in hidden words
};

// Getters
/**
 * Gets the current active paragraph
 * @returns {GameParagraph|null} The current paragraph object or null if not set
 */
export function getCurrentParagraph() {
  return gameState.current.paragraph;
}

/**
 * Gets the game parameters including penalties and rules
 * @returns {GameParameters|null} Game parameters object or null if not loaded
 */
export function getGameParameters() {
  return gameState.config.parameters;
}

/**
 * Gets all available paragraphs for the game
 * @returns {Array<GameParagraph>|null} Array of paragraph objects or null if not loaded
 */
export function getAllParagraphs() {
  return gameState.config.paragraphs;
}

/**
 * Gets the currently chosen vowel by the player
 * @returns {string} The selected vowel
 */
export function getChosenVowel() {
  return gameState.current.chosenVowel;
}

/**
 * Gets the list of words for the current paragraph
 * @returns {Array<GameWord>} Array of word objects with their current state
 */
export function getCurrentWords() {
  return gameState.current.words || [];
}

/**
 * Gets the current score of the player
 * @returns {number} The current score
 */
export function getCurrentScore() {
  return gameState.current.score;
}

/**
 * Gets the maximum score possible in the current game session
 * @returns {number} The maximum score
 */
export function getMaxScore() {
  return gameState.current.maxScore;
}

// Setters
/**
 * Sets the current active paragraph
 * @param {GameParagraph} paragraph - The paragraph object to set as current
 */
export function setCurrentParagraph(paragraph) {
  gameState.current.paragraph = paragraph;
}

/**
 * Sets the game parameters including rules and penalties
 * @param {GameParameters} params - The parameters object to configure the game
 */
export function setGameParameters(params) {
  gameState.config.parameters = params;
}

/**
 * Sets all available paragraphs for the game
 * @param {Array<GameParagraph>} paragraphs - Array of paragraph objects to be set
 */
export function setAllParagraphs(paragraphs) {
  gameState.config.paragraphs = paragraphs;
}

/**
 * Sets the chosen vowel for the current game session
 * @param {string} vowel - The vowel to be set as chosen
 */
export function setVowel(vowel) {
  gameState.current.chosenVowel = vowel;
}

/**
 * Sets the list of words for the current paragraph
 * @param {Array<GameWord>} words - Array of word objects to be set
 */
export function setCurrentWords(words) {
  gameState.current.words = words;
  gameState.current.score = 100; // Start with 100 points
  initializeLetterCounts();
}

/**
 * Sets the current score of the player
 * @param {number} score - The score value to be set
 */
export function setScore(score) {
  gameState.current.score = score;
}

/**
 * Sets the maximum score for the current game session
 * @param {number} score - The maximum score value to be set
 */
export function setMaxScore(score) {
  gameState.current.maxScore = score;
}

// Game logic functions
/**
 * Masks a word by replacing non-vowel characters with dashes
 * @param {string} word - The word to mask
 * @param {string} vowel - The vowel to reveal in the word
 * @returns {string} The masked word with only the specified vowel visible
 */
export function maskWord(word, vowel) {
  return word.replace(/[^\W_]/gi, (char) => {
    if (char.toLowerCase() === vowel) return char;
    return "-";
  });
}

/**
 * Finds all positions of a word in a text
 * @param {string} text - The text to search in
 * @param {string} word - The word to find
 * @returns {Array<{start: number, end: number}>} Array of position objects
 */
export function findWordPositions(text, word) {
  const positions = [];
  const regex = new RegExp(`\\b${word}\\b`, "gi");
  let match;
  while ((match = regex.exec(text)) !== null) {
    positions.push({
      start: match.index,
      end: match.index + word.length,
    });
  }
  return positions;
}

/**
 * Checks if all words have been found
 * @returns {boolean} True if game is complete, false otherwise
 */
export function isGameComplete() {
  const complete = gameState.current.words.every((word) => word.found);
  console.log("Game completion check:", {
    complete,
    totalWords: gameState.current.words.length,
    foundWords: gameState.current.words.filter((w) => w.found).length,
    wordStatuses: gameState.current.words.map((w) => ({
      word: w.word,
      found: w.found,
    })),
  });
  return complete;
}

/**
 * Processes a player's guess
 * @param {string} guess - The player's guess
 * @returns {{success: boolean, wordObj?: Object}} Result object with success status and found word
 */
export function processGuess(guess) {
  // Convert guess to lowercase for case-insensitive matching
  const wordObj = gameState.current.words.find(
    (w) => w.word.toLowerCase() === guess.toLowerCase() && !w.found
  );

  if (wordObj) {
    // Mark word as found and award points
    wordObj.found = true;
    gameState.current.score += wordObj.points;
    updateLetterCounts(wordObj.word);
    return { success: true, wordObj };
  } else {
    // Apply penalty for wrong guess, but don't go below zero
    const params = getGameParameters();
    if (params?.penalties?.wrongGuess) {
      gameState.current.score = Math.max(
        0,
        gameState.current.score - params.penalties.wrongGuess
      );
    }
    return { success: false };
  }
}

/**
 * Attempts to purchase a vowel from the marketplace
 * @param {string} vowel - The vowel to purchase
 * @returns {{success: boolean, cost: number, newScore: number}} Result of the purchase attempt
 */
export function purchaseVowel(vowel) {
  const params = gameState.config.parameters;
  if (!params)
    return { success: false, cost: 0, newScore: gameState.current.score };

  const cost = params.marketplace.vowel.cost;
  if (gameState.current.score >= cost && !marketState.vowels.has(vowel)) {
    gameState.current.score -= cost;
    marketState.vowels.add(vowel);
    clearLetterCount(vowel.toLowerCase()); // Clear the count for purchased vowel
    return { success: true, cost, newScore: gameState.current.score };
  }
  return { success: false, cost, newScore: gameState.current.score };
}

/**
 * Attempts to purchase a consonant hint from the marketplace
 * @param {string} consonant - The consonant to purchase
 * @returns {{success: boolean, cost: number, newScore: number, consonant?: string}} Result of the purchase attempt
 */
export function purchaseConsonant(consonant) {
  const params = gameState.config.parameters;
  if (!params)
    return { success: false, cost: 0, newScore: gameState.current.score };
  const cost = params.marketplace.consonant.cost;
  // Check if it's a valid consonant and not already purchased
  const isConsonant = "bcdfghjklmnpqrstvwxyz".includes(consonant.toLowerCase());
  if (!isConsonant || marketState.consonants.has(consonant.toLowerCase())) {
    return { success: false, cost, newScore: gameState.current.score };
  }

  if (gameState.current.score >= cost) {
    gameState.current.score -= cost;
    marketState.consonants.add(consonant.toLowerCase());
    clearLetterCount(consonant.toLowerCase()); // Clear the count for purchased consonant
    return {
      success: true,
      cost,
      newScore: gameState.current.score,
      consonant: consonant.toLowerCase(),
    };
  }
  return { success: false, cost, newScore: gameState.current.score };
}

/**
 * Finds the most common consonant in the hidden words that hasn't been revealed
 * @private
 * @returns {string|null} The best consonant to reveal or null if none found
 */
function findBestConsonant() {
  const words = getCurrentWords()
    .filter((w) => !w.found)
    .map((w) => w.word.toLowerCase());

  if (words.length === 0) return null;

  /** @type {{[key: string]: number}} */
  const consonantCount = {};
  const consonants = "bcdfghjklmnpqrstvwxyz".split("");

  words.forEach((word) => {
    word.split("").forEach((char) => {
      if (consonants.includes(char) && !marketState.consonants.has(char)) {
        consonantCount[char] = (consonantCount[char] || 0) + 1;
      }
    });
  });

  const sorted = Object.entries(consonantCount).sort(([, a], [, b]) => b - a);
  return sorted.length > 0 ? sorted[0][0] : null;
}

/**
 * Checks if a guess matches any hidden word
 * @param {string} guess - The player's guess
 * @returns {GameResult} The result of the guess
 */
export function checkGuess(guess) {
  const normalizedGuess = guess.toLowerCase().trim();
  const wordObj = getCurrentWords().find(
    (w) => w.word.toLowerCase() === normalizedGuess && !w.found
  );

  if (wordObj) {
    wordObj.found = true;
    gameState.current.score += wordObj.points;

    // Update letter counts when a word is found
    updateLetterCounts(wordObj.word);

    const allFound = getCurrentWords().every((w) => w.found);
    return {
      success: true,
      gameComplete: allFound,
      pointsEarned: wordObj.points,
    };
  }

  // Wrong guess penalty
  const params = getGameParameters();
  if (params?.penalties?.wrongGuess) {
    gameState.current.score = Math.max(
      0,
      gameState.current.score - params.penalties.wrongGuess
    );
  }

  return {
    success: false,
    gameComplete: false,
    pointsEarned: 0,
  };
}

/**
 * Masks a word, optionally revealing a vowel and purchased letters
 * @param {string} word - The word to mask
 * @param {string} [vowel=''] - The vowel to reveal
 * @returns {string} The masked word
 */
export function maskWordWithPurchases(word, vowel = "") {
  return word
    .split("")
    .map((char) => {
      const lowerChar = char.toLowerCase();
      // Show the specified vowel if it matches
      if (vowel && lowerChar === vowel.toLowerCase()) {
        return char;
      }
      // Show purchased consonants
      if (marketState.consonants.has(lowerChar)) {
        return char;
      }
      // Show purchased vowels
      if (marketState.vowels.has(lowerChar)) {
        return char;
      }
      // Mask everything else
      return "_";
    })
    .join("");
}

/**
 * Initializes letter counts for all hidden words
 * @private
 */
function initializeLetterCounts() {
  // Reset the counts
  Object.keys(letterCounts).forEach((key) => delete letterCounts[key]);

  // Count letters in all hidden words
  const words = getCurrentWords();
  words.forEach((word) => {
    if (!word.found) {
      word.word
        .toLowerCase()
        .split("")
        .forEach((char) => {
          letterCounts[char] = (letterCounts[char] || 0) + 1;
        });
    }
  });
}

/**
 * Updates letter counts when a word is found
 * @private
 * @param {string} word - The word that was found
 */
function updateLetterCounts(word) {
  const chars = word.toLowerCase().split("");
  chars.forEach((char) => {
    if (letterCounts[char]) {
      letterCounts[char] = Math.max(0, letterCounts[char] - 1);
      if (letterCounts[char] === 0) {
        delete letterCounts[char];
      }
    }
  });
}

/**
 * Updates letter counts when a letter is purchased/revealed
 * @private
 * @param {string} letter - The letter that was purchased
 */
function clearLetterCount(letter) {
  if (letter in letterCounts) {
    delete letterCounts[letter];
  }
}

/**
 * Returns current count of remaining letters in hidden words
 * @returns {Record<string, number>} Object with letter counts
 */
export function getLetterCounts() {
  return { ...letterCounts };
}
