// Core game state and logic
export const gameState = {
    // Current game session state
    current: {
        paragraph: null,
        chosenVowel: '',
        words: [],
        score: 0,
        maxScore: 0
    },
    // Game configuration
    config: {
        parameters: null,
        paragraphs: null
    }
};

// Getters
export function getCurrentParagraph() { return gameState.current.paragraph; }
export function getGameParameters() { return gameState.config.parameters; }
export function getAllParagraphs() { return gameState.config.paragraphs; }
export function getChosenVowel() { return gameState.current.chosenVowel; }
export function getCurrentWords() { return gameState.current.words; }
export function getCurrentScore() { return gameState.current.score; }
export function getMaxScore() { return gameState.current.maxScore; }

// Setters
export function setCurrentParagraph(paragraph) { gameState.current.paragraph = paragraph; }
export function setGameParameters(params) { gameState.config.parameters = params; }
export function setAllParagraphs(paragraphs) { gameState.config.paragraphs = paragraphs; }
export function setVowel(vowel) { gameState.current.chosenVowel = vowel; }
export function setCurrentWords(words) { gameState.current.words = words; }
export function setScore(score) { gameState.current.score = score; }
export function setMaxScore(score) { gameState.current.maxScore = score; }

// Game logic functions
export function maskWord(word, vowel) {
    return word.replace(/[^\W_]/gi, (char) => {
        if (char.toLowerCase() === vowel) return char;
        return '-';
    });
}

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

export function processGuess(guess) {
    const wordObj = gameState.current.words.find(w => 
        w.word.toLowerCase() === guess.toLowerCase() && !w.found
    );
    
    if (wordObj) {
        wordObj.found = true;
        gameState.current.score += wordObj.points;
        return { success: true, wordObj };
    } else {
        gameState.current.score = Math.max(0, 
            gameState.current.score - gameState.config.parameters.penalties.wrongGuess);
        return { success: false };
    }
}
