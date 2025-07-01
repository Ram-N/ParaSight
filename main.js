// Main entry point for ParaSight
import { initializeGame } from "./js/game-controller.js";
import { setupHelpButton } from "./assets/js/help-modal.js";

// Initialize the game when the window loads
window.onload = () => {
  // Set the date display to today's date on page load
  const dateElementInit = document.getElementById("current-date");
  if (dateElementInit) {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    // Fix: use correct type for year/month/day
    dateElementInit.textContent = today.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

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

  // Setup help button handler
  setupHelpButton();

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
  
  // Set up custom calendar
  const calendarButton = document.getElementById("calendar-button");
  const dateSelector = document.querySelector(".date-selector");
  const customCalendar = document.getElementById("custom-calendar");
  const monthYearDisplay = document.getElementById("month-year");
  const prevMonthBtn = document.getElementById("prev-month");
  const nextMonthBtn = document.getElementById("next-month");
  const calendarDaysContainer = document.getElementById("calendar-days");
  
  // Calendar state variables
  let calendarCurrentDate = new Date(currentDate);
  let calendarCurrentMonth = calendarCurrentDate.getMonth();
  let calendarCurrentYear = calendarCurrentDate.getFullYear();
  
  // Days with content - we'll fetch this from our data later
  const daysWithContent = [];
  
  // Fetch the paragraphs to find dates with content
  async function fetchContentDates() {
    try {
      // First try to fetch the index file
      const indexResponse = await fetch("./assets/data/index.json");
      
      if (!indexResponse.ok) {
        console.error("Failed to load index.json");
        return;
      }
      
      const indexData = await indexResponse.json();
      const dataFiles = indexData.files || [];
      
      // Fetch all data files in parallel
      const paragraphsData = await Promise.all(
        dataFiles.map(file => 
          fetch(file)
            .then(response => response.json())
            .catch(error => {
              console.error(`Error loading ${file}:`, error);
              return null;
            })
        )
      );
      
      // Extract dates from all paragraphs
      paragraphsData.forEach(paragraph => {
        if (paragraph && paragraph.date) {
          try {
            const dateStr = new Date(paragraph.date).toISOString().split('T')[0];
            daysWithContent.push(dateStr);
            console.log(`Added content date: ${dateStr}, Title: ${paragraph.title?.substring(0, 30) || 'Unknown'}...`);
          } catch (error) {
            console.error(`Error parsing date from paragraph: ${paragraph.date}`, error);
          }
        }
      });
      
      // Update calendar to show days with content
      if (customCalendar.classList.contains("show")) {
        renderCalendarDays();
      }
    } catch (error) {
      console.error("Error fetching content dates:", error);
    }
  }
  
  // Function to generate and render calendar days
  function renderCalendarDays() {
    calendarDaysContainer.innerHTML = "";
    
    // Update month and year display
    monthYearDisplay.textContent = new Date(calendarCurrentYear, calendarCurrentMonth, 1)
      .toLocaleDateString("en-US", { month: "long", year: "numeric" });
    
    // Get the first day of the month
    const firstDay = new Date(calendarCurrentYear, calendarCurrentMonth, 1);
    const startingDay = firstDay.getDay(); // 0 (Sunday) to 6 (Saturday)
    
    // Get the last day of the month
    const lastDay = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0);
    const totalDays = lastDay.getDate();
    
    // Create empty cells for days before the first day of month
    for (let i = 0; i < startingDay; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "calendar-day empty";
      calendarDaysContainer.appendChild(emptyDay);
    }
    
    // Format current selected date for comparison
    const selectedDateStr = currentDate.toISOString().split('T')[0];
    const todayDateStr = new Date().toISOString().split('T')[0];
    
    // Create cells for all days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dayElement = document.createElement("div");
      dayElement.className = "calendar-day";
      dayElement.textContent = day;
      
      // Format this calendar day as YYYY-MM-DD for comparison
      const thisDate = new Date(calendarCurrentYear, calendarCurrentMonth, day);
      const thisDateStr = thisDate.toISOString().split('T')[0];
      
      // Add special classes
      if (thisDateStr === selectedDateStr) {
        dayElement.classList.add("selected");
      }
      
      if (thisDateStr === todayDateStr) {
        dayElement.classList.add("today");
      }
      
      // Mark days that have content
      if (daysWithContent.includes(thisDateStr)) {
        dayElement.classList.add("has-content");
      }
      
      // Add click handler to select date
      dayElement.addEventListener("click", () => {
        // More comprehensive check if game is in progress
        const isGameInProgress = document.querySelectorAll('#clues-list li.found').length > 0 || 
                                 document.querySelectorAll('.letter-tile.purchased').length > 0 ||
                                 !document.getElementById('selection-instructions') || 
                                 (document.getElementById('selection-instructions') && 
                                  document.getElementById('selection-instructions').style.display === 'none');
        
        if (isGameInProgress) {
          // Ask for confirmation before changing date and resetting game
          if (confirm("Changing the date will reset your current game progress. Continue?")) {
            // Update current date and display
            currentDate = new Date(calendarCurrentYear, calendarCurrentMonth, day);
            updateDateDisplay(currentDate);
            
            // Log the selected date for debugging
            console.log(`Selected date: ${currentDate.toISOString().split('T')[0]}`);
            
            // Hide calendar
            customCalendar.classList.remove("show");
            
            // Reinitialize game with new date
            initializeGame();
          }
        } else {
          // No game in progress, proceed without confirmation
          currentDate = new Date(calendarCurrentYear, calendarCurrentMonth, day);
          updateDateDisplay(currentDate);
          
          // Log the selected date for debugging
          console.log(`Selected date: ${currentDate.toISOString().split('T')[0]}`);
          
          // Hide calendar
          customCalendar.classList.remove("show");
          
          // Reinitialize game with new date
          initializeGame();
        }
      });
      
      calendarDaysContainer.appendChild(dayElement);
    }
  }
  
  // Function to show/hide calendar
  function toggleCalendar() {
    const isVisible = customCalendar.classList.toggle("show");
    
    if (isVisible) {
      // Set calendar to current month/year and render days
      calendarCurrentMonth = currentDate.getMonth();
      calendarCurrentYear = currentDate.getFullYear();
      renderCalendarDays();
      
      // Fetch content dates if we haven't already
      if (daysWithContent.length === 0) {
        fetchContentDates();
      }
      
      // Add click outside to close
      setTimeout(() => {
        document.addEventListener("click", closeCalendarOnClickOutside);
      }, 10);
    }
  }
  
  // Function to close calendar when clicking outside
  function closeCalendarOnClickOutside(e) {
    if (!customCalendar.contains(e.target) && 
        !dateSelector.contains(e.target)) {
      customCalendar.classList.remove("show");
      document.removeEventListener("click", closeCalendarOnClickOutside);
    }
  }
  
  // Set up event listeners for the calendar
  if (dateSelector && customCalendar) {
    // Toggle calendar on date or button click
    dateSelector.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCalendar();
    });
    
    // Navigate to previous month
    if (prevMonthBtn) {
      prevMonthBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        calendarCurrentMonth--;
        if (calendarCurrentMonth < 0) {
          calendarCurrentMonth = 11;
          calendarCurrentYear--;
        }
        renderCalendarDays();
      });
    }
    
    // Navigate to next month
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        calendarCurrentMonth++;
        if (calendarCurrentMonth > 11) {
          calendarCurrentMonth = 0;
          calendarCurrentYear++;
        }
        renderCalendarDays();
      });
    }
    
    // Initialize content dates
    fetchContentDates();
  }

  // Add date navigation handlers
  arrows.forEach((arrow) => {
    arrow.addEventListener("click", (e) => {
      // Check if game is complete (victory message shown)
      const isGameComplete = document.querySelector('.game-over-message') !== null;
      
      // Check if game is in progress (but not complete)
      const isGameInProgress = !isGameComplete && (
        document.querySelectorAll('#clues-list li.found').length > 0 || 
        document.querySelectorAll('.letter-tile.purchased').length > 0 ||
        (document.getElementById('selection-instructions') && 
         document.getElementById('selection-instructions').style.display === 'none')
      );
      
      // Only ask for confirmation if game is in progress but not complete
      if (isGameInProgress) {
        if (!confirm("Changing the date will reset your current game progress. Continue?")) {
          return; // Cancel if user doesn't confirm
        }
      }
      
      const newDate = new Date(currentDate);
      const isLeft = e.target.textContent.includes("←");

      if (isLeft) {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }

      currentDate = newDate;
      updateDateDisplay(currentDate);
      
      // Log the navigated date for debugging
      const dateStr = currentDate.toISOString().split('T')[0];
      console.log(`Navigated to date: ${dateStr}`);
      
      // Find the nearest date with content
      if (daysWithContent.length > 0) {
        // If we're navigating and the target date doesn't have content
        // find the nearest date with content in the direction we're moving
        const sortedDates = [...daysWithContent].sort();
        let nearestDate = null;
        
        if (isLeft) {
          // When going left (backward), find the nearest date less than current
          for (let i = sortedDates.length - 1; i >= 0; i--) {
            if (sortedDates[i] < dateStr) {
              nearestDate = sortedDates[i];
              break;
            }
          }
          // If no earlier date found, wrap around to the latest date
          if (!nearestDate) {
            nearestDate = sortedDates[sortedDates.length - 1];
          }
        } else {
          // When going right (forward), find the nearest date greater than current
          for (let i = 0; i < sortedDates.length; i++) {
            if (sortedDates[i] > dateStr) {
              nearestDate = sortedDates[i];
              break;
            }
          }
          // If no later date found, wrap around to the earliest date
          if (!nearestDate) {
            nearestDate = sortedDates[0];
          }
        }
        
        if (nearestDate) {
          // Update currentDate to the nearest date with content
          currentDate = new Date(nearestDate);
          updateDateDisplay(currentDate);
          console.log(`Navigated to nearest date with content: ${nearestDate}`);
        }
      }
      
      // Reinitialize game with new date (or random if no content)
      initializeGame();
    });
  });
};
