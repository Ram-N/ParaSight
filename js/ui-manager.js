// UI rendering and DOM manipulation
import { 
    getCurrentParagraph,
    getCurrentWords,
    getCurrentScore,
    getMaxScore,
    maskWord
} from './game-state.js';

export function renderParagraph(vowel) {
    const currentParagraph = getCurrentParagraph();
    if (!currentParagraph) return;
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

export function updateScore() {
    document.getElementById('score-value').textContent = getCurrentScore();
}

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

export function setupVowelButtons() {
    const vowelButtons = document.querySelectorAll('.vowel-tile');
    return vowelButtons;
}

export function disableVowelButtons() {
    const vowelButtons = document.querySelectorAll('.vowel-tile');
    vowelButtons.forEach(btn => btn.classList.add('disabled'));
}

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
