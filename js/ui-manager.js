/**
 * @fileoverview UI rendering and DOM manipulation module for ParaSight.
 * Handles all user interface updates and DOM interactions.
 * @module ui-manager
 */

import { 
    getCurrentParagraph,
    getCurrentWords,
    getCurrentScore,
    getMaxScore,
    maskWord
} from './game-state.js';

/**
 * Renders the paragraph with masked words
 * @param {string} vowel - The vowel to reveal in masked words
 */
export function renderParagraph(vowel) {
    const currentParagraph = getCurrentParagraph();
    if (!currentParagraph) return;
    
    // Create a list of all word positions that need to be replaced
    // Sort from end to start to avoid index shifting during replacement
    const allReplacements = getCurrentWords()
        .flatMap(word => 
            word.positions.map(pos => ({
                ...pos,
                word: word.word,
                found: word.found
            }))
        )
        .sort((a, b) => b.start - a.start);
    
    let maskedParagraph = currentParagraph.text;
    
    // Replace words one by one, starting from the end
    allReplacements.forEach(({ start, end, word, found }) => {
        const wordToReplace = maskedParagraph.substring(start, end);
        // Use different styling for found vs masked words
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

/**
 * Renders the clues list for hidden words
 */
export function renderClues() {
    const cluesList = document.getElementById('clues-list');
    cluesList.innerHTML = '';
    
    getCurrentWords().forEach(({ clue, word, found }, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `${idx + 1}. ${clue} (${word.length} letters) ${found ? '✓' : ''}`;
        if (found) li.classList.add('found');
        cluesList.appendChild(li);
    });
}

/**
 * Updates the score display
 */
export function updateScore() {
    document.getElementById('score-value').textContent = getCurrentScore();
}

/**
 * Displays the game over message with final score
 */
export function showGameOver() {    const score = getCurrentScore();
    const maxScore = getMaxScore();
    const scorePercentage = Math.round((score / maxScore) * 100);
    
    const input = document.getElementById('guess-input');
    input.disabled = true;
    input.placeholder = 'Game Complete!';
    
    const endGameMessage = document.createElement('div');
    endGameMessage.className = 'game-over-message';
    endGameMessage.innerHTML = `
        <h2>Congratulations! 🎉</h2>
        <p>You've found all the hidden words!</p>
        <p>Final Score: ${score}/${maxScore} (${scorePercentage}%)</p>
    `;
    
    document.getElementById('paragraph-container').insertAdjacentElement('afterend', endGameMessage);
}

/**
 * Sets up and returns vowel selection buttons
 * @returns {NodeList} Collection of vowel button elements
 */
export function setupVowelButtons() {
    const vowelButtons = document.querySelectorAll('.vowel-tile');
    return vowelButtons;
}

/**
 * Disables all vowel selection buttons
 */
export function disableVowelButtons() {
    const vowelButtons = document.querySelectorAll('.vowel-tile');
    vowelButtons.forEach(btn => btn.classList.add('disabled'));
}

/**
 * Resets the UI to its initial state
 * Clears game over message, resets buttons and input field
 */
export function resetUI() {
    const vowelButtons = document.querySelectorAll('.vowel-tile');
    vowelButtons.forEach(btn => btn.classList.remove('disabled'));
    
    const input = document.getElementById('guess-input');
    input.disabled = false;
    input.placeholder = 'Enter your guess...';
    
    const existingMessage = document.querySelector('.game-over-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    updateScore();
}
