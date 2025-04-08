console.log("app.js loaded");

let problems = [];
let currentProblem = null;
let timer = null;
let timerRunning = false;
let totalQuestions = 0;
let currentQuestionIndex = 0;

// Initialize user progress
let userProgress = JSON.parse(localStorage.getItem('userProgress')) || {
    correct: {},
    incorrect: {},
    lastSeen: {},
    notes: {},
    favorites: [],
    stats: {
        totalSeen: 0,
        correctStreak: 0,
        longestStreak: 0
    }
};

// Event Listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded");
    loadProblems();
});

async function loadProblems() {
    console.log("Loading problems...");
    try {
        const response = await fetch('problems.tsv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.text();
        problems = parseTSV(data);
        console.log(`Parsed ${problems.length} problems`);
        initializeEventListeners();
        updateUIWithUserProgress();
    } catch (error) {
        console.error("Error loading problems:", error);
        showError("Failed to load problems. Please ensure you're running through a web server.");
    }
}

function parseTSV(tsv) {
    const lines = tsv.trim().split('\n');
    const headers = lines[0].split('\t');
    return lines.slice(1).map(line => {
        const values = line.split('\t');
        return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index];
            return obj;
        }, {});
    });
}

function initializeEventListeners() {
    // Mode selection buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => startMode(btn.dataset.mode));
    });

    // Custom mode button
    document.querySelector('.customize-btn').addEventListener('click', showCustomizeForm);
    
    // Favorites button
    document.querySelector('.favorites-btn').addEventListener('click', showFavorites);
    
    // Report button
    document.querySelector('.report-btn').addEventListener('click', showReport);
    
    // Flashcard
    document.querySelector('.flashcard').addEventListener('click', flipCard);
    
    // Notes section - prevent propagation
    document.querySelector('.notes-section').addEventListener('click', e => e.stopPropagation());
    
    // Evaluation buttons
    document.querySelectorAll('.evaluation-buttons button').forEach(btn => {
        btn.addEventListener('click', () => evaluateAnswer(btn.className));
    });
    
    // Menu buttons
    document.querySelectorAll('.menu-button').forEach(btn => {
        btn.addEventListener('click', returnToMenu);
    });
    
    // Timer toggle
    document.getElementById('timer-toggle').addEventListener('click', toggleTimer);
    
    // Save notes button
    document.querySelector('.save-notes-btn').addEventListener('click', saveNotes);
    
    // Search input with debounce
    const searchInput = document.getElementById('search');
    let debounceTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => handleSearch(e), 300);
    });

    // Favorite button
    document.querySelector('.favorite-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite();
    });
}

function startMode(mode, customFilters) {
    const filters = customFilters || getSelectedFilters();
    let filteredProblems = filterProblems(problems, filters);
    
    if (filteredProblems.length === 0) {
        showError("No problems match the selected filters");
        return;
    }

    totalQuestions = filteredProblems.length;
    currentQuestionIndex = 0;
    
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('flashcard-container').classList.remove('hidden');
    
    updateProgress();
    
    switch(mode) {
        case 'random':
            showRandomProblem(filteredProblems);
            break;
        case 'mistakes':
            showMistakesProblem(filteredProblems);
            break;
        case 'custom':
            showRandomProblem(filteredProblems);
            break;
    }
}

function getSelectedFilters() {
    return {
        difficulty: Array.from(document.getElementById('difficulty').selectedOptions).map(opt => opt.value),
        frequency: Array.from(document.getElementById('frequency').selectedOptions).map(opt => opt.value),
        hardness: Array.from(document.getElementById('hardness').selectedOptions).map(opt => opt.value)
    };
}

function filterProblems(problems, filters) {
    return problems.filter(problem => {
        const difficultyMatch = filters.difficulty.length === 0 || 
            filters.difficulty.includes(problem.Difficulty);
        const frequencyMatch = filters.frequency.length === 0 || 
            filters.frequency.includes(problem.Frequency.toLowerCase());
        const hardnessMatch = filters.hardness.length === 0 || 
            filters.hardness.includes(problem['Hardness rating']);
        
        return difficultyMatch && frequencyMatch && hardnessMatch;
    });
}

function showRandomProblem(filteredProblems) {
    if (filteredProblems.length === 0) {
        showError('No problems match the selected filters');
        returnToMenu();
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * filteredProblems.length);
    currentProblem = filteredProblems[randomIndex];
    displayProblem(currentProblem);
}

function showMistakesProblem(filteredProblems) {
    const mistakeProblems = filteredProblems.filter(p => 
        userProgress.incorrect[p['Leetcode Id']] > 0
    );
    
    if (mistakeProblems.length === 0) {
        showError('No mistake problems found with current filters');
        returnToMenu();
        return;
    }
    
    showRandomProblem(mistakeProblems);
}

function displayProblem(problem) {
    document.getElementById('problem-name').textContent = problem.Name;
    document.getElementById('problem-link').href = problem.Link;
    document.getElementById('answer').textContent = problem.Answer;
    document.getElementById('complexity').textContent = problem.Complexity;
    document.getElementById('freq').textContent = problem.Frequency;
    document.getElementById('hardness-rating').textContent = problem['Hardness rating'];
    
    // Load saved notes
    document.getElementById('problem-notes').value = userProgress.notes[problem['Leetcode Id']] || '';
    
    // Update favorite status
    updateFavoriteButton();
    
    // Reset card to front side
    document.querySelector('.flashcard').classList.remove('flipped');
}

function flipCard() {
    document.querySelector('.flashcard').classList.toggle('flipped');
}

function evaluateAnswer(result) {
    const problemId = currentProblem['Leetcode Id'];
    
    if (result === 'easy') {
        userProgress.correct[problemId] = (userProgress.correct[problemId] || 0) + 1;
        userProgress.stats.correctStreak++;
        userProgress.stats.longestStreak = Math.max(userProgress.stats.longestStreak, userProgress.stats.correctStreak);
    } else {
        userProgress.incorrect[problemId] = (userProgress.incorrect[problemId] || 0) + 1;
        userProgress.stats.correctStreak = 0;
    }
    
    userProgress.lastSeen[problemId] = new Date().toISOString();
    userProgress.stats.totalSeen++;
    
    currentQuestionIndex++;
    updateProgress();
    
    saveProgress();
    showNextProblem();
}

function saveProgress() {
    localStorage.setItem('userProgress', JSON.stringify(userProgress));
}

function showNextProblem() {
    if (currentQuestionIndex < totalQuestions) {
        const filters = getSelectedFilters();
        const filteredProblems = filterProblems(problems, filters);
        showRandomProblem(filteredProblems);
    } else {
        showCompletionMessage();
    }
}

function showCompletionMessage() {
    const message = `
        <h2>Practice Complete!</h2>
        <p>You've completed all ${totalQuestions} questions in this set.</p>
        <p>Correct Streak: ${userProgress.stats.correctStreak}</p>
        <p>Longest Streak: ${userProgress.stats.longestStreak}</p>
        <button onclick="returnToMenu()" class="menu-button">Return to Menu</button>
    `;
    document.getElementById('flashcard-container').innerHTML = message;
}

function returnToMenu() {
    document.getElementById('flashcard-container').classList.add('hidden');
    document.getElementById('report-container').classList.add('hidden');
    document.getElementById('custom-form-container').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
    resetTimer();
}

function toggleTimer() {
    if (timerRunning) {
        clearInterval(timer);
        document.querySelector('#timer-toggle i').className = 'fas fa-play';
    } else {
        let seconds = 0;
        timer = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            document.getElementById('timer-display').textContent = 
                `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }, 1000);
        document.querySelector('#timer-toggle i').className = 'fas fa-pause';
    }
    timerRunning = !timerRunning;
}

function resetTimer() {
    clearInterval(timer);
    document.getElementById('timer-display').textContent = '00:00';
    document.querySelector('#timer-toggle i').className = 'fas fa-play';
    timerRunning = false;
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const resultsContainer = document.getElementById('autocomplete-results');
    
    if (searchTerm.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }
    
    const matches = problems.filter(problem => 
        problem.Name.toLowerCase().includes(searchTerm) ||
        problem['Leetcode Id'].includes(searchTerm)
    ).slice(0, 5);
    
    displaySearchResults(matches, resultsContainer);
}

function displaySearchResults(matches, container) {
    container.innerHTML = '';
    container.classList.remove('hidden');
    
    matches.forEach(problem => {
        const div = document.createElement('div');
        div.className = 'search-result';
        div.textContent = `${problem['Leetcode Id']}: ${problem.Name}`;
        div.addEventListener('click', () => {
            currentProblem = problem;
            startMode('single');
        });
        container.appendChild(div);
    });
}

function saveNotes() {
    const problemId = currentProblem['Leetcode Id'];
    const notes = document.getElementById('problem-notes').value;
    userProgress.notes[problemId] = notes;
    saveProgress();
    showMessage('Notes saved successfully!');
}

function showReport() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('report-container').classList.remove('hidden');
    
    const stats = {
        total: problems.length,
        seen: userProgress.stats.totalSeen,
        correct: Object.keys(userProgress.correct).length,
        incorrect: Object.keys(userProgress.incorrect).length,
        streak: userProgress.stats.correctStreak,
        longestStreak: userProgress.stats.longestStreak
    };
    
    document.getElementById('stats-container').innerHTML = `
        <div class="stats">
            <p>Total Problems: ${stats.total}</p>
            <p>Problems Seen: ${stats.seen}</p>
            <p>Correct: ${stats.correct}</p>
            <p>Incorrect: ${stats.incorrect}</p>
            <p>Current Streak: ${stats.streak}</p>
            <p>Longest Streak: ${stats.longestStreak}</p>
        </div>
    `;
}

function showCustomizeForm() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('custom-form-container').classList.remove('hidden');
    
    const formContent = `
        <h2>Customize Your Practice</h2>
        <div class="custom-filters">
            <div class="filter-group">
                <label>Difficulty Level:</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" name="difficulty" value="Easy"> Easy</label>
                    <label><input type="checkbox" name="difficulty" value="Medium"> Medium</label>
                    <label><input type="checkbox" name="difficulty" value="Hard"> Hard</label>
                </div>
            </div>
            <div class="filter-group">
                <label>Frequency Range:</label>
                <input type="range" min="0" max="100" value="50" id="frequencyRange">
                <span id="frequencyValue">50%</span>
            </div>
            <div class="filter-group">
                <label>Hardness Rating Range:</label>
                <div class="range-group">
                    <input type="number" min="1" max="10" value="1" id="minHardness">
                    <span>to</span>
                    <input type="number" min="1" max="10" value="10" id="maxHardness">
                </div>
            </div>
        </div>
        <div class="custom-buttons">
            <button id="startCustom" class="primary-btn">Start Practice</button>
            <button id="cancelCustom" class="secondary-btn">Cancel</button>
        </div>
    `;
    
    document.querySelector('.custom-form').innerHTML = formContent;
    
    // Add event listeners for the custom form
    document.getElementById('frequencyRange').addEventListener('input', (e) => {
        document.getElementById('frequencyValue').textContent = `${e.target.value}%`;
    });
    
    document.getElementById('startCustom').addEventListener('click', () => {
        const customFilters = {
            difficulty: Array.from(document.querySelectorAll('input[name="difficulty"]:checked')).map(cb => cb.value),
            minFrequency: document.getElementById('frequencyRange').value,
            minHardness: document.getElementById('minHardness').value,
            maxHardness: document.getElementById('maxHardness').value
        };
        document.getElementById('custom-form-container').classList.add('hidden');
        startMode('custom', customFilters);
    });
    
    document.getElementById('cancelCustom').addEventListener('click', returnToMenu);
}

function showFavorites() {
    const favoritedProblems = problems.filter(p => userProgress.favorites.includes(p['Leetcode Id']));
    
    if (favoritedProblems.length === 0) {
        showError('No favorite problems found. Click the star icon on problems to add them to favorites.');
        return;
    }
    
    startMode('random', favoritedProblems);
}

function toggleFavorite() {
    const problemId = currentProblem['Leetcode Id'];
    const index = userProgress.favorites.indexOf(problemId);
    if (index > -1) {
        userProgress.favorites.splice(index, 1);
    } else {
        userProgress.favorites.push(problemId);
    }
    updateFavoriteButton();
    saveProgress();
}

function updateFavoriteButton() {
    const starIcon = document.querySelector('.favorite-btn i');
    starIcon.className = userProgress.favorites.includes(currentProblem['Leetcode Id']) ? 
        'fas fa-star' : 'far fa-star';
}

function updateProgress() {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const percentage = (currentQuestionIndex / totalQuestions) * 100;
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${currentQuestionIndex} / ${totalQuestions} Questions`;
}

function showError(message) {
    alert(message);  // For now, we'll use a simple alert. You can replace this with a more sophisticated error display method.
}

function showMessage(message) {
    alert(message);  // Similarly, this can be replaced with a more elegant solution.
}

function updateUIWithUserProgress() {
    // You can add any UI updates based on user progress here
    // For example, updating the report page or showing streaks
}

// Initialize the app
loadProblems();
