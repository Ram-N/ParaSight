// Core game state and logic
let currentParagraph = null;
let gameParameters = null;
let allParagraphs = null;
let chosenVowel = '';

export const gameState = {
    words: [],
    score: 0,
    maxScore: 0
};

// Getters
export function getCurrentParagraph() { return currentParagraph; }
export function getGameParameters() { return gameParameters; }
export function getAllParagraphs() { return allParagraphs; }
export function getChosenVowel() { return chosenVowel; }

// Setters
export function setCurrentParagraph(paragraph) { currentParagraph = paragraph; }
export function setGameParameters(params) { gameParameters = params; }
export function setAllParagraphs(paragraphs) { allParagraphs = paragraphs; }
export function setVowel(vowel) { chosenVowel = vowel; }

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
    const complete = gameState.words.every(word => word.found);
    console.log('Game completion check:', {
        complete,
        totalWords: gameState.words.length,
        foundWords: gameState.words.filter(w => w.found).length,
        wordStatuses: gameState.words.map(w => ({word: w.word, found: w.found}))
    });
    return complete;
}

export function processGuess(guess) {
    const wordObj = gameState.words.find(w => 
        w.word.toLowerCase() === guess.toLowerCase() && !w.found
    );
    
    if (wordObj) {
        wordObj.found = true;
        gameState.score += wordObj.points;
        return { success: true, wordObj };
    } else {
        gameState.score = Math.max(0, gameState.score - gameParameters.penalties.wrongGuess);
        return { success: false };
    }
}
