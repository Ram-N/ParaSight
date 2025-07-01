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
  gameState,
  revealSelectedLetters,
} from "./game-state.js";

import {
  celebrateGameOver,
  highlightCorrectWord,
  createSparklesAroundElement
} from "./animations.js";

/**
 * A map to store currently animated clues to prevent duplicate animations
 * @type {Map<string, boolean>}
 */
const animatingClues = new Map();

/**
 * A map to track chain links that have been animated
 * @type {Map<number, boolean>}
 */
const animatedChainLinks = new Map();

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
 * Animates the tumble down effect for a clue when its word is found
 * @param {string} word - The word that was found
 * @returns {boolean} Whether the animation was successfully started
 */
export function animateClueForWord(word) {
  if (!word) return false;
  
  // Normalize the word to lowercase for comparison
  const normalizedWord = word.toLowerCase();
  
  // If this word is already being animated, skip
  if (animatingClues.has(normalizedWord)) return false;
  
  // Find the clue element for this word
  const clueElements = document.querySelectorAll('#clues-list .active-clues-container li');
  let targetClue = null;
  
  // First try matching by data-word attribute
  clueElements.forEach(clue => {
    const clueWord = clue.getAttribute('data-word')?.toLowerCase();
    if (clueWord === normalizedWord) {
      targetClue = clue;
    }
  });
  
  // If we didn't find it that way, try looking at the clue text content
  if (!targetClue) {
    clueElements.forEach(clue => {
      const clueText = clue.textContent.toLowerCase();
      if (clueText.includes(`(${word.length})`)) {
        // This clue is for a word of the same length
        targetClue = clue;
      }
    });
  }
  
  if (!targetClue) {
    console.log(`Could not find clue element for word: ${word}`);
    // Even without animation, make sure clues are re-rendered to show in solved section
    setTimeout(() => renderClues(), 100);
    
    // Update chain links even if clue animation fails
    updateChainLinks();
    return false;
  }
  
  // Mark this clue as currently animating
  animatingClues.set(normalizedWord, true);
  
  // Add the tumble-down class to trigger animation
  targetClue.classList.add('tumble-down');
  
  // Update chain links immediately to show progress
  updateChainLinks();
  
  // When animation completes, re-render clues to move this item to the solved section
  setTimeout(() => {
    renderClues();
    // Remove from animating map
    animatingClues.delete(normalizedWord);
  }, 2500); // Match animation duration (2.5s)
  
  return true;
}

/**
 * Updates the input field and submit button state based on game phase
 */
export function updateInputState() {
  const input = document.getElementById("guess-input");
  const submitButton = document.getElementById("submit-guess");
  
  if (!input || !submitButton) return;
  
  // Check if we're in initialization phase and selection is not complete
  const inSelectionPhase = isInitPhase() && !isSelectionComplete();
  
  // Disable/enable based on game phase
  input.disabled = inSelectionPhase;
  submitButton.disabled = inSelectionPhase;
  
  if (inSelectionPhase) {
    input.placeholder = "Please select 1 vowel and 2 consonants first...";
    input.classList.add("disabled");
    submitButton.classList.add("disabled");
  } else {
    input.placeholder = "Enter your guess...";
    input.classList.remove("disabled");
    submitButton.classList.remove("disabled");
  }
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

  // Set up interactions between clues and masked words
  setupClueInteractions();
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
        
        // Get the word before we reveal it
        const wordObj = getCurrentWords()[parseInt(wordIndex, 10)];
        
        // Reveal the word using our game state function
        const result = revealWord(parseInt(wordIndex, 10));
        
        if (result.success) {
          // Animate the clue tumbling down
          if (wordObj && wordObj.word) {
            animateClueForWord(wordObj.word);
          }
          
          // Update the UI to reflect the revealed word
          renderParagraph(getChosenVowel());
          renderClues();
          updateScore(); // This now also updates chain links
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
 * Separates active and solved clues with a tumble-down animation
 */
export function renderClues() {
  const cluesList = document.getElementById("clues-list");
  if (!cluesList) return;

  cluesList.innerHTML = "";
  
  // Create containers for active and solved clues
  const activeCluesContainer = document.createElement("div");
  activeCluesContainer.className = "active-clues-container";
  
  const solvedCluesContainer = document.createElement("div");
  solvedCluesContainer.className = "solved-clues-container";
  
  // Add a heading for the solved clues section
  const solvedHeading = document.createElement("div");
  solvedHeading.className = "solved-clues-heading";
  solvedHeading.textContent = "Solved Clues";
  solvedCluesContainer.appendChild(solvedHeading);

  // Get visible clues based on attempts made
  const words = getCurrentWords();
  let clueIndex = 0;
  
  // Get indices of words whose clues should be shown
  const shownWordIndices = getShownWordIndices();
  
  // Counters for active and solved clues
  let activeClueCount = 0;
  let solvedClueCount = 0;
  
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
        indirectIcon.setAttribute('data-clue-index', '0');
        iconsContainer.appendChild(indirectIcon);
        
        // Only show medium and easy clues if there are more than 1 clue
        if (clues.length > 1) {
          // Icon 2: Medium/Suggestive clue
          const suggestiveIcon = document.createElement("span");
          suggestiveIcon.className = `clue-icon clue-icon-medium ${activeClueIndex === 1 ? 'active' : ''}`;
          suggestiveIcon.innerHTML = '<i class="fa fa-unlock-alt"></i>';
          suggestiveIcon.title = `Suggestive Clue - ${clues[1]?.points || 0} links`;
          suggestiveIcon.setAttribute('data-clue-index', '1');
          iconsContainer.appendChild(suggestiveIcon);
        }
        
        // Only show easy clue if there are at least 3 clues
        if (clues.length > 2) {
          // Icon 3: Easy/Straight clue
          const straightIcon = document.createElement("span");
          straightIcon.className = `clue-icon clue-icon-easy ${activeClueIndex === 2 ? 'active' : ''}`;
          straightIcon.innerHTML = '<i class="fa fa-unlock"></i>';
          straightIcon.title = `Straight Clue - ${clues[2]?.points || 0} links`;
          straightIcon.setAttribute('data-clue-index', '2');
          iconsContainer.appendChild(straightIcon);
        }
        
        // Add eye icon for revealing the word
        const eyeIcon = document.createElement("span");
        eyeIcon.className = "clue-eye";
        eyeIcon.innerHTML = '<i class="fa fa-eye"></i>';
        eyeIcon.title = `Reveal Word (-${gameState.current.revealPenalty} links)`;
        iconsContainer.appendChild(eyeIcon);
      } else if (statusMark) {
        // If the word is found or revealed, append the status mark to the clue text
        clueTextSpan.textContent = `${activeClue} (${word.length}) ${statusMark}`;
      }
      
      li.appendChild(clueTextSpan);
      li.appendChild(iconsContainer);
      
      // Add class if the word is found
      if (found) {
        li.classList.add("found");
      } else if (revealed) {
        li.classList.add("revealed");
      }
      
      // Set data attributes to track word and clue
      li.setAttribute("data-word", word);
      li.setAttribute("data-word-index", wordIndex.toString());
      li.setAttribute("data-clue-index", clueIndex.toString());
      li.setAttribute("data-active-clue", activeClueIndex.toString());
      li.setAttribute("data-visible", "true");
      
      // Store clue data as JSON in a data attribute for reference
      li.setAttribute("data-clues", JSON.stringify(clues));
      
      // Add to appropriate container
      if (found || revealed) {
        solvedCluesContainer.appendChild(li);
        solvedClueCount++;
      } else {
        activeCluesContainer.appendChild(li);
        activeClueCount++;
      }
      
      clueIndex++;
    }
  });
  
  // Add the containers to the main clues list
  cluesList.appendChild(activeCluesContainer);
  
  // Only add solved container if there are solved clues
  if (solvedClueCount > 0) {
    cluesList.appendChild(solvedCluesContainer);
  }
  
  // Set up hover interactions
  setupClueInteractions();
}

/**
 * Creates and updates the chain links progress indicator
 */
export function updateChainLinks() {
  const chainLinksContainer = document.getElementById("chain-links");
  if (!chainLinksContainer) return;
  
  // Get the current words and calculate progress
  const words = getCurrentWords();
  const totalWords = words.length;
  
  // If no words or container not ready, exit
  if (totalWords === 0) return;
  
  // Count found and revealed words
  const foundWords = words.filter(word => word.found).length;
  const revealedWords = words.filter(word => !word.found && word.revealed).length;
  
  // Clear existing content if number of links doesn't match
  if (chainLinksContainer.children.length !== totalWords) {
    chainLinksContainer.innerHTML = "";
    
    // Create all chain links (active and inactive)
    for (let i = 0; i < totalWords; i++) {
      const chainLink = document.createElement("div");
      chainLink.className = "chain-link inactive";
      
      // Alternate link directions and set as CSS variable for animations
      const rotation = i % 2 === 0 ? 10 : -10;
      chainLink.style.setProperty('--rotation', `${rotation}deg`);
      chainLink.style.transform = `rotate(${rotation}deg)`;
      
      // Adjust position to create a slight wave pattern
      const verticalOffset = i % 4 < 2 ? 0 : 3;
      chainLink.style.marginTop = `${verticalOffset}px`;
      
      chainLink.innerHTML = '<i class="fas fa-link"></i>';
      chainLink.setAttribute("data-index", i.toString());
      chainLink.setAttribute("title", `Word ${i + 1} of ${totalWords}`);
      chainLinksContainer.appendChild(chainLink);
    }
  }
  
  // Now update the status of each link
  const chainLinks = chainLinksContainer.querySelectorAll(".chain-link");
  
  // Update each link based on the corresponding word's status
  words.forEach((word, index) => {
    const chainLink = chainLinks[index];
    if (!chainLink) return;
    
    // Set appropriate class based on word status
    if (word.found) {
      // Word was found by player
      if (!chainLink.classList.contains("active")) {
        chainLink.classList.remove("inactive", "revealed");
        chainLink.classList.add("active");
        
        // Apply rotation using CSS variable set earlier
        chainLink.style.transform = `scale(1.2) rotate(var(--rotation, 10deg))`;
        
        // Add animation class if this is a newly found word
        if (!animatedChainLinks.has(index)) {
          chainLink.classList.add("chain-link-new");
          animatedChainLinks.set(index, true);
          
          // Remove animation class after animation completes
          setTimeout(() => {
            chainLink.classList.remove("chain-link-new");
          }, 800);
        }
      }
      chainLink.setAttribute("title", `Word ${index + 1} found!`);
    } 
    else if (word.revealed) {
      // Word was revealed by player
      if (!chainLink.classList.contains("revealed")) {
        chainLink.classList.remove("inactive", "active");
        chainLink.classList.add("revealed");
        
        // Apply rotation using CSS variable set earlier
        chainLink.style.transform = `scale(1.1) rotate(var(--rotation, 10deg))`;
        
        // Add animation class if this is a newly revealed word
        if (!animatedChainLinks.has(index)) {
          chainLink.classList.add("chain-link-new");
          animatedChainLinks.set(index, true);
          
          // Remove animation class after animation completes
          setTimeout(() => {
            chainLink.classList.remove("chain-link-new");
          }, 800);
        }
      }
      chainLink.setAttribute("title", `Word ${index + 1} revealed`);
    }
    else {
      // Word is still hidden
      chainLink.classList.remove("active", "revealed");
      chainLink.classList.add("inactive");
      
      // Apply rotation using CSS variable set earlier
      chainLink.style.transform = `rotate(var(--rotation, 10deg))`;
      
      chainLink.setAttribute("title", `Word ${index + 1} of ${totalWords}`);
    }
  });
}

/**
 * Updates the score display with current and max scores
 */
export function updateScore() {
  // Update current score
  updateElement(
    "score-value",
    (el) => (el.textContent = getCurrentScore().toString())
  );
  
  // Update max score
  updateElement(
    "max-score-value",
    (el) => (el.textContent = getMaxScore().toString())
  );
  
  // Also update chain links whenever score is updated
  updateChainLinks();
}

/**
 * Displays the game over message with final score and celebration animations
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
        <p>Final Score: <span class="final-score">${score}</span> <span class="max-score">(Max Possible: ${maxScore})</span> - ${scorePercentage}%</p>
    `;

  updateElement("paragraph-container", (el) =>
    el.insertAdjacentElement("afterend", endGameMessage)
  );
  
  // Start the celebration animations
  setTimeout(() => {
    celebrateGameOver();
  }, 300);
}

/**
 * Shows a toast notification message
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, info)
 * @param {number} duration - Duration in milliseconds to show the toast
 */
export function showToast(message, type = "info", duration = 3000) {
  // Remove any existing toast
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  // Create new toast
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add to document
  document.body.appendChild(toast);

  // Show the toast with animation
  setTimeout(() => toast.classList.add("show"), 10);

  // Hide after duration
  setTimeout(() => {
    toast.classList.remove("show");
    // Remove from DOM after animation completes
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Updates the letter tile counts in the marketplace
 * @param {boolean} showCounts - Whether to show counts or hide them
 */
export function updateLetterCounts(showCounts = true) {
  // Update the letters display with remaining counts
  const letterTiles = document.querySelectorAll(".letter-tile");
  const letterCounts = getLetterCounts();
  
  letterTiles.forEach((tile) => {
    const letter = tile.getAttribute("data-letter");
    if (!letter) return;
    
    // Find the count span
    const countSpan = tile.querySelector(".count");
    if (!countSpan) return;
    
    // Get the count for this letter
    const count = letterCounts[letter] || 0;
    
    // Update the count display based on showCounts parameter
    if (showCounts) {
      // Only show non-zero counts
      countSpan.textContent = count > 0 ? count.toString() : "";
    } else {
      // Hide all counts in initial selection phase
      countSpan.textContent = "";
    }
  });
}

/**
 * Sets up the marketplace interactions including letter selection
 */
export function setupMarketplace() {
  // Set up letter selection in the marketplace
  const letterTiles = document.querySelectorAll(".letter-tile");
  const vowels = ["a", "e", "i", "o", "u"];
  
  letterTiles.forEach((tile) => {
    const letter = tile.getAttribute("data-letter");
    if (!letter) return;
    
    const isVowel = vowels.includes(letter.toLowerCase());
    
    // Clear any existing event listeners by cloning and replacing
    const newTile = tile.cloneNode(true);
    tile.parentNode.replaceChild(newTile, tile);
    
    // Add click event to the new tile
    newTile.addEventListener("click", () => {
      // Check if we're in the initialization phase
      if (isInitPhase()) {
        // In initialization phase, handle letter selection
        handleLetterSelection(newTile, isVowel);
      } else {
        // In regular gameplay, handle letter purchases
        handleLetterPurchase(newTile, isVowel);
      }
    });
  });
}

/**
 * Handles letter selection during the initial phase
 * @param {HTMLElement} tile - The letter tile element
 * @param {boolean} isVowel - Whether the letter is a vowel
 */
function handleLetterSelection(tile, isVowel) {
  const letter = tile.getAttribute("data-letter");
  if (!letter) return;
  
  // If selection is already complete, ignore clicks
  if (isSelectionComplete()) {
    showToast("Letter selection is already complete", "info");
    return;
  }
  
  if (isVowel) {
    // Handle vowel selection
    const currentVowel = getSelectedVowel();
    
    // If a vowel is already selected, deselect it first
    if (currentVowel) {
      // Find and deselect the current vowel tile
      const currentVowelTile = document.querySelector(`.letter-tile[data-letter="${currentVowel}"]`);
      if (currentVowelTile) {
        currentVowelTile.classList.remove("selected");
      }
    }
    
    // Select this vowel
    setSelectedVowel(letter);
    tile.classList.add("selected");
    
    // Update the vowel display
    updateSelectedVowelDisplay(letter);
  } else {
    // Handle consonant selection
    const currentConsonants = getSelectedConsonants();
    
    // Check if this consonant is already selected
    if (currentConsonants.includes(letter)) {
      // Already selected, ignore
      return;
    }
    
    // Check if we already have 2 consonants selected
    if (currentConsonants.length >= 2) {
      showToast("You can only select 2 consonants", "error");
      return;
    }
    
    // Add this consonant to selection
    addSelectedConsonant(letter);
    tile.classList.add("selected");
    
    // Update the consonants display
    updateSelectedConsonantsDisplay();
  }
  
  // Check if selection is now complete
  checkSelectionComplete();
}

/**
 * Updates the display of the selected vowel
 * @param {string} vowel - The selected vowel
 */
function updateSelectedVowelDisplay(vowel) {
  const vowelDisplay = document.getElementById("selected-vowel");
  if (vowelDisplay) {
    vowelDisplay.textContent = vowel.toUpperCase();
  }
}

/**
 * Updates the display of selected consonants
 */
function updateSelectedConsonantsDisplay() {
  const consonantsDisplay = document.getElementById("selected-consonants");
  if (!consonantsDisplay) return;
  
  const selectedConsonants = getSelectedConsonants();
  
  // Create display text with placeholders for unselected consonants
  let displayText = "";
  for (let i = 0; i < 2; i++) {
    if (i > 0) displayText += " ";
    displayText += i < selectedConsonants.length ? selectedConsonants[i].toUpperCase() : "-";
  }
  
  consonantsDisplay.textContent = displayText;
}

/**
 * Checks if letter selection is complete and finalizes if it is
 */
function checkSelectionComplete() {
  const vowel = getSelectedVowel();
  const consonants = getSelectedConsonants();
  
  if (vowel && consonants.length === 2) {
    // Selection is complete, finalize
    completeLetterSelection();
    
    // Show toast notification
    showToast(`Selection complete: ${vowel.toUpperCase()}, ${consonants[0].toUpperCase()}, ${consonants[1].toUpperCase()}`, "success");
    
    // Hide the selection instructions
    const instructionsElement = document.getElementById("selection-instructions");
    if (instructionsElement) {
      instructionsElement.style.display = "none";
    }
    
    // Enable the clues container
    const cluesContainer = document.getElementById("clues-container");
    if (cluesContainer) {
      cluesContainer.classList.remove("disabled-clues");
    }
    
    // Initialize the game with the selected letters
    revealSelectedLetters();
    
    // Update the UI to reflect the revealed letters
    renderParagraph(getChosenVowel());
    renderClues();
    updateLetterCounts(true);
    updateScore();
    
    // Enable the input field and submit button
    updateInputState();
  }
}

/**
 * Handles letter purchase during regular gameplay
 * @param {HTMLElement} tile - The letter tile element
 * @param {boolean} isVowel - Whether the letter is a vowel
 */
function handleLetterPurchase(tile, isVowel) {
  // Ignore if initialization phase is not complete
  if (!isSelectionComplete()) {
    showToast("Please complete letter selection first", "error");
    return;
  }
  
  const letter = tile.getAttribute("data-letter");
  if (!letter) return;
  
  // Check if the tile is already purchased/disabled
  if (tile.classList.contains("purchased") || tile.classList.contains("disabled")) {
    return;
  }
  
  // Get the count for this letter
  const countSpan = tile.querySelector(".count");
  const count = countSpan ? parseInt(countSpan.textContent || "0", 10) : 0;
  
  // Only allow purchase if there are occurrences to reveal
  if (count <= 0) {
    showToast("No more instances of this letter to reveal", "info");
    return;
  }
  
  // Try to purchase the letter
  let result;
  if (isVowel) {
    result = purchaseVowel(letter);
  } else {
    result = purchaseConsonant(letter);
  }
  
  if (result.success) {
    // Mark the tile as purchased
    tile.classList.add("purchased");
    
    // Update the UI to reflect the purchased letter
    renderParagraph(getChosenVowel());
    updateLetterCounts();
    updateScore();
    
    // Show toast notification
    showToast(
      `Revealed ${count} instance${count !== 1 ? "s" : ""} of "${letter.toUpperCase()}" for ${result.cost} links`,
      "success"
    );
  } else {
    // Purchase failed (probably not enough points)
    showToast(result.message || "Not enough links to purchase this letter", "error");
  }
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
    });
  
  // Show selection instructions again
  const instructionsElement = document.getElementById("selection-instructions");
  if (instructionsElement) {
    instructionsElement.style.display = "block";
  }
  
  // Reset selected letter displays
  const vowelDisplay = document.getElementById("selected-vowel");
  if (vowelDisplay) {
    vowelDisplay.textContent = "-";
  }
  
  const consonantsDisplay = document.getElementById("selected-consonants");
  if (consonantsDisplay) {
    consonantsDisplay.textContent = "- -";
  }
  
  // Clear clues list
  const cluesList = document.getElementById("clues-list");
  if (cluesList) {
    cluesList.innerHTML = "";
  }
  
  // Reset paragraph container
  const paragraphContainer = document.getElementById("paragraph-container");
  if (paragraphContainer) {
    paragraphContainer.innerHTML = "";
  }
  
  // Enable the input field and reset its state
  const input = document.getElementById("guess-input");
  if (input && input instanceof HTMLInputElement) {
    input.disabled = false;
    input.value = "";
    input.placeholder = "Enter your guess...";
    input.classList.remove("correct", "wrong");
  }
  
  // Remove any game over message
  const gameOverMessage = document.querySelector(".game-over-message");
  if (gameOverMessage) {
    gameOverMessage.remove();
  }
  
  // Remove any toast messages
  const toast = document.querySelector(".toast");
  if (toast) {
    toast.remove();
  }
  
  // Reset chain links
  const chainLinksContainer = document.getElementById("chain-links");
  if (chainLinksContainer) {
    chainLinksContainer.innerHTML = "";
  }
  
  // Clear animation tracking maps
  animatingClues.clear();
  animatedChainLinks.clear();
}