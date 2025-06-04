/**
 * @fileoverview Game initialization and event handling module for ParaSight.
 * Manages game lifecycle, data loading, and event coordination.
 * @module game-controller
 */

import * as GameState from './game-state.js';
import * as UI from './ui-manager.js';

/**
 * Loads game data and parameters from JSON files
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If data loading fails
 */
export async function loadGameData() {
    console.log('Loading game data...');
    try {
        // Load both game data and parameters in parallel
        console.log('Fetching JSON files...');
        const [gameResponse, paramsResponse] = await Promise.all([
            fetch('paras.json'),
            fetch('game_parameters.json')
        ]);
        
        if (!gameResponse.ok || !paramsResponse.ok) 
            throw new Error('Failed to load game data');
              
        // Parse JSON responses in parallel
        const [gameData, parameters] = await Promise.all([
            gameResponse.json(),
            paramsResponse.json()
        ]);
        
        // Initialize game state with loaded data
        GameState.setGameParameters(parameters);
        GameState.setAllParagraphs(gameData.paragraphs);
        
        startGame();
    } catch (error) {
        console.error('Error loading game data:', error);
        document.getElementById('paragraph-container').innerHTML = 
            'Error loading game data. Please refresh the page.';
    }
}

/**
 * Starts a new game session with a random paragraph
 * Initializes game state and UI
 */
export function startGame() {
    const allParagraphs = GameState.getAllParagraphs();
    const randomIndex = Math.floor(Math.random() * allParagraphs.length);
    GameState.setCurrentParagraph(allParagraphs[randomIndex]);
    const paragraph = GameState.getCurrentParagraph();
    console.log('Starting game with paragraph:', paragraph.id);    // Reset game state
    GameState.setScore(0);
    const words = paragraph.hiddenWords.map(word => ({
        ...word,
        found: false,
        positions: GameState.findWordPositions(paragraph.text, word.word)
    }));
    GameState.setCurrentWords(words);
    
    const maxScore = words.reduce((sum, word) => sum + word.points, 0);
    GameState.setMaxScore(maxScore);
    GameState.setVowel('');
    
    setupGame();
}

/**
 * Sets up the game UI and initializes event handlers
 * @private
 */
function setupGame() {
    UI.resetUI();
    UI.renderParagraph('');
    UI.renderClues();
    setupGuessing();
}

/**
 * Sets up the word guessing form and its event handlers
 * @private
 */
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

/**
 * Handles player's word guess submissions
 * @param {Event} e - The submit event object
 * @private
 */
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

/**
 * Initializes the game and sets up event listeners
 * Entry point for the game
 */
export function initializeGame() {
    console.log('Window loaded, initializing game...');
    
    // Set up vowel selection buttons first
    const vowelButtons = UI.setupVowelButtons();
    
    // Load game data and start first game
    loadGameData();

    // Add click handlers for vowel selection
    vowelButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Only allow vowel selection if none has been chosen yet
            if (!GameState.getChosenVowel()) {
                const vowel = button.getAttribute('data-vowel');
                GameState.setVowel(vowel);
                UI.disableVowelButtons();
                UI.renderParagraph(vowel);
            }
        });
    });
}
