// Main entry point for ParaSight
import { initializeGame } from "./js/game-controller.js";

// Initialize the game when the window loads
window.onload = () => {
  // First initialize the game
  initializeGame();

  // Then set up header controls
  const settingsButton = document.getElementById("settings-button");
  const helpButton = document.getElementById("help-button");
  const dateElement = document.getElementById("current-date");
  const arrows = document.querySelectorAll(".arrow");

  // Settings button handler
  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      // TODO: Implement settings modal
      alert("Settings coming soon!");
    });
  }

  // Help button handler
  if (helpButton) {
    helpButton.addEventListener("click", () => {
      // TODO: Implement help modal
      alert("Game rules coming soon!");
    });
  }

  // Initialize current date from the element or default to today
  let currentDate =
    dateElement && dateElement.textContent
      ? new Date(dateElement.textContent)
      : new Date();

  // Update the date display
  function updateDateDisplay(date) {
    if (dateElement) {
      dateElement.textContent = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  updateDateDisplay(currentDate);

  // Add date navigation handlers
  arrows.forEach((arrow) => {
    arrow.addEventListener("click", (e) => {
      const newDate = new Date(currentDate);
      const isLeft = e.target.textContent.includes("←");

      if (isLeft) {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }

      currentDate = newDate;
      updateDateDisplay(currentDate);
      // Reinitialize game with new date
      initializeGame();
    });
  });
};
