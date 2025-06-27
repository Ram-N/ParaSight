# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.1.0] - 2025-06-27

### Added
- Progressive clue revealing system
  - Game now starts with only 3 random clues visible
  - After each guess (right or wrong), one additional random clue is revealed
  - Continues until all clues are visible or all words are found
- New game state properties:
  - `clueAttempts` - Tracks number of guess attempts
  - `initialCluesShown` - Configures starting number of clues (default: 3)
  - `shownWordIndices` - Tracks which word clues are currently visible

### Changed
- Modified clue rendering to only show clues for found words or words in the visible list
- Updated game controller to refresh clues after both correct and incorrect guesses
- Improved hover interactions between clues and masked words

### Fixed
- Fixed issue where all clues were shown at once instead of progressively

## [1.0.0] - 2025-06-20

### Initial Release
- Core game mechanics
- Paragraph masking system
- Clue-based word guessing
- Points and penalties system
- Vowel selection feature
- End-game detection and statistics