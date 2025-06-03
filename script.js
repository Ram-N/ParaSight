// script.js for ParaSight
console.log('ParaSight loaded');

// Game state
let currentParagraph = null;
let gameState = {
    words: [], // Will store enhanced word objects with position and found status
    score: 0,
    maxScore: 0
};

let gameParameters = null;

// Load both game data and parameters
async function loadGameData() {
    console.log('Loading game data...');
    try {
        console.log('Fetching JSON files...');
        const [gameResponse, paramsResponse] = await Promise.all([
            fetch('paras.json'),
            fetch('game_parameters.json')
        ]);
        
        if (!gameResponse.ok || !paramsResponse.ok) 
            throw new Error('Failed to load game data');
            
        const [gameData, parameters] = await Promise.all([
            gameResponse.json(),
            paramsResponse.json()
        ]);
        
        gameParameters = parameters;
        currentParagraph = gameData.paragraphs[0];
        
        // Initialize game state with enhanced word objects
        gameState.words = currentParagraph.hiddenWords.map(word => ({
            ...word,
            found: false,
            positions: findWordPositions(currentParagraph.text, word.word)
        }));
        
        // Calculate max possible score
        gameState.maxScore = gameState.words.reduce((sum, word) => sum + word.points, 0);
        
        // Initialize the game
        renderParagraph('');
        renderClues();
        setupGuessing();
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
        .flatMap(word => 
            word.positions.map(pos => ({
                ...pos,
                word: word.word,
                found: word.found
            }))
        )
        .sort((a, b) => b.start - a.start); // Sort in reverse order
    
    let maskedParagraph = currentParagraph.text;
      // Replace words one by one, starting from the end
    allReplacements.forEach(({ start, end, word, found }) => {
        const wordToReplace = maskedParagraph.substring(start, end);
          const maskedWord = found 
            ? `<span data-masked="true" class="found">${wordToReplace}</span>`
            : `<span data-masked="true">${maskWord(wordToReplace, vowel)}</span>`;
        
        maskedParagraph = 
            maskedParagraph.substring(0, start) + 
            maskedWord + 
            maskedParagraph.substring(end);
    });
    
    document.getElementById('paragraph-container').innerHTML = maskedParagraph;
}

function renderClues() {
    const cluesList = document.getElementById('clues-list');
    cluesList.innerHTML = '';    gameState.words.forEach(({ clue, word, found }, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `${idx + 1}. ${clue} (${word.length} letters) ${found ? '✓' : ''}`;
        if (found) li.classList.add('found');
        cluesList.appendChild(li);
    });
}

function setupGuessing() {
    console.log('Setting up guessing form...');
    const form = document.getElementById('guess-form');
    const input = document.getElementById('guess-input');
    
    if (!form || !input) {
        console.error('Could not find form or input elements:', { form, input });
        return;
    }
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const guess = input.value.trim().toLowerCase();
        console.log('Submitted guess:', guess);
        console.log('Current game state:', {
            score: gameState.score,
            foundWords: gameState.words.filter(w => w.found).map(w => w.word),
            availableWords: gameState.words.filter(w => !w.found).map(w => w.word)
        });
        
        // Find matching word
        const wordObj = gameState.words.find(w => 
            w.word.toLowerCase() === guess && !w.found
        );
        console.log('Matching word object:', wordObj);
        
        if (wordObj) {
            // Correct guess!
            wordObj.found = true;
            gameState.score += wordObj.points;
            
            // Update UI
            renderParagraph(chosenVowel);
            renderClues();
            updateScore();
            
            // Visual feedback
            input.classList.add('correct');
            setTimeout(() => input.classList.remove('correct'), 1000);
        } else {
            // Wrong guess
            gameState.score = Math.max(0, gameState.score - gameParameters.penalties.wrongGuess);
            
            // Visual feedback
            input.classList.add('wrong');
            setTimeout(() => input.classList.remove('wrong'), 1000);
            updateScore();
        }
        
        // Clear input
        input.value = '';
    });
}

function updateScore() {
    document.getElementById('score-value').textContent = gameState.score;
}

// Initial setup: handle vowel selection and render clues
let chosenVowel = '';

window.onload = function() {
    console.log('Window loaded, initializing game...');
    const vowelButtons = document.querySelectorAll('.vowel-tile');
    console.log('Found vowel buttons:', vowelButtons.length);
    
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
