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
  revealWord,
  isInitPhase,
  isSelectionComplete,
  getSelectedVowel,
  getSelectedConsonants,
  setSelectedVowel,
  addSelectedConsonant,
  completeLetterSelection,
  updateActiveClueIndex,
  getActiveClueIndex,
  getLowestClueIndexSeen,
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
    .flatMap((word, wordIdx) =>
      word.positions.map((pos) => ({
        ...pos,
        word: word.word,
        found: word.found,
        revealed: word.revealed,
        wordIndex: wordIdx
      }))
    )
    .sort((a, b) => b.start - a.start);

  let maskedParagraph = currentParagraph.text; // Create word to index mapping first
  const wordToIndexMap = new Map();
  getCurrentWords().forEach((gameWord, idx) => {
    wordToIndexMap.set(gameWord.word.toLowerCase(), idx);
  });

  // Replace words one by one, starting from the end
  allReplacements.forEach(({ start, end, word, found, revealed, wordIndex }) => {
    const wordToReplace = maskedParagraph.substring(start, end);
    // Use different styling for found vs masked vs revealed words
    let maskedWord;
    
    if (found) {
      // Word found by player
      maskedWord = `<span data-masked="true" data-clue-index="${wordIndex}" class="found">${wordToReplace}</span>`;
    } else if (revealed) {
      // Word revealed by player
      maskedWord = `<span data-masked="true" data-clue-index="${wordIndex}" class="revealed">${wordToReplace}</span>`;
    } else {
      // Word still hidden
      maskedWord = `<span data-masked="true" data-clue-index="${wordIndex}">${maskWordWithPurchases(
          wordToReplace,
          vowel,
          wordIndex
        )}</span>`;
    }

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

  // Check if we're in the initialization phase - if so, disable all interactions
  const inInitPhase = isInitPhase() && !isSelectionComplete();
  
  // Add a class to the clues container if in init phase
  const cluesContainer = document.getElementById("clues-container");
  if (cluesContainer) {
    cluesContainer.classList.toggle("disabled-clues", inInitPhase);
  }
  
  // Get all visible clues
  const visibleClues = Array.from(cluesList.getElementsByTagName("li"));
  
  // Add click handlers for all clue icons
  visibleClues.forEach(clue => {
    const wordIndex = clue.getAttribute('data-word-index');
    const clueText = clue.querySelector('.clue-text');
    
    // Add click handlers for each difficulty icon
    const clueIcons = clue.querySelectorAll('.clue-icon');
    clueIcons.forEach(icon => {
      icon.addEventListener('click', (event) => {
        // Stop propagation to prevent triggering the clue highlight
        event.stopPropagation();
        
        // Make sure letter selection is complete
        if (isInitPhase() || !isSelectionComplete()) {
          showToast("Please select 1 vowel and 2 consonants first", "error");
          return;
        }
        
        // Get the clue index (difficulty level)
        const clueIndex = parseInt(icon.getAttribute('data-clue-index'), 10);
        
        // Update active state of icons
        clueIcons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
        
        // Get the clues data from the parent li element
        try {
          const cluesData = JSON.parse(clue.getAttribute('data-clues') || '[]');
          const selectedClue = cluesData[clueIndex];
          
          if (selectedClue && clueText) {
            // Update the displayed clue text
            const word = getCurrentWords()[parseInt(wordIndex, 10)];
            clueText.textContent = `${selectedClue.clue} (${word?.word?.length || 0})`;
            
            // Update the active clue index in the UI
            clue.setAttribute('data-active-clue', clueIndex.toString());
            
            // Update the active clue index in the game state
            updateActiveClueIndex(parseInt(wordIndex, 10), clueIndex);
          }
        } catch (e) {
          console.error('Error parsing clues data:', e);
        }
      });
    });
    
    // Add click handler for the eye icon (reveal word)
    const eyeIcon = clue.querySelector('.clue-eye');
    if (eyeIcon) {
      eyeIcon.addEventListener('click', (event) => {
        // Stop propagation to prevent triggering the clue highlight
        event.stopPropagation();
        
        // Make sure letter selection is complete
        if (isInitPhase() || !isSelectionComplete()) {
          showToast("Please select 1 vowel and 2 consonants first", "error");
          return;
        }
        
        // Reveal the word using our game state function
        const result = revealWord(parseInt(wordIndex, 10));
        
        if (result.success) {
          // Update the UI to reflect the revealed word
          renderParagraph(getChosenVowel());
          renderClues();
          updateScore();
          updateLetterCounts();
          
          // Show toast notification
          showToast(`Word revealed for ${result.pointsDeducted} link penalty`, "info");
        }
      });
    }
  });

  /**
   * Helper function to highlight corresponding elements
   * @param {string} clueIndex - The index of the clue/word pair to highlight
   * @param {boolean} highlight - Whether to add or remove highlight
   */
  const highlightPair = (clueIndex, highlight) => {
    // Make sure letter selection is complete
    if (isInitPhase() || !isSelectionComplete()) {
      return;
    }
    
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
        // Make sure letter selection is complete
        if (isInitPhase() || !isSelectionComplete()) {
          showToast("Please select 1 vowel and 2 consonants first", "error");
          return;
        }
        
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
          // Make sure letter selection is complete
          if (isInitPhase() || !isSelectionComplete()) {
            showToast("Please select 1 vowel and 2 consonants first", "error");
            return;
          }
          
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
    const { word, found, revealed, clues } = gameWord;
    
    // Show clue if the word is found OR revealed OR if it's in the list of shown word indices
    const shouldShowClue = found || revealed || shownWordIndices.includes(wordIndex);
    
    if (shouldShowClue && Array.isArray(clues) && clues.length > 0) {
      const li = document.createElement("li");
      let statusMark = "";
      
      if (found) {
        statusMark = "✓"; // Checkmark for found words
      } else if (revealed) {
        statusMark = "⚠️"; // Warning symbol for revealed words
      }
      
      // Get the active clue index from the game state
      const activeClueIndex = getActiveClueIndex(wordIndex);
      const activeClue = clues[activeClueIndex]?.clue || clues[0]?.clue || "";
      const cluePoints = clues[activeClueIndex]?.points || clues[0]?.points || 0;
      
      // Create a container for clue text and icons
      const clueTextSpan = document.createElement("span");
      clueTextSpan.className = "clue-text";
      clueTextSpan.textContent = `${activeClue} (${word.length})`;
      
      // Create a container for all icons
      const iconsContainer = document.createElement("span");
      iconsContainer.className = "clue-icons";
      
      // Only show icons if word is not found and not revealed
      if (!found && !revealed) {
        // Create icons for each clue type (difficulty level)
        // Get the lowest clue index seen to determine which clues are available at full points
        const lowestClueIndexSeen = getLowestClueIndexSeen(wordIndex);
        
        // Icon 1: Hard/Indirect clue
        const indirectIcon = document.createElement("span");
        indirectIcon.className = `clue-icon clue-icon-hard ${activeClueIndex === 0 ? 'active' : ''}`;
        // Add a class if this clue is no longer available at full points
        if (lowestClueIndexSeen > 0) {
          indirectIcon.classList.add('reduced-points');
        }
        indirectIcon.innerHTML = '<i class="fa fa-lock"></i>';
        
        // Update title to show if points are reduced
        const cluePoints = clues[0]?.points || 0;
        const actualPoints = lowestClueIndexSeen > 0 ? clues[lowestClueIndexSeen]?.points || 0 : cluePoints;
        indirectIcon.title = lowestClueIndexSeen > 0 
          ? `Indirect Clue - ${actualPoints} links (reduced from ${cluePoints})`
          : `Indirect Clue - ${cluePoints} links`;
          
        indirectIcon.setAttribute("data-clue-index", "0");
        iconsContainer.appendChild(indirectIcon);
        
        // Icon 2: Intermediate/Suggestive clue
        if (clues.length > 1) {
          const suggestiveIcon = document.createElement("span");
          suggestiveIcon.className = `clue-icon clue-icon-medium ${activeClueIndex === 1 ? 'active' : ''}`;
          // Add a class if this clue is no longer available at full points
          if (lowestClueIndexSeen > 1) {
            suggestiveIcon.classList.add('reduced-points');
          }
          suggestiveIcon.innerHTML = '<i class="fa fa-lightbulb"></i>';
          
          // Update title to show if points are reduced
          const mediumCluePoints = clues[1]?.points || 0;
          const actualMediumPoints = lowestClueIndexSeen > 1 ? clues[lowestClueIndexSeen]?.points || 0 : mediumCluePoints;
          suggestiveIcon.title = lowestClueIndexSeen > 1 
            ? `Suggestive Clue - ${actualMediumPoints} links (reduced from ${mediumCluePoints})`
            : `Suggestive Clue - ${mediumCluePoints} links`;
            
          suggestiveIcon.setAttribute("data-clue-index", "1");
          iconsContainer.appendChild(suggestiveIcon);
        }
        
        // Icon 3: Easy/Straight clue
        if (clues.length > 2) {
          const straightIcon = document.createElement("span");
          straightIcon.className = `clue-icon clue-icon-easy ${activeClueIndex === 2 ? 'active' : ''}`;
          // No need to check for reduced points for the easiest clue
          straightIcon.innerHTML = '<i class="fa fa-info-circle"></i>';
          straightIcon.title = `Straight Clue - ${clues[2]?.points || 0} links`;
          straightIcon.setAttribute("data-clue-index", "2");
          iconsContainer.appendChild(straightIcon);
        }
        
        // Icon 4: Reveal word (eye icon)
        const revealIcon = document.createElement("span");
        revealIcon.className = "clue-eye";
        revealIcon.innerHTML = '<i class="fa fa-eye"></i>';
        revealIcon.title = `Reveal - ${gameWord.points || 15} link penalty`;
        iconsContainer.appendChild(revealIcon);
      } else {
        // Add the status mark to the text for found/revealed words
        clueTextSpan.textContent += ` ${statusMark}`;
      }
      
      // Store clues data as a data attribute for later access
      li.setAttribute("data-clues", JSON.stringify(clues.map(c => ({ 
        clue: c.clue, 
        points: c.points,
        type: c.type
      }))));
      
      // Add elements to the list item
      li.appendChild(clueTextSpan);
      li.appendChild(iconsContainer);
      
      // Add appropriate class
      if (found) li.classList.add("found");
      if (revealed) li.classList.add("revealed");
      
      // Add data attributes for tracking
      li.setAttribute("data-visible", "true");
      li.setAttribute("data-word-index", wordIndex);
      li.setAttribute("data-clue-index", String(clueIndex));
      
      // Get the actual active clue index from the game state
      const wordActiveClueIndex = getActiveClueIndex(wordIndex).toString();
      li.setAttribute("data-active-clue", wordActiveClueIndex); // Use the active clue from the game state
      
      cluesList.appendChild(li);
      clueIndex++;
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
  // Force complete cleanup of all UI state
  console.log("Performing complete UI reset");
  
  // Reset vowel tiles
  document
    .querySelectorAll(".vowel-tile")
    .forEach((btn) => btn.classList.remove("disabled"));
    
  // Reset letter tiles in keyboard/marketplace
  document
    .querySelectorAll(".letter-tile")
    .forEach((tile) => {
      // Remove all possible state classes
      tile.classList.remove("disabled");
      tile.classList.remove("purchased");
      tile.classList.remove("selected");
      
      // Clear any counts
      const countSpan = tile.querySelector(".count");
      if (countSpan) {
        countSpan.textContent = "";
      }
      
      // Remove any event listeners by cloning and replacing
      const newTile = tile.cloneNode(true);
      tile.parentNode.replaceChild(newTile, tile);
    });
    
  // Reset selected letters display
  const selectedVowelEl = document.getElementById("selected-vowel");
  if (selectedVowelEl) {
    selectedVowelEl.textContent = "-";
  }
  
  const selectedConsonantsEl = document.getElementById("selected-consonants");
  if (selectedConsonantsEl) {
    selectedConsonantsEl.textContent = "- -";
  }
  
  // Show selection instructions
  const selectionInstructions = document.getElementById("selection-instructions");
  if (selectionInstructions) {
    selectionInstructions.style.display = "block";
  }
  
  // Reset clues container
  const cluesContainer = document.getElementById("clues-container");
  if (cluesContainer) {
    cluesContainer.classList.add("disabled-clues");
  }
  
  // Clear clues list
  const cluesList = document.getElementById("clues-list");
  if (cluesList) {
    cluesList.innerHTML = "";
  }
  
  // Reset input field
  const input = document.getElementById("guess-input");
  if (input && input instanceof HTMLInputElement) {
    input.disabled = false;
    input.placeholder = "Enter your guess...";
    input.value = "";
  }
  
  // Clear paragraph container
  const paragraphContainer = document.getElementById("paragraph-container");
  if (paragraphContainer) {
    paragraphContainer.innerHTML = "";
  }

  // Remove any game over message
  const existingMessage = document.querySelector(".game-over-message");
  if (existingMessage) {
    existingMessage.remove();
  }

  // Reset score display
  updateScore();
  
  // Clear any toast messages
  const toasts = document.querySelectorAll(".toast");
  toasts.forEach(toast => toast.remove());
  
  console.log("UI completely reset for new game");
}

/**
 * Updates the letter count display on each tile
 * @param {boolean} [showCounts=true] - Whether to show counts or hide them
 */
export function updateLetterCounts(showCounts = true) {
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
        // Only show counts if showCounts is true
        countSpan.textContent = showCounts && count > 0 ? count.toString() : "";
      }
      tile.classList.toggle("disabled", showCounts && count === 0);
      tile.classList.remove("purchased");
    }
  });
}

/**
 * Shows a toast message to the user
 * @param {string} message - Message to display
 * @param {'success'|'error'|'info'} [type='success'] - Type of toast
 * @param {number} [duration=3000] - Duration in milliseconds
 */
export function showToast(message, type = "success", duration = 3000) {
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
  }, duration);
}

/**
 * Sets up marketplace interactions
 */
export function setupMarketplace() {
  // Set up letter tile buttons
  const letterTiles = document.querySelectorAll(".letter-tile");

  // Check if we're in the initial selection phase
  const isInit = isInitPhase();
  const selectionComplete = isSelectionComplete();

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

  // Show/hide the selection instructions based on initialization state
  const selectionInstructions = document.getElementById("selection-instructions");
  if (selectionInstructions) {
    selectionInstructions.style.display = isInit && !selectionComplete ? "block" : "none";
    
    // Also update the selection display
    const selectedVowelEl = document.getElementById("selected-vowel");
    if (selectedVowelEl) {
      const vowel = getSelectedVowel();
      selectedVowelEl.textContent = vowel ? vowel.toUpperCase() : "-";
    }
    
    const selectedConsonantsEl = document.getElementById("selected-consonants");
    if (selectedConsonantsEl) {
      const consonants = getSelectedConsonants().map(c => c.toUpperCase());
      while (consonants.length < 2) {
        consonants.push("-");
      }
      selectedConsonantsEl.textContent = consonants.length > 0 ? consonants.join(" ") : "- -";
    }
  }

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
      
      // Handle the initial letter selection phase
      if (isInitPhase()) {
        if (isVowel) {
          const selectedVowel = getSelectedVowel();
          if (!selectedVowel) {
            // Select this vowel
            if (setSelectedVowel(letter)) {
              button.classList.add("selected");
              
              // Update the selection display
              const selectedVowelEl = document.getElementById("selected-vowel");
              if (selectedVowelEl) {
                selectedVowelEl.textContent = letter.toUpperCase();
              }
              
              // Check if selection is complete
              checkSelectionComplete();
            }
          } else {
            showToast("You've already selected a vowel. Please select consonants.", "error");
          }
        } else {
          // It's a consonant
          const selectedConsonants = getSelectedConsonants();
          if (selectedConsonants.length < 2) {
            // Select this consonant
            if (addSelectedConsonant(letter)) {
              button.classList.add("selected");
              
              // Update the selection display
              const selectedConsonantsEl = document.getElementById("selected-consonants");
              if (selectedConsonantsEl) {
                const consonants = getSelectedConsonants().map(c => c.toUpperCase());
                while (consonants.length < 2) {
                  consonants.push("-");
                }
                selectedConsonantsEl.textContent = consonants.join(" ");
              }
              
              // Check if selection is complete
              checkSelectionComplete();
            }
          } else {
            showToast("You've already selected 2 consonants.", "error");
          }
        }
      } else {
        // Regular gameplay phase
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
              } links!`
            );
          } else {
            showToast(
              `Not enough links to buy vowel (Cost: ${result.cost})`,
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
              } links!`
            );
          } else {
            showToast(
              `Not enough links to reveal a consonant (Cost: ${result.cost})`,
              "error"
            );
          }
        }
      }
    });
  });

  // Initial letter count update - don't show counts if in init phase
  updateLetterCounts(!isInit);
}

/**
 * Checks if the letter selection is complete and applies the selection
 */
function checkSelectionComplete() {
  const selectedVowel = getSelectedVowel();
  const selectedConsonants = getSelectedConsonants();
  
  if (selectedVowel && selectedConsonants.length === 2) {
    // Complete the selection
    if (completeLetterSelection()) {
      // Apply the selection to the game
      applyLetterSelection();
    }
  }
}

/**
 * Applies the letter selection to the game state and UI
 */
function applyLetterSelection() {
  // Get the selected letters
  const vowel = getSelectedVowel();
  const consonants = getSelectedConsonants();
  
  // Hide the selection instructions
  const selectionInstructions = document.getElementById("selection-instructions");
  if (selectionInstructions) {
    selectionInstructions.style.display = "none";
  }
  
  // Enable clue interactions
  const cluesContainer = document.getElementById("clues-container");
  if (cluesContainer) {
    cluesContainer.classList.remove("disabled-clues");
  }
  
  // Update the UI
  renderParagraph(vowel);
  setupClueInteractions();
  updateScore();
  updateLetterCounts(true);
  
  // Show toast confirmation
  showToast(
    `Letters selected: ${vowel.toUpperCase()}, ${consonants[0].toUpperCase()}, ${consonants[1].toUpperCase()}. Game started!`,
    "success"
  );
}
