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
 * @property {boolean} revealed - Whether the word was revealed by the player
 * @property {Array<{start: number, end: number}>} positions - Word positions in text
 * @property {number} visibleClues - Number of clues currently visible for the word
 */

/**
 * @typedef {Object} GameParagraph
 * @property {number} id - Unique identifier
 * @property {string} text - The paragraph text
 * @property {Array<GameWord>} hiddenWords - Words to find in the paragraph
 * @property {string} [title] - Optional title for the paragraph
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

/**
 * Resets the game state to its initial values
 * This function should be called when changing paragraphs or starting a new game
 */
export function resetGameState() {
  // Reset the current game state
  gameState.current.paragraph = null;
  gameState.current.chosenVowel = "";
  gameState.current.words = [];
  gameState.current.score = 100; // Start with 100 links
  gameState.current.maxScore = 0;
  gameState.current.clueAttempts = 0;
  gameState.current.shownWordIndices = [];
  gameState.current.initPhase = true;
  gameState.current.selectedVowel = "";
  gameState.current.selectedConsonants = [];
  gameState.current.wordsWithRevealedSuffixes = [];
  
  // Reset marketplace state
  marketState.vowels.clear();
  marketState.consonants.clear();
  marketState.hints = 0;
  marketState.selectionComplete = false;
  
  // Reset letter counts
  Object.keys(letterCounts).forEach(key => delete letterCounts[key]);
  
  console.log("Game state completely reset");
}

/** @type {GameState} */
export const gameState = {
  current: {
    paragraph: null, // Currently displayed paragraph
    chosenVowel: "", // Vowel selected by player for revelation
    words: [], // Array of word objects with found status
    score: 0, // Player's current score
    maxScore: 0, // Maximum achievable score for current paragraph
    clueAttempts: 0, // Number of answer attempts made
    initialCluesShown: 3, // Number of clues to show initially
    shownWordIndices: [], // Indices of words with visible clues
    revealPenalty: 15, // Default penalty for revealing a word
    initPhase: true, // Whether the game is in the initial letter selection phase
    selectedVowel: "", // The vowel selected during initialization
    selectedConsonants: [], // The consonants selected during initialization
    wordsWithRevealedSuffixes: [], // Array of word indices that have their suffixes revealed
    initialSuffixesShown: 1, // Number of words to show suffixes for initially (changed from 3 to 1)
  },
  config: {
    parameters: null, // Game rules like penalties
    paragraphs: null, // All available game content
    suffixes: null, // Suffix configuration for progressive reveal
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
  /** @type {boolean} */
  selectionComplete: false, // Whether the initial letter selection is complete
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
 * Gets the suffix configuration
 * @returns {Object|null} The suffix configuration or null if not loaded
 */
export function getSuffixConfig() {
  return gameState.config.suffixes;
}

/**
 * Gets the indices of words that have their suffixes revealed
 * @returns {Array<number>} Array of word indices
 */
export function getWordsWithRevealedSuffixes() {
  return gameState.current.wordsWithRevealedSuffixes || [];
}

/**
 * Gets the suffix for a specific word from the suffix configuration
 * @param {string} word - The word to check
 * @returns {Object|null} The matching suffix object or null if no match
 */
export function getWordSuffix(word) {
  if (!word || typeof word !== 'string') return null;
  
  const lowerWord = word.toLowerCase();
  const suffixConfig = getSuffixConfig();
  
  if (!suffixConfig || !suffixConfig.suffixes || !Array.isArray(suffixConfig.suffixes)) {
    return null;
  }
  
  // Check each suffix in the configuration
  for (const suffix of suffixConfig.suffixes) {
    if (lowerWord.endsWith(suffix.ending)) {
      return suffix;
    }
  }
  
  return null;
}

/**
 * Gets the number of initially shown suffixes
 * @returns {number} Number of initial suffixes
 */
export function getInitialSuffixesShown() {
  return gameState.current.initialSuffixesShown;
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
 * Gets whether the game is in the initial letter selection phase
 * @returns {boolean} True if in initialization phase, false otherwise
 */
export function isInitPhase() {
  return gameState.current.initPhase;
}

/**
 * Gets the selected vowel during initialization
 * @returns {string} The selected vowel
 */
export function getSelectedVowel() {
  return gameState.current.selectedVowel;
}

/**
 * Gets the selected consonants during initialization
 * @returns {string[]} The selected consonants
 */
export function getSelectedConsonants() {
  return gameState.current.selectedConsonants;
}

/**
 * Gets whether the initial letter selection is complete
 * @returns {boolean} True if selection is complete, false otherwise
 */
export function isSelectionComplete() {
  return marketState.selectionComplete;
}

/**
 * Gets the list of words for the current paragraph
 * @returns {Array<GameWord>} Array of word objects with their current state
 */
export function getCurrentWords() {
  return gameState.current.words || [];
}

/**
 * Gets the number of attempts made so far
 * @returns {number} The number of attempts
 */
export function getClueAttempts() {
  return gameState.current.clueAttempts;
}

/**
 * Gets the number of initial clues shown
 * @returns {number} Number of initial clues
 */
export function getInitialCluesShown() {
  return gameState.current.initialCluesShown;
}

/**
 * Gets the indices of words with visible clues
 * @returns {number[]} Array of word indices
 */
export function getShownWordIndices() {
  return gameState.current.shownWordIndices;
}

/**
 * Gets the current score of the player
 * @returns {number} The current score
 */
export function getCurrentScore() {
  // Ensure score is always a valid number
  if (isNaN(gameState.current.score)) {
    console.error("Score is NaN, resetting to 100");
    gameState.current.score = 100;
  }
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
 * Sets the suffix configuration for the game
 * @param {Object} suffixConfig - The suffix configuration object
 */
export function setSuffixConfig(suffixConfig) {
  gameState.config.suffixes = suffixConfig;
}

/**
 * Sets the chosen vowel for the current game session
 * @param {string} vowel - The vowel to be set as chosen
 */
export function setVowel(vowel) {
  gameState.current.chosenVowel = vowel;
}

/**
 * Sets the selected vowel during initialization
 * @param {string} vowel - The vowel to be set as selected
 */
export function setSelectedVowel(vowel) {
  if (gameState.current.initPhase && !gameState.current.selectedVowel) {
    gameState.current.selectedVowel = vowel.toLowerCase();
    return true;
  }
  return false;
}

/**
 * Adds a selected consonant during initialization
 * @param {string} consonant - The consonant to be added
 * @returns {boolean} Whether the consonant was added successfully
 */
export function addSelectedConsonant(consonant) {
  if (gameState.current.initPhase && gameState.current.selectedConsonants.length < 2) {
    gameState.current.selectedConsonants.push(consonant.toLowerCase());
    return true;
  }
  return false;
}

/**
 * Completes the initial letter selection phase
 * @returns {boolean} Whether the transition was successful
 */
export function completeLetterSelection() {
  if (gameState.current.initPhase && 
      gameState.current.selectedVowel && 
      gameState.current.selectedConsonants.length === 2) {
    gameState.current.initPhase = false;
    marketState.selectionComplete = true;
    
    // Add selected letters to purchased sets
    marketState.vowels.add(gameState.current.selectedVowel);
    gameState.current.selectedConsonants.forEach(consonant => {
      marketState.consonants.add(consonant);
    });
    
    // Set the chosen vowel
    gameState.current.chosenVowel = gameState.current.selectedVowel;
    
    // Update letter counts to exclude the revealed letters
    updateLetterCountsAfterSelection();
    
    // Initialize the suffix reveal system
    initializeSuffixes();
    
    return true;
  }
  return false;
}

/**
 * Updates letter counts after initial selection to exclude revealed letters
 * @private
 */
function updateLetterCountsAfterSelection() {
  const selectedVowel = gameState.current.selectedVowel;
  const selectedConsonants = gameState.current.selectedConsonants;
  
  // Remove the selected letters from the counts
  if (selectedVowel && letterCounts[selectedVowel]) {
    delete letterCounts[selectedVowel];
  }
  
  selectedConsonants.forEach(consonant => {
    if (letterCounts[consonant]) {
      delete letterCounts[consonant];
    }
  });
}

/**
 * Sets the list of words for the current paragraph
 * @param {Array<GameWord>} words - Array of word objects to be set
 */
export function setCurrentWords(words) {
  // Initialize each word with visibleClues = 0 and revealed = false
  gameState.current.words = words.map(word => ({
    ...word,
    visibleClues: 0,
    revealed: false,
    activeClueIndex: 0, // Default to the hardest clue (index 0)
    lowestClueIndexSeen: 0 // Track the easiest clue seen (0=hard, 1=medium, 2=easy)
  }));
  
  // Get indices of unfound words
  const unfoundIndices = words.map((_, index) => index);
  
  // Randomly select initialCluesShown indices for initial display
  const initialCount = Math.min(gameState.current.initialCluesShown, unfoundIndices.length);
  gameState.current.shownWordIndices = [];
  
  // Shuffle the unfound indices to pick random words
  for (let i = unfoundIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unfoundIndices[i], unfoundIndices[j]] = [unfoundIndices[j], unfoundIndices[i]];
  }
  
  // Set the initial visible clues
  for (let i = 0; i < initialCount; i++) {
    const wordIndex = unfoundIndices[i];
    gameState.current.shownWordIndices.push(wordIndex);
  }
  
  gameState.current.score = 100; // Start with 100 links
  gameState.current.clueAttempts = 0; // Reset attempt counter
  initializeLetterCounts();
}

/**
 * Sets the current score of the player
 * @param {number} score - The score value to be set
 */
export function setScore(score) {
  // Ensure we're setting a valid number
  if (isNaN(score)) {
    console.error("Attempted to set score to NaN, using 100 instead");
    gameState.current.score = 100;
  } else {
    gameState.current.score = score;
  }
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

  // Increment attempt counter for progressive clue revealing
  gameState.current.clueAttempts++;
  
  // After each attempt, reveal one more clue if there are any unfound words
  const unfoundIndices = getCurrentWords()
    .map((word, index) => word.found ? -1 : index)
    .filter(index => index !== -1 && !gameState.current.shownWordIndices.includes(index));
  
  // If there are still hidden clues to reveal
  if (unfoundIndices.length > 0) {
    // Choose a random word to reveal
    const randomIndex = Math.floor(Math.random() * unfoundIndices.length);
    const wordIndexToReveal = unfoundIndices[randomIndex];
    
    // Add this word to the visible clues list
    if (wordIndexToReveal !== undefined && !gameState.current.shownWordIndices.includes(wordIndexToReveal)) {
      gameState.current.shownWordIndices.push(wordIndexToReveal);
    }
  }

  if (wordObj) {
    wordObj.found = true;
    
    // Get the lowest (easiest) clue index seen to determine points earned
    const lowestClueIndexSeen = wordObj.lowestClueIndexSeen || 0;
    
    // Get the points value based on the lowest clue index seen
    // (the player earns points based on the easiest clue they've seen)
    let pointsEarned;
    if (wordObj.clues && Array.isArray(wordObj.clues) && wordObj.clues[lowestClueIndexSeen]) {
      // Use the points value from the lowest (easiest) clue seen
      pointsEarned = wordObj.clues[lowestClueIndexSeen].points || 0;
      console.log(`Using points (${pointsEarned}) from lowest clue index seen ${lowestClueIndexSeen} for word "${wordObj.word}"`);
    } else {
      // Fallback to the word's default points if clues are not available
      pointsEarned = wordObj.points || 0;
      console.log(`Using default points (${pointsEarned}) for word "${wordObj.word}"`);
    }
    
    // Add the points to the score
    gameState.current.score += pointsEarned;

    // Update letter counts when a word is found
    updateLetterCounts(wordObj.word);

    const allFound = getCurrentWords().every((w) => w.found);
    return {
      success: true,
      gameComplete: allFound,
      pointsEarned: pointsEarned,
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
 * Masks a word, optionally revealing a vowel, purchased letters, and suffix endings
 * @param {string} word - The word to mask
 * @param {string} [vowel=''] - The vowel to reveal
 * @param {number} [wordIndex=-1] - The index of the word in the game state
 * @returns {string} The masked word
 */
export function maskWordWithPurchases(word, vowel = "", wordIndex = -1) {
  // Check if we're in the initial phase with selection complete
  const inInitPhase = isInitPhase() && !marketState.selectionComplete;
  
  // If in normal phase or selection is complete, use standard masking
  if (!inInitPhase) {
    return word
      .split("")
      .map((char, index) => {
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
        
        // Show suffix letters if this character is part of a revealed suffix
        if (wordIndex >= 0 && isPartOfRevealedSuffix(word, index, wordIndex)) {
          return char;
        }
        
        // Mask everything else
        return "_";
      })
      .join("");
  } else {
    // In initial phase - mask everything
    return word
      .split("")
      .map(() => "_")
      .join("");
  }
}

/**
 * Reveals selected letters in hidden words after initial selection
 * @returns {void}
 */
export function revealSelectedLetters() {
  if (!marketState.selectionComplete) return;
  
  // Get the selected letters
  const vowel = gameState.current.selectedVowel;
  const consonants = gameState.current.selectedConsonants;
  
  // No need to modify the masking algorithm as maskWordWithPurchases
  // already handles revealing the selected letters based on market state
  // The selected letters were added to marketState.vowels and marketState.consonants
  // in completeLetterSelection()
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

/**
 * Reveals a word to the player with a score penalty
 * @param {number} wordIndex - The index of the word to reveal
 * @returns {{success: boolean, pointsDeducted: number}} Result of the reveal operation
 */
export function revealWord(wordIndex) {
  // Find the word to reveal
  const word = gameState.current.words[wordIndex];
  
  // Check if the word exists and isn't already found or revealed
  if (!word || word.found || word.revealed) {
    return { success: false, pointsDeducted: 0 };
  }
  
  // Calculate penalty - use word points or default reveal penalty
  const penalty = word.points || gameState.current.revealPenalty;
  
  // Make sure we don't go below 0 points
  const pointsToDeduct = Math.min(gameState.current.score, penalty);
  
  // Apply the penalty
  gameState.current.score -= pointsToDeduct;
  
  // Mark the word as revealed
  word.revealed = true;
  
  // Update letter counts as this word is now visible
  updateLetterCounts(word.word);
  
  // Add this word to shown indices if not already there
  if (!gameState.current.shownWordIndices.includes(wordIndex)) {
    gameState.current.shownWordIndices.push(wordIndex);
  }
  
  return { success: true, pointsDeducted: pointsToDeduct };
}

/**
 * Updates the active clue index for a word
 * @param {number} wordIndex - The index of the word in the game state
 * @param {number} clueIndex - The index of the clue to set as active
 * @returns {boolean} Whether the update was successful
 */
export function updateActiveClueIndex(wordIndex, clueIndex) {
  if (wordIndex < 0 || wordIndex >= gameState.current.words.length) {
    console.error(`Invalid word index: ${wordIndex}`);
    return false;
  }
  
  const word = gameState.current.words[wordIndex];
  if (word.found || word.revealed) {
    return false; // Can't change clue for found or revealed words
  }
  
  // Ensure clue index is valid (word has clues array)
  if (!word.clues || !Array.isArray(word.clues) || clueIndex >= word.clues.length) {
    console.error(`Invalid clue index: ${clueIndex} for word at index ${wordIndex}`);
    return false;
  }
  
  // Update the active clue index
  word.activeClueIndex = clueIndex;
  
  // Update the lowest clue index seen (higher index = easier clue)
  if (clueIndex > word.lowestClueIndexSeen) {
    word.lowestClueIndexSeen = clueIndex;
    console.log(`Updated lowest clue index seen for word "${word.word}" to ${clueIndex}`);
  }
  
  console.log(`Updated active clue index for word "${word.word}" to ${clueIndex}`);
  return true;
}

/**
 * Gets the active clue index for a word
 * @param {number} wordIndex - The index of the word in the game state
 * @returns {number} The active clue index (0, 1, or 2)
 */
export function getActiveClueIndex(wordIndex) {
  if (wordIndex < 0 || wordIndex >= gameState.current.words.length) {
    console.error(`Invalid word index: ${wordIndex}`);
    return 0;
  }
  
  return gameState.current.words[wordIndex].activeClueIndex || 0;
}

/**
 * Gets the lowest (easiest) clue index seen for a word
 * @param {number} wordIndex - The index of the word in the game state
 * @returns {number} The lowest clue index seen (0, 1, or 2)
 */
export function getLowestClueIndexSeen(wordIndex) {
  if (wordIndex < 0 || wordIndex >= gameState.current.words.length) {
    console.error(`Invalid word index: ${wordIndex}`);
    return 0;
  }
  
  return gameState.current.words[wordIndex].lowestClueIndexSeen || 0;
}

/**
 * Checks if a word ends with any of the revealed suffixes
 * @param {string} word - The word to check
 * @returns {Object|null} The matching suffix object or null if no match
 */
export function getMatchingSuffix(word) {
  if (!word || typeof word !== 'string') return null;
  
  const lowerWord = word.toLowerCase();
  const revealedSuffixes = getRevealedSuffixes();
  
  for (const suffix of revealedSuffixes) {
    if (lowerWord.endsWith(suffix.ending)) {
      return suffix;
    }
  }
  
  return null;
}

/**
 * Checks if a character at a specific position in a word is part of a revealed suffix
 * @param {string} word - The word to check
 * @param {number} charIndex - The character index to check
 * @param {number} wordIndex - The index of the word in the game state
 * @returns {boolean} True if the character is part of a revealed suffix
 */
export function isPartOfRevealedSuffix(word, charIndex, wordIndex) {
  if (!word || typeof word !== 'string') return false;
  
  // Check if this word's index is in the revealed list
  const revealedWordIndices = getWordsWithRevealedSuffixes();
  if (!revealedWordIndices.includes(wordIndex)) {
    return false;
  }
  
  // Get the suffix for this word
  const suffix = getWordSuffix(word);
  if (!suffix || !suffix.ending) {
    // This shouldn't happen for words in the revealed list
    console.debug(`No valid suffix found for word "${word}" at index ${wordIndex}`);
    return false;
  }
  
  // Check if this character is in the suffix portion
  const suffixStart = word.length - suffix.ending.length;
  const isPartOfSuffix = charIndex >= suffixStart;
  
  if (isPartOfSuffix) {
    console.debug(`Revealing suffix char at index ${charIndex} in word "${word}" with suffix "${suffix.ending}"`);
  }
  
  return isPartOfSuffix;
}

/**
 * Initializes the suffix reveal system, revealing the suffixes for the initial set of words
 */
export function initializeSuffixes() {
  // Reset any previously revealed word suffixes
  gameState.current.wordsWithRevealedSuffixes = [];
  
  const suffixConfig = getSuffixConfig();
  if (!suffixConfig || !suffixConfig.suffixes || !Array.isArray(suffixConfig.suffixes)) {
    console.warn("No valid suffix configuration found");
    return;
  }
  
  console.log("Initializing suffixes with config:", suffixConfig);
  
  // Find all words that have suffixes defined in the config
  const words = getCurrentWords();
  const wordsWithSuffixes = words
    .map((word, index) => {
      const suffix = getWordSuffix(word.word);
      return { 
        word, 
        index, 
        suffix: suffix ? suffix.ending : null 
      };
    })
    .filter(item => item.suffix !== null && !item.word.found);
  
  console.log("Words with suffixes:", wordsWithSuffixes.map(item => 
    `${item.word.word} (${item.suffix})`
  ));
  
  if (wordsWithSuffixes.length === 0) {
    console.warn("No words with suffixes found");
    return;
  }
  
  // Shuffle the words to randomly select which ones to reveal
  const shuffledWords = [...wordsWithSuffixes];
  for (let i = shuffledWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
  }
  
  // Choose first N words (or fewer if not enough available)
  const initialCount = Math.min(gameState.current.initialSuffixesShown, shuffledWords.length);
  
  // Add the word indices to the revealed list
  const revealedWordIndices = [];
  for (let i = 0; i < initialCount; i++) {
    const wordIndex = shuffledWords[i].index;
    revealedWordIndices.push(wordIndex);
    gameState.current.wordsWithRevealedSuffixes.push(wordIndex);
    
    // Update letter counts for this word's suffix
    updateLetterCountsForWordSuffix(wordIndex);
  }
  
  console.log(`Revealed suffixes for ${revealedWordIndices.length} initial words:`, 
    revealedWordIndices.map(idx => {
      const word = words[idx].word;
      const suffix = getWordSuffix(word);
      return `${word} (${suffix ? suffix.ending : 'unknown'})`;
    }));
}

/**
 * Reveals the suffix for the next word after a guess
 * @returns {boolean} True if a new word suffix was revealed, false otherwise
 */
export function revealNextSuffix() {
  // Find all words that have suffixes defined in the config
  const words = getCurrentWords();
  const alreadyRevealedIndices = getWordsWithRevealedSuffixes();
  
  // Get words with suffixes that haven't been revealed yet and aren't found
  const revealableWords = words
    .map((word, index) => ({ word, index }))
    .filter(item => {
      // Skip if this word's suffix is already revealed or the word is found
      if (alreadyRevealedIndices.includes(item.index) || item.word.found) {
        return false;
      }
      
      // Check if the word has a valid suffix
      return getWordSuffix(item.word.word) !== null;
    });
  
  // If we have no more words to reveal, return false
  if (revealableWords.length === 0) {
    console.log("No more word suffixes to reveal");
    return false;
  }
  
  // Randomly select one word to reveal its suffix
  const randomIndex = Math.floor(Math.random() * revealableWords.length);
  const selectedWord = revealableWords[randomIndex];
  
  // Add the word index to the revealed list
  gameState.current.wordsWithRevealedSuffixes.push(selectedWord.index);
  
  // Update letter counts for this word's suffix
  updateLetterCountsForWordSuffix(selectedWord.index);
  
  // Get the suffix for logging
  const suffix = getWordSuffix(selectedWord.word.word);
  
  console.log(`Revealed suffix for word "${selectedWord.word.word}" (${suffix ? suffix.ending : 'unknown'})`);
  return true;
}

/**
 * Updates letter counts for a word's revealed suffix
 * @param {number} wordIndex - The index of the word with revealed suffix
 */
function updateLetterCountsForWordSuffix(wordIndex) {
  const words = getCurrentWords();
  
  // Make sure the word index is valid
  if (wordIndex < 0 || wordIndex >= words.length) {
    console.error(`Invalid word index: ${wordIndex}`);
    return;
  }
  
  const word = words[wordIndex];
  
  // Skip if the word is already found
  if (word.found) return;
  
  // Get the suffix for this word
  const suffix = getWordSuffix(word.word);
  if (!suffix || !suffix.ending) return;
  
  // For each letter in the suffix, decrement its count once for this word
  suffix.ending.split("").forEach(letter => {
    const lowerLetter = letter.toLowerCase();
    if (letterCounts[lowerLetter] && letterCounts[lowerLetter] > 0) {
      letterCounts[lowerLetter]--;
      if (letterCounts[lowerLetter] === 0) {
        delete letterCounts[lowerLetter];
      }
    }
  });
  
  console.log(`Updated letter counts for word "${word.word}" with suffix "${suffix.ending}"`);
}
