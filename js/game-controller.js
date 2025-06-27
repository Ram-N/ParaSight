/**
 * @fileoverview Game initialization and event handling module for ParaSight.
 * Manages game lifecycle, data loading, and event coordination.
 * @module game-controller
 */

import {
  checkGuess,
  getCurrentParagraph,
  getCurrentWords,
  getCurrentScore,
  getMaxScore,
  getChosenVowel,
  setCurrentParagraph,
  setCurrentWords,
  setGameParameters,
  setAllParagraphs,
} from "./game-state.js";

import {
  renderParagraph,
  renderClues,
  updateScore,
  showGameOver,
  resetUI,
  setupMarketplace,
  updateLetterCounts,
} from "./ui-manager.js";

/**
 * Sets up the game UI and initializes event handlers
 * @private
 */
function setupGame() {
  resetUI();
  renderParagraph("");
  renderClues();
  setupGuessInput();
}

/**
 * Sets up the word guessing form and its event handlers
 * @private
 */
function setupGuessing() {
  console.log("Setting up guessing form...");
  const form = document.getElementById("guess-form");
  const input = document.getElementById("guess-input");

  if (!form || !input) {
    console.error("Could not find form or input elements:", { form, input });
    return;
  }

  form.addEventListener("submit", handleGuess);
}

/**
 * Handles player's word guess submissions
 * @param {Event} e - The submit event object
 * @private
 */
function handleGuess(e) {
  e.preventDefault();
  const input = document.getElementById("guess-input");
  if (!input || !(input instanceof HTMLInputElement)) return;

  const guess = input.value.trim();
  if (!guess) return;

  console.log("Submitted guess:", guess);
  const result = checkGuess(guess);

  if (result.success) {
    input.classList.add("correct");
    setTimeout(() => input.classList.remove("correct"), 1000);

    renderParagraph(getChosenVowel());
    renderClues();
    updateScore();

    if (result.gameComplete) {
      console.log("Game complete detected! Triggering end game.");
      showGameOver();
    }
  } else {
    input.classList.add("wrong");
    setTimeout(() => input.classList.remove("wrong"), 1000);
    updateScore();
  }

  input.value = "";
  input.focus();
}

/**
 * Sets up the guess input field and submit button
 */
function setupGuessInput() {
  const input = document.getElementById("guess-input");
  const submitButton = document.getElementById("submit-guess");

  if (!input || !submitButton) return;

  const handleGuess = () => {
    if (!(input instanceof HTMLInputElement)) return;

    const guess = input.value.trim();
    if (!guess) return;

    const result = checkGuess(guess);
    if (result.success) {
      input.classList.add("correct");
      setTimeout(() => input.classList.remove("correct"), 1000);
      renderParagraph(getChosenVowel());
      renderClues();
      updateScore();
      updateLetterCounts();

      if (result.gameComplete) {
        showGameOver();
      }
    } else {
      input.classList.add("wrong");
      setTimeout(() => input.classList.remove("wrong"), 1000);
      // Even for wrong guesses, we need to re-render clues to show newly revealed ones
      renderClues();
      updateScore();
    }

    input.value = "";
    input.focus();
  };

  submitButton.addEventListener("click", handleGuess);
  input.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      handleGuess();
    }
  });
}

/**
 * Renders the current game state
 */
function renderGameState() {
  renderParagraph(""); // Start with no vowels revealed
  renderClues();
  updateScore();
}

/**
 * Initializes the game and sets up event listeners
 * Entry point for the game
 */
export async function initializeGame() {
  console.log("Window loaded, initializing game...");

  try {
    // Load game parameters and paragraphs
    const [params, gameData] = await Promise.all([
      fetch("./game_parameters.json").then((r) => r.json()),
      fetch("./paras.json").then((r) => r.json()),
    ]);

    // Check if we have valid game data
    if (!gameData || !Array.isArray(gameData.paragraphs)) {
      throw new Error("Invalid game data structure");
    }

    // Initialize game state
    setGameParameters(params);
    setAllParagraphs(gameData.paragraphs);

    // Get the current date from the date element
    const dateElement = document.getElementById("current-date");
    const currentDateStr = dateElement ? dateElement.textContent : null;
    let selectedParagraph = null;
    
    if (currentDateStr) {
      // Format date for comparison (YYYY-MM-DD)
      const currentDate = new Date(currentDateStr);
      const formattedDate = currentDate.toISOString().split('T')[0];
      
      // Find paragraph matching the current date
      selectedParagraph = gameData.paragraphs.find(
        paragraph => paragraph.date && 
        new Date(paragraph.date).toISOString().split('T')[0] === formattedDate
      );
      
      console.log(`Looking for paragraph with date: ${formattedDate}`);
      if (selectedParagraph) {
        console.log(`Found matching paragraph for date: ${formattedDate}`);
      } else {
        console.log(`No paragraph found for date: ${formattedDate}, selecting random paragraph`);
      }
    }
    
    // If no paragraph found for the current date, pick a random one
    if (!selectedParagraph) {
      const randomIndex = Math.floor(Math.random() * gameData.paragraphs.length);
      /** @type {typeof gameData.paragraphs[0]} */
      selectedParagraph = gameData.paragraphs[randomIndex];
    }
    if (!selectedParagraph || !Array.isArray(selectedParagraph.hiddenWords)) {
      throw new Error("Invalid paragraph data structure");
    } // Initialize game state in the correct order
    // Filter and process hidden words to ensure they exist in the paragraph
    const initialWords = selectedParagraph.hiddenWords
      .filter(
        /** @param {import('./game-state.js').GameWord} word */ (word) => {
          // Test if word appears exactly in the text
          const wordRegex = new RegExp(`\\b${word.word}\\b`, "g");
          const exists = wordRegex.test(selectedParagraph.text);
          if (!exists) {
            console.warn(
              `Warning: Hidden word "${word.word}" not found in paragraph ${selectedParagraph.id}. Ignoring this word.`
            );
          }
          return exists;
        }
      )
      .map(
        /** @param {import('./game-state.js').GameWord} word */ (word) => {
          // Find all positions of the word in the paragraph text
          const positions = [];
          const wordRegex = new RegExp(`\\b${word.word}\\b`, "gi");
          let match;
          while ((match = wordRegex.exec(selectedParagraph.text)) !== null) {
            positions.push({
              start: match.index,
              end: match.index + word.word.length,
            });
          }

          return {
            ...word,
            found: false,
            positions: positions,
          };
        }
      );
    console.log("Initialized words with positions:", initialWords);
    setCurrentWords(initialWords);
    setCurrentParagraph(selectedParagraph);
    updateScore(); // Ensure score is displayed after initialization        // Set up event listeners
    setupGuessInput();
    setupMarketplace();

    // Force a delay to ensure all setup is complete
    setTimeout(() => {
      // Render initial game state
      renderGameState();
      updateLetterCounts(); // Update initial letter counts
    }, 0);
  } catch (error) {
    console.error("Failed to initialize game:", error);
    const container = document.getElementById("paragraph-container");
    if (container) {
      container.innerHTML = "Error loading game data. Please refresh the page.";
    }
  }
}
