// script.js for ParaSight
console.log('ParaSight loaded');

// Game state
let currentParagraph = null;
let gameState = {
    words: [], // Will store enhanced word objects with position and found status
    score: 0,
    maxScore: 0
};

// Load paragraph data from JSON and initialize game state
async function loadGameData() {
    try {
        const response = await fetch('paras.json');
        if (!response.ok) throw new Error('Failed to load game data');
        const data = await response.json();
        
        // For now, use the first paragraph
        currentParagraph = data.paragraphs[0];
        
        // Initialize game state with enhanced word objects
        gameState.words = currentParagraph.hiddenWords.map(word => ({
            ...word,
            found: false,
            positions: findWordPositions(currentParagraph.text, word.word)
        }));
        
        // Calculate max possible score
        gameState.maxScore = gameState.words.reduce((sum, word) => sum + word.points, 0);
        
        // Initialize the game once data is loaded
        renderParagraph('');
        renderClues();
    } catch (error) {
        console.error('Error loading game data:', error);
        document.getElementById('paragraph-container').innerHTML = 'Error loading game data. Please refresh the page.';
    }
}

function maskWord(word, vowel) {
    // Replace all letters except the chosen vowel with dashes, keep case
    return word.replace(/[^\W_]/gi, (char) => {
        if (char.toLowerCase() === vowel) return char;
        return '-';
    });
}

// Find all positions of a word in the text
function findWordPositions(text, word) {
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

function renderParagraph(vowel) {
    if (!currentParagraph) return;
    
    // Sort all positions from end to start to avoid index shifting
    const allReplacements = gameState.words
        .filter(word => !word.found)
        .flatMap(word => 
            word.positions.map(pos => ({
                ...pos,
                word: word.word
            }))
        )
        .sort((a, b) => b.start - a.start); // Sort in reverse order
    
    let maskedParagraph = currentParagraph.text;
    
    // Replace words one by one, starting from the end
    allReplacements.forEach(({ start, end, word }) => {
        const wordToReplace = maskedParagraph.substring(start, end);
        const maskedWord = `<span data-masked="true">${maskWord(wordToReplace, vowel)}</span>`;
        maskedParagraph = 
            maskedParagraph.substring(0, start) + 
            maskedWord + 
            maskedParagraph.substring(end);
    });
    
    document.getElementById('paragraph-container').innerHTML = maskedParagraph;
}

function renderClues() {
    const cluesList = document.getElementById('clues-list');
    cluesList.innerHTML = '';
    gameState.words.forEach(({ clue, points, found }, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `${idx + 1}. ${clue} (${points} pts) ${found ? '✓' : ''}`;
        if (found) li.classList.add('found');
        cluesList.appendChild(li);
    });
}

// Initial setup: handle vowel selection and render clues
let chosenVowel = '';

window.onload = function() {
    const vowelButtons = document.querySelectorAll('.vowel-tile');
    
    // Load game data and initialize
    loadGameData();

    vowelButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!chosenVowel) {  // Only allow selection if no vowel has been chosen
                chosenVowel = button.getAttribute('data-vowel');
                
                // Disable all vowel buttons
                vowelButtons.forEach(btn => {
                    btn.classList.add('disabled');
                });
                
                renderParagraph(chosenVowel);
            }
        });
    });
};
