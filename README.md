# MyFlashCards

A web-based flashcard application for practicing LeetCode problems, built with vanilla JavaScript. Study, track progress, and maintain your own notes for each problem.

## 🚀 Features

- **Multiple Study Modes**
  - Random Flashcards
  - Custom Filtered Practice
  - Mistakes Review
  - Favorites Collection

- **Smart Filtering**
  - Filter by difficulty (Easy/Medium/Hard)
  - Filter by problem frequency
  - Filter by hardness rating
  - Search functionality with autocomplete

- **Progress Tracking**
  - Track correct/incorrect attempts
  - Maintain study streaks
  - View comprehensive progress reports
  - Save personal notes for each problem

- **User-Friendly Interface**
  - Interactive flashcard system
  - Built-in timer for practice sessions
  - Progress bar for study sessions
  - Responsive design for mobile devices

## 📋 Prerequisites

- A modern web browser
- Local web server (e.g., Live Server VS Code extension, Python's `http.server`, or Node.js `http-server`)

## 🛠️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/gsriram7/MyFlashCards.git
   ```

2. Navigate to the project directory:
   ```bash
   cd MyFlashCards
   ```

3. Create your `problems.tsv` file in the root directory with the following format:
   ```
   Leetcode Id  Name    Difficulty  Frequency   Link    Hardness rating   Answer  Complexity
   1249    Minimum Remove to Make Valid Parentheses Medium  100.00% https://leetcode.com/problems/... 1   Stack solution    O(n)
   ```

4. Start a local server. For example, using Python:
   ```bash
   # Python 3
   python -m http.server 8000
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## 📁 Project Structure

```
MyFlashCards/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── app.js              # JavaScript functionality
├── problems.tsv        # Problem database
├── documentation/      # Screenshots and additional documentation
└── README.md           # Documentation
```

## 📝 TSV File Format

The `problems.tsv` file should contain the following columns:

| Column           | Description                                |
|------------------|--------------------------------------------|
| Leetcode Id      | Problem ID number                         |
| Name             | Problem title                             |
| Difficulty       | Easy/Medium/Hard                          |
| Frequency        | Problem frequency percentage              |
| Link             | LeetCode problem URL                      |
| Hardness rating  | Personal difficulty rating (1-10)         |
| Answer           | Solution approach                         |
| Complexity       | Time/Space complexity                     |

## 🎯 Usage

1. **Starting Practice**
   - Choose a study mode from the main menu
   - Apply filters if desired
   - Click "Start Practice"

2. **During Practice**
   - Click the card to flip between problem and solution
   - Use the timer for practice sessions
   - Add personal notes
   - Mark problems as favorites
   - Rate your understanding using evaluation buttons

3. **Tracking Progress**
   - View your progress in the Report section
   - Check your current and longest streaks
   - Review frequently missed problems

## 💾 Local Storage

The application uses the browser's `localStorage` to save:
- User progress
- Personal notes
- Favorites
- Practice statistics

## 🔄 Browser Compatibility

Tested and working on:
- Chrome
- Firefox
- Edge
- Safari (add more if applicable)

## 🛠️ Customization

### Adding New Features

1. Modify the HTML in `index.html`
2. Add corresponding styles in `styles.css`
3. Implement functionality in `app.js`

### Modifying Styles

The application uses CSS variables for easy theme customization:

```css
:root {
    --primary-color: #4CAF50;
    --secondary-color: #2196F3;
    /* ... other variables */
}
```

### Adding Your Own Flashcards

Update the `problems.tsv` file with your custom problems in the specified format.
