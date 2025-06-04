# ParaSight - Word Guessing Game

A unique word guessing game where players reveal hidden words in paragraphs by choosing vowels and solving clues.

## Project Structure

```
ParaSight/
├── index.html           # Main HTML file with game UI structure
├── style.css           # Game styling
├── main.js            # Entry point that initializes the game
├── paras.json         # Game content: paragraphs and hidden words
├── game_parameters.json # Game configuration (penalties, etc.)
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
        paragraph: null,    // Current active paragraph
        chosenVowel: '',   // Player's selected vowel
        words: [],         // Hidden words with their states
        score: 0,         // Current game score
        maxScore: 0       // Maximum possible score
    },
    config: {
        parameters: null,  // Game rules and penalties
        paragraphs: null  // Available paragraphs
    }
}
```

State is accessed through getter/setter functions to maintain encapsulation:
- Getters: `getCurrentParagraph`, `getGameParameters`, `getAllParagraphs`, etc.
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
3. Player selects a vowel to reveal in hidden words
4. Player guesses words based on clues
5. Score updates based on correct/incorrect guesses
6. Game ends when all words are found

## Key Features

- Random paragraph selection
- Vowel-based word masking
- Points system with penalties
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
