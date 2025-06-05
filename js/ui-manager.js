/**
 * @fileoverview UI rendering and DOM manipulation module for ParaSight.
 * Handles all user interface updates and DOM interactions.
 * @module ui-manager
 */

/**
 * @typedef {import('./game-state.js').GameWord} GameWord
 * @typedef {import('./game-state.js').GameParagraph} GameParagraph
 */

import { 
    getCurrentParagraph,
    getCurrentWords,
    getCurrentScore,
    getMaxScore,
    maskWord,
    maskWordWithPurchases,
    getChosenVowel,
    purchaseVowel,
    purchaseConsonant
} from './game-state.js';

/**
 * Updates the DOM element if it exists
 * @param {string} id - Element ID
 * @param {(element: HTMLElement) => void} updater - Function to update the element
 */
function updateElement(id, updater) {
    const element = document.getElementById(id);
    if (element) updater(element);
}

/**
 * Renders the paragraph with masked words
 * @param {string} vowel - The vowel to reveal in masked words
 */
export function renderParagraph(vowel) {
    /** @type {GameParagraph|null} */
    const currentParagraph = getCurrentParagraph();
    if (!currentParagraph) return;
    
    // Create a list of all word positions that need to be replaced
    // Sort from end to start to avoid index shifting during replacement
    const allReplacements = getCurrentWords()
        .flatMap(word => 
            word.positions.map((pos) => ({
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
            : `<span data-masked="true">${maskWordWithPurchases(wordToReplace, vowel)}</span>`;
        
        maskedParagraph = 
            maskedParagraph.substring(0, start) + 
            maskedWord + 
            maskedParagraph.substring(end);
    });
    
    updateElement('paragraph-container', 
        (el) => { el.innerHTML = maskedParagraph; });
}

/**
 * Renders the clues list for hidden words
 */
export function renderClues() {
    const cluesList = document.getElementById('clues-list');
    if (!cluesList) return;
    
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
    updateElement('score-value', 
        (el) => el.textContent = getCurrentScore().toString());
}

/**
 * Displays the game over message with final score
 */
export function showGameOver() {
    const score = getCurrentScore();
    const maxScore = getMaxScore();
    const scorePercentage = Math.round((score / maxScore) * 100);
    
    const input = document.getElementById('guess-input');
    if (input && input instanceof HTMLInputElement) {
        input.disabled = true;
        input.placeholder = 'Game Complete!';
    }
    
    const endGameMessage = document.createElement('div');
    endGameMessage.className = 'game-over-message';
    endGameMessage.innerHTML = `
        <h2>Congratulations! 🎉</h2>
        <p>You've found all the hidden words!</p>
        <p>Final Score: ${score}/${maxScore} (${scorePercentage}%)</p>
    `;
    
    updateElement('paragraph-container', 
        (el) => el.insertAdjacentElement('afterend', endGameMessage));
}

/**
 * Sets up and returns vowel selection buttons
 * @returns {NodeListOf<Element>} Collection of vowel button elements
 */
export function setupVowelButtons() {
    return document.querySelectorAll('.vowel-tile');
}

/**
 * Disables all vowel selection buttons
 */
export function disableVowelButtons() {
    document.querySelectorAll('.vowel-tile')
        .forEach(btn => btn.classList.add('disabled'));
}

/**
 * Resets the UI to its initial state
 */
export function resetUI() {
    document.querySelectorAll('.vowel-tile')
        .forEach(btn => btn.classList.remove('disabled'));
    
    const input = document.getElementById('guess-input');
    if (input && input instanceof HTMLInputElement) {
        input.disabled = false;
        input.placeholder = 'Enter your guess...';
    }
    
    const existingMessage = document.querySelector('.game-over-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    updateScore();
}

/**
 * Sets up marketplace interactions
 */
export function setupMarketplace() {
    // Set up vowel purchase buttons
    const vowelButtons = document.querySelectorAll('.vowel-tile');
    vowelButtons.forEach(button => {
        button.addEventListener('click', () => {
            const vowel = button.getAttribute('data-vowel');
            if (!vowel) return;
            
            const result = purchaseVowel(vowel);
            if (result.success) {
                button.classList.add('disabled');
                renderParagraph(getChosenVowel());
                updateScore();
                showToast(`Vowel '${vowel.toUpperCase()}' purchased for ${result.cost} points!`);
            } else {
                showToast(`Not enough points to buy vowel (Cost: ${result.cost})`, 'error');
            }
        });
    });

    // Set up consonant purchase button
    const consonantButton = document.querySelector('.consonant-tile');
    if (consonantButton) {
        consonantButton.addEventListener('click', () => {
            const result = purchaseConsonant();
            if (result.success && result.consonant) {
                renderParagraph(getChosenVowel());
                updateScore();
                showToast(`Common consonant '${result.consonant.toUpperCase()}' revealed for ${result.cost} points!`);
            } else {
                showToast(`Not enough points to reveal a consonant (Cost: ${result.cost})`, 'error');
            }
        });
    }
}

/**
 * Shows a toast message to the user
 * @param {string} message - Message to display
 * @param {'success'|'error'} [type='success'] - Type of toast
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after animation
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
