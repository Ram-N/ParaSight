// Game initialization and event handling
import * as GameState from './game-state.js';
import * as UI from './ui-manager.js';

export async function loadGameData() {
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
        
        GameState.setGameParameters(parameters);
        GameState.setAllParagraphs(gameData.paragraphs);
        
        startGame();
    } catch (error) {
        console.error('Error loading game data:', error);
        document.getElementById('paragraph-container').innerHTML = 'Error loading game data. Please refresh the page.';
    }
}

export function startGame() {
    const allParagraphs = GameState.getAllParagraphs();
    const randomIndex = Math.floor(Math.random() * allParagraphs.length);
    GameState.setCurrentParagraph(allParagraphs[randomIndex]);
    const paragraph = GameState.getCurrentParagraph();
    console.log('Starting game with paragraph:', paragraph.id);
      // Reset game state
    GameState.gameState.score = 0;
    GameState.gameState.words = paragraph.hiddenWords.map(word => ({
        ...word,
        found: false,
        positions: GameState.findWordPositions(paragraph.text, word.word)
    }));
    
    GameState.gameState.maxScore = GameState.gameState.words.reduce((sum, word) => sum + word.points, 0);
    GameState.setVowel('');
    
    setupGame();
}

function setupGame() {
    UI.resetUI();
    UI.renderParagraph('');
    UI.renderClues();
    setupGuessing();
}

function setupGuessing() {
    console.log('Setting up guessing form...');
    const form = document.getElementById('guess-form');
    const input = document.getElementById('guess-input');
    
    if (!form || !input) {
        console.error('Could not find form or input elements:', { form, input });
        return;
    }
    
    form.addEventListener('submit', handleGuess);
}

function handleGuess(e) {
    e.preventDefault();
    const input = document.getElementById('guess-input');    const guess = input.value.trim();
    
    console.log('Submitted guess:', guess);
    const result = GameState.processGuess(guess);
    
    if (result.success) {
        input.classList.add('correct');
        setTimeout(() => input.classList.remove('correct'), 1000);
        
        UI.renderParagraph(GameState.getChosenVowel());
        UI.renderClues();
        UI.updateScore();
        
        if (GameState.isGameComplete()) {
            console.log('Game complete detected! Triggering end game.');
            UI.showGameOver();
        }
    } else {
        input.classList.add('wrong');
        setTimeout(() => input.classList.remove('wrong'), 1000);
        UI.updateScore();
    }
    
    input.value = '';
}

export function initializeGame() {
    console.log('Window loaded, initializing game...');
    const vowelButtons = UI.setupVowelButtons();
    loadGameData();

    vowelButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!GameState.chosenVowel) {
                const vowel = button.getAttribute('data-vowel');
                GameState.setVowel(vowel);
                UI.disableVowelButtons();
                UI.renderParagraph(vowel);
            }
        });
    });
}
