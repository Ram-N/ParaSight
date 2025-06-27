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
  purchaseConsonant,
  getLetterCounts,
  marketState,
  getInitialCluesShown,
  getClueAttempts,
  getShownWordIndices,
} from "./game-state.js";

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
    .flatMap((word) =>
      word.positions.map((pos) => ({
        ...pos,
        word: word.word,
        found: word.found,
      }))
    )
    .sort((a, b) => b.start - a.start);

  let maskedParagraph = currentParagraph.text; // Create word to index mapping first
  const wordToIndexMap = new Map();
  getCurrentWords().forEach((gameWord, idx) => {
    wordToIndexMap.set(gameWord.word.toLowerCase(), idx);
  });

  // Replace words one by one, starting from the end
  allReplacements.forEach(({ start, end, word, found }) => {
    const wordToReplace = maskedParagraph.substring(start, end);
    const wordIndex = wordToIndexMap.get(word.toLowerCase());
    // Use different styling for found vs masked words
    const maskedWord = found
      ? `<span data-masked="true" data-clue-index="${wordIndex}" class="found">${wordToReplace}</span>`
      : `<span data-masked="true" data-clue-index="${wordIndex}">${maskWordWithPurchases(
          wordToReplace,
          vowel
        )}</span>`;

    maskedParagraph =
      maskedParagraph.substring(0, start) +
      maskedWord +
      maskedParagraph.substring(end);
  });

  // Add title if it exists
  let html = "";
  if (currentParagraph.title) {
    if (currentParagraph.title.length > 40) {
      html += `<div class=\"paragraph-title-small\">${currentParagraph.title}</div>`;
    } else {
      html += `<h2 class=\"paragraph-title\">${currentParagraph.title}</h2>`;
    }
  }
  html += maskedParagraph;

  updateElement("paragraph-container", (el) => {
    el.innerHTML = html;
  });
}

/**
 * Sets up hover interactions between clues and masked words
 */
function setupClueInteractions() {
  const cluesList = document.getElementById("clues-list");
  if (!cluesList) return;

  // Get all visible clues
  const visibleClues = Array.from(cluesList.getElementsByTagName("li"));

  /**
   * Helper function to highlight corresponding elements
   * @param {string} clueIndex - The index of the clue/word pair to highlight
   * @param {boolean} highlight - Whether to add or remove highlight
   */
  const highlightPair = (clueIndex, highlight) => {
    // Find the clue and all instances of its word
    const clue = document.querySelector(
      `#clues-list li[data-clue-index="${clueIndex}"]`
    );
    // Get the word index from the clue
    const wordIndex = clue ? clue.getAttribute("data-word-index") : null;
    
    // Find all instances of the word using the word index instead of clue index
    const wordInstances = wordIndex ? document.querySelectorAll(
      `[data-masked="true"][data-clue-index="${wordIndex}"]`
    ) : [];

    if (clue && wordInstances.length > 0) {
      // Remove any existing highlights
      if (highlight) {
        document
          .querySelectorAll(".highlight")
          .forEach((el) => el.classList.remove("highlight"));
      }

      // Add highlight to both the clue and all word instances
      requestAnimationFrame(() => {
        clue.classList.toggle("highlight", highlight);
        wordInstances.forEach((word) =>
          word.classList.toggle("highlight", highlight)
        );
      });
    }
  };

  // Set up hover effects on clues
  visibleClues.forEach((clue) => {
    const clueIndex = clue.getAttribute("data-clue-index");
    const wordIndex = clue.getAttribute("data-word-index");
    
    if (clueIndex && wordIndex) {
      clue.addEventListener("mouseenter", () => highlightPair(clueIndex, true));
      clue.addEventListener("mouseleave", () =>
        highlightPair(clueIndex, false)
      );

      clue.addEventListener("click", () => {
        const firstWord = document.querySelector(
          `[data-masked="true"][data-clue-index="${wordIndex}"]`
        );
        if (firstWord) {
          firstWord.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  });

  // Set up hover effects on words
  const maskedWords = document.querySelectorAll('[data-masked="true"]');
  maskedWords.forEach((word) => {
    const wordIndex = word.getAttribute("data-clue-index");
    
    if (wordIndex) {
      // Find the corresponding clue (if it's visible)
      const clue = document.querySelector(
        `#clues-list li[data-word-index="${wordIndex}"]`
      );
      
      if (clue) {
        const clueIndex = clue.getAttribute("data-clue-index");
        
        word.addEventListener("mouseenter", () => highlightPair(clueIndex, true));
        word.addEventListener("mouseleave", () =>
          highlightPair(clueIndex, false)
        );

        word.addEventListener("click", () => {
          if (clue) {
            clue.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });
      }
    }
  });
}

/**
 * Renders the clues list for hidden words with progressive revealing
 */
export function renderClues() {
  const cluesList = document.getElementById("clues-list");
  if (!cluesList) return;

  cluesList.innerHTML = "";

  // Get visible clues based on attempts made
  const words = getCurrentWords();
  let clueIndex = 0;
  
  // Get indices of words whose clues should be shown
  const shownWordIndices = getShownWordIndices();
  
  // Display clues for each word
  words.forEach((gameWord, wordIndex) => {
    const { clue, word, found } = gameWord;
    
    // Show clue if the word is found OR if it's in the list of shown word indices
    const shouldShowClue = found || shownWordIndices.includes(wordIndex);
    
    if (shouldShowClue) {
      const li = document.createElement("li");
      li.innerHTML = `${clue} (${word.length} letters) ${found ? "✓" : ""}`;
      if (found) li.classList.add("found");
      
      // Add data attributes for tracking
      li.setAttribute("data-visible", "true");
      li.setAttribute("data-word-index", wordIndex);
      li.setAttribute("data-clue-index", clueIndex);
      
      cluesList.appendChild(li);
      clueIndex++;
      
      // No need to track clues shown anymore
    }
  });

  // Set up hover interactions after rendering clues
  setupClueInteractions();
}

/**
 * Updates the score display
 */
export function updateScore() {
  updateElement(
    "score-value",
    (el) => (el.textContent = getCurrentScore().toString())
  );
}

/**
 * Displays the game over message with final score
 */
export function showGameOver() {
  const score = getCurrentScore();
  const maxScore = getMaxScore();
  const scorePercentage = Math.round((score / maxScore) * 100);

  const input = document.getElementById("guess-input");
  if (input && input instanceof HTMLInputElement) {
    input.disabled = true;
    input.placeholder = "Game Complete!";
  }

  const endGameMessage = document.createElement("div");
  endGameMessage.className = "game-over-message";
  endGameMessage.innerHTML = `
        <h2>Congratulations! 🎉</h2>
        <p>You've found all the hidden words!</p>
        <p>Final Score: ${score}/${maxScore} (${scorePercentage}%)</p>
    `;

  updateElement("paragraph-container", (el) =>
    el.insertAdjacentElement("afterend", endGameMessage)
  );
}

/**
 * Sets up and returns vowel selection buttons
 * @returns {NodeListOf<Element>} Collection of vowel button elements
 */
export function setupVowelButtons() {
  return document.querySelectorAll(".vowel-tile");
}

/**
 * Disables all vowel selection buttons
 */
export function disableVowelButtons() {
  document
    .querySelectorAll(".vowel-tile")
    .forEach((btn) => btn.classList.add("disabled"));
}

/**
 * Resets the UI to its initial state
 */
export function resetUI() {
  document
    .querySelectorAll(".vowel-tile")
    .forEach((btn) => btn.classList.remove("disabled"));

  const input = document.getElementById("guess-input");
  if (input && input instanceof HTMLInputElement) {
    input.disabled = false;
    input.placeholder = "Enter your guess...";
  }

  const existingMessage = document.querySelector(".game-over-message");
  if (existingMessage) {
    existingMessage.remove();
  }

  updateScore();
}

/**
 * Updates the letter count display on each tile
 */
export function updateLetterCounts() {
  const counts = getLetterCounts();
  document.querySelectorAll(".letter-tile").forEach((tile) => {
    const letter = tile.getAttribute("data-letter");
    if (!letter) return;

    const lowerLetter = letter.toLowerCase();
    const isVowel = "aeiou".includes(lowerLetter);
    const isPurchased = isVowel
      ? marketState.vowels.has(lowerLetter)
      : marketState.consonants.has(lowerLetter);

    if (isPurchased) {
      tile.classList.add("purchased");
      tile.classList.add("disabled");
      const countSpan = tile.querySelector(".count");
      if (countSpan) {
        countSpan.textContent = "";
      }
    } else {
      const count = counts[lowerLetter] || 0;
      const countSpan = tile.querySelector(".count");
      if (countSpan) {
        countSpan.textContent = count > 0 ? count.toString() : "";
      }
      tile.classList.toggle("disabled", count === 0);
      tile.classList.remove("purchased");
    }
  });
}

/**
 * Shows a toast message to the user
 * @param {string} message - Message to display
 * @param {'success'|'error'} [type='success'] - Type of toast
 */
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 10);

  // Remove after animation
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Sets up marketplace interactions
 */
export function setupMarketplace() {
  // Set up letter tile buttons
  const letterTiles = document.querySelectorAll(".letter-tile");

  // First check and mark any already purchased letters
  letterTiles.forEach((tile) => {
    const letter = tile.getAttribute("data-letter");
    if (!letter) return;

    const lowerLetter = letter.toLowerCase();
    if (
      marketState.vowels.has(lowerLetter) ||
      marketState.consonants.has(lowerLetter)
    ) {
      tile.classList.add("purchased");
      tile.classList.add("disabled");
    }
  });

  // Set up click handlers
  letterTiles.forEach((button) => {
    button.addEventListener("click", () => {
      // Ignore click if tile is disabled or purchased
      if (
        button.classList.contains("disabled") ||
        button.classList.contains("purchased")
      ) {
        return;
      }

      const letter = button.getAttribute("data-letter");
      if (!letter) return;

      const isVowel = "aeiou".includes(letter.toLowerCase());
      if (isVowel) {
        const result = purchaseVowel(letter);
        if (result.success) {
          button.classList.add("purchased");
          renderParagraph(getChosenVowel());
          setupClueInteractions(); // Re-attach event listeners after rendering
          updateScore();
          updateLetterCounts();
          showToast(
            `Vowel '${letter.toUpperCase()}' purchased for ${
              result.cost
            } points!`
          );
        } else {
          showToast(
            `Not enough points to buy vowel (Cost: ${result.cost})`,
            "error"
          );
        }
      } else {
        const result = purchaseConsonant(letter);
        if (result.success && result.consonant) {
          button.classList.add("purchased");
          renderParagraph(getChosenVowel());
          setupClueInteractions(); // Re-attach event listeners after rendering
          updateScore();
          updateLetterCounts();
          showToast(
            `Consonant '${letter.toUpperCase()}' revealed for ${
              result.cost
            } points!`
          );
        } else {
          showToast(
            `Not enough points to reveal a consonant (Cost: ${result.cost})`,
            "error"
          );
        }
      }
    });
  });

  // Initial letter count update
  updateLetterCounts();
}
