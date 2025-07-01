# ClueChain - Word Guessing Game

A unique word guessing game where players reveal hidden words in paragraphs by solving clues which are progressively revealed. The game starts by showing only 3 random clues, and gradually reveals more clues after each guess attempt.

## Project Structure

```
ClueChain/
├── index.html           # Main HTML file with game UI structure
├── style.css            # Game styling
├── main.js              # Entry point that initializes the game
├── game_parameters.json # Game configuration (penalties, etc.)
├── assets/
│   ├── config/
│   │   └── suffix_config.json # Configuration for suffixes
│   └── data/
│       ├── index.json   # Index of all paragraph data files
│       └── *.json       # Individual paragraph data files (one per day)
└── js/
    ├── game-state.js     # Core game state management
    ├── game-controller.js # Game initialization and event handling
    └── ui-manager.js     # UI rendering and DOM manipulation
```

## Architecture

The game follows a modular architecture with clear separation of concerns:

### Game State (`game-state.js`)

Manages the core game state with a nested structure:

```javascript
gameState = {
  current: {
    paragraph: null, // Current active paragraph
    chosenVowel: "", // Player's selected vowel
    words: [], // Hidden words with their states
    score: 0, // Current game score
    maxScore: 0, // Maximum possible score
    clueAttempts: 0, // Number of answer attempts made
    initialCluesShown: 3, // Number of clues to show initially
    shownWordIndices: [], // Indices of words with visible clues
  },
  config: {
    parameters: null, // Game rules and penalties
    paragraphs: null, // Available paragraphs
  },
};
```

State is accessed through getter/setter functions to maintain encapsulation:

- Getters: `getCurrentParagraph`, `getGameParameters`, `getAllParagraphs`, `getClueAttempts`, `getShownWordIndices`, etc.
- Setters: `setCurrentParagraph`, `setGameParameters`, `setAllParagraphs`, etc.

### Game Controller (`game-controller.js`)

Handles game initialization and event management:

- `loadGameData()`: Loads game content and parameters
- `startGame()`: Initializes a new game session
- `setupGame()`: Sets up game UI and event listeners
- Event handlers for guesses and vowel selection

### UI Manager (`ui-manager.js`)

Manages all DOM interactions and UI updates:

- `renderParagraph()`: Displays masked paragraph text
- `renderClues()`: Shows word clues
- `updateScore()`: Updates score display
- `showGameOver()`: Displays end-game message

## Game Flow

1. `main.js` initializes the game on window load
2. Game data is loaded from JSON files
3. Game randomly selects 3 clues to show initially
4. Player selects a vowel to reveal in hidden words
5. Player guesses words based on clues
6. After each guess (right or wrong), one more clue is revealed
7. Score updates based on correct/incorrect guesses
8. Game ends when all words are found

## Key Features

- Random paragraph selection
- Vowel-based word masking
- Points system with penalties
- Progressive clue revealing (starting with 3 random clues)
- Crossword-style clues
- Visual feedback for guesses
- End-game statistics

## Development Notes

- Uses ES6 modules for code organization
- State management through encapsulated functions
- DOM manipulation centralized in UI manager
- Asynchronous data loading with error handling
- Event-driven architecture for game interactions

## Game Parameters

The `game_parameters.json` file configures:

- Scoring system
- Penalties for wrong guesses
- Game rules and settings

## Progressive Clue Revealing

The game implements a progressive clue-revealing system:

1. Initially, only 3 random clues are shown to the player
2. After each guess attempt (whether correct or incorrect), one additional random clue is revealed
3. This continues until all clues are visible or all words are found

This mechanic creates a gradually easier experience as the player progresses through the game, maintaining engagement while reducing difficulty over time.

