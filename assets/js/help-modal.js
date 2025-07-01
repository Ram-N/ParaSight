/**
 * Help modal functionality for ClueChain game
 * Displays game rules in a modal dialog
 */

// Game rules content parsed from Markdown
const gameRules = {
  title: "Quick Rules for First-Time Players",
  rules: [
    {
      number: 1,
      title: "Pick your starting letters",
      description: "Choose 1 vowel and 2 consonants at the start. These will appear wherever they occur in the paragraph."
    },
    {
      number: 2,
      title: "Start guessing words",
      description: "There are 10 hidden words. You can guess them in any order."
    },
    {
      number: 3,
      title: "Clues unlock progressively",
      description: "You'll start with 3 random clues and 3 word endings shown. After every guess (right or wrong), 1 more clue and 1 more ending get revealed."
    },
    {
      number: 4,
      title: "Track remaining letters",
      description: "The Letter Marketplace shows how many unrevealed instances of each letter remain across all hidden words."
    },
    {
      number: 5,
      title: "Scoring depends on clue level",
      description: "Solving with harder clues gets you more points. Revealing a word costs points."
    },
    {
      number: 6,
      title: "Goal",
      description: "Find all 10 words and maximize your total score (links earned)."
    }
  ]
};

/**
 * Creates and shows the help modal
 */
export function showHelpModal() {
  // Create modal container if it doesn't exist
  let modalContainer = document.getElementById("help-modal-container");
  
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "help-modal-container";
    modalContainer.className = "modal-container";
    document.body.appendChild(modalContainer);
  }
  
  // Set modal content
  modalContainer.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${gameRules.title}</h2>
        <button class="close-button">&times;</button>
      </div>
      <div class="modal-body">
        <ul class="rules-list">
          ${gameRules.rules.map(rule => `
            <li class="rule-item">
              <div class="rule-number">${rule.number}</div>
              <div class="rule-text">
                <h3>${rule.title}</h3>
                <p>${rule.description}</p>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
  
  // Show the modal
  modalContainer.classList.add("show");
  
  // Add event listener to close button
  const closeButton = modalContainer.querySelector(".close-button");
  if (closeButton) {
    closeButton.addEventListener("click", hideHelpModal);
  }
  
  // Close modal when clicking outside the content
  modalContainer.addEventListener("click", (event) => {
    if (event.target === modalContainer) {
      hideHelpModal();
    }
  });
  
  // Close modal with Escape key
  document.addEventListener("keydown", handleEscapeKey);
}

/**
 * Hides the help modal
 */
export function hideHelpModal() {
  const modalContainer = document.getElementById("help-modal-container");
  if (modalContainer) {
    modalContainer.classList.remove("show");
    // Remove event listener when modal is closed
    document.removeEventListener("keydown", handleEscapeKey);
  }
}

/**
 * Handles Escape key press to close the modal
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleEscapeKey(event) {
  if (event.key === "Escape") {
    hideHelpModal();
  }
}

/**
 * Sets up the help button click handler
 */
export function setupHelpButton() {
  const helpButton = document.getElementById("help-button");
  if (helpButton) {
    helpButton.addEventListener("click", showHelpModal);
  }
}