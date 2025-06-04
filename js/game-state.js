/**
 * @fileoverview Core game state management module for ParaSight.
 * Manages the game's state using a centralized object with getters and setters.
 * @module game-state
 */

// The single source of truth for game state
export const gameState = {
    // Runtime state that changes during gameplay
    current: {
        paragraph: null,    // Currently displayed paragraph
        chosenVowel: '',   // Vowel selected by player for revelation
        words: [],         // Array of word objects with found status
        score: 0,         // Player's current score
        maxScore: 0       // Maximum achievable score for current paragraph
    },
    // Static configuration loaded at startup
    config: {
        parameters: null,  // Game rules like penalties
        paragraphs: null  // All available game content
    }
};

// Getters
/**
 * Gets the current active paragraph
 * @returns {Object|null} The current paragraph object or null if not set
 */
export function getCurrentParagraph() { return gameState.current.paragraph; }

/**
 * Gets the game parameters including penalties and rules
 * @returns {Object|null} Game parameters object or null if not loaded
 */
export function getGameParameters() { return gameState.config.parameters; }

/**
 * Gets all available paragraphs for the game
 * @returns {Array|null} Array of paragraph objects or null if not loaded
 */
export function getAllParagraphs() { return gameState.config.paragraphs; }

/**
 * Gets the currently chosen vowel by the player
 * @returns {string} The selected vowel
 */
export function getChosenVowel() { return gameState.current.chosenVowel; }

/**
 * Gets the list of words for the current paragraph
 * @returns {Array} Array of word objects with their current state
 */
export function getCurrentWords() { return gameState.current.words; }

/**
 * Gets the current score of the player
 * @returns {number} The current score
 */
export function getCurrentScore() { return gameState.current.score; }

/**
 * Gets the maximum score possible in the current game session
 * @returns {number} The maximum score
 */
export function getMaxScore() { return gameState.current.maxScore; }

// Setters
/**
 * Sets the current active paragraph
 * @param {Object} paragraph - The paragraph object to set as current
 */
export function setCurrentParagraph(paragraph) { gameState.current.paragraph = paragraph; }

/**
 * Sets the game parameters including rules and penalties
 * @param {Object} params - The parameters object to configure the game
 */
export function setGameParameters(params) { gameState.config.parameters = params; }

/**
 * Sets all available paragraphs for the game
 * @param {Array} paragraphs - Array of paragraph objects to be set
 */
export function setAllParagraphs(paragraphs) { gameState.config.paragraphs = paragraphs; }

/**
 * Sets the chosen vowel for the current game session
 * @param {string} vowel - The vowel to be set as chosen
 */
export function setVowel(vowel) { gameState.current.chosenVowel = vowel; }

/**
 * Sets the list of words for the current paragraph
 * @param {Array} words - Array of word objects to be set
 */
export function setCurrentWords(words) { gameState.current.words = words; }

/**
 * Sets the current score of the player
 * @param {number} score - The score value to be set
 */
export function setScore(score) { gameState.current.score = score; }

/**
 * Sets the maximum score for the current game session
 * @param {number} score - The maximum score value to be set
 */
export function setMaxScore(score) { gameState.current.maxScore = score; }

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
        return '-';
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
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
        positions.push({
            start: match.index,
            end: match.index + word.length
        });
    }
    return positions;
}

/**
 * Checks if all words have been found
 * @returns {boolean} True if game is complete, false otherwise
 */
export function isGameComplete() {
    const complete = gameState.current.words.every(word => word.found);
    console.log('Game completion check:', {
        complete,
        totalWords: gameState.current.words.length,
        foundWords: gameState.current.words.filter(w => w.found).length,
        wordStatuses: gameState.current.words.map(w => ({word: w.word, found: w.found}))
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
    const wordObj = gameState.current.words.find(w => 
        w.word.toLowerCase() === guess.toLowerCase() && !w.found
    );
    
    if (wordObj) {
        // Mark word as found and award points
        wordObj.found = true;
        gameState.current.score += wordObj.points;
        return { success: true, wordObj };
    } else {
        // Apply penalty for wrong guess, but don't go below zero
        gameState.current.score = Math.max(0, 
            gameState.current.score - gameState.config.parameters.penalties.wrongGuess);
        return { success: false };
    }
}
