console.log("app.js loaded");

let problems = [];
let currentProblem = null;
let timer = null;
let timerRunning = false;
let totalQuestions = 0;
let currentQuestionIndex = 0;
let currentFilters = {};
let currentMode = 'random';
let remainingProblems = [];

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

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded");
    // loadProblems();
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
        showToast("Failed to load problems. Please ensure you're running through a web server.", "error");
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
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMode = btn.dataset.mode;
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            startMode(currentMode);
        });
    });

    document.querySelector('.customize-btn').addEventListener('click', showCustomizeForm);
    document.querySelector('.favorites-btn').addEventListener('click', showFavorites);
    document.querySelector('.report-btn').addEventListener('click', showReport);
    document.querySelector('.flashcard').addEventListener('click', flipCard);
    document.querySelector('.notes-section').addEventListener('click', e => e.stopPropagation());
    
    document.querySelectorAll('.evaluation-buttons button').forEach(btn => {
        btn.addEventListener('click', () => evaluateAnswer(btn.className.split(' ')[0]));
    });
    
    document.querySelectorAll('.menu-button').forEach(btn => {
        btn.addEventListener('click', returnToMenu);
    });
    
    document.getElementById('timer-toggle').addEventListener('click', toggleTimer);
    document.querySelector('.save-notes-btn').addEventListener('click', saveNotes);
    document.querySelector('.favorite-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite();
    });

    document.getElementById('start-custom')?.addEventListener('click', () => {
        const filters = {
            difficulty: Array.from(document.getElementById('custom-difficulty').selectedOptions).map(opt => opt.value),
            minFrequency: document.getElementById('custom-frequency').value,
            maxHardness: document.getElementById('custom-hardness').value
        };
        document.getElementById('custom-form-container').classList.add('hidden');
        startCustomMode(filters);
    });

    document.getElementById('cancel-custom')?.addEventListener('click', returnToMenu);

    const searchInput = document.getElementById('search');
    let debounceTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
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
        }, 300);
    });

    document.addEventListener('click', (e) => {
        const resultsContainer = document.getElementById('autocomplete-results');
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
}

function shuffle(array) {
    let shuffledArray = [...array]; // Create a copy before shuffling
    let currentIndex = shuffledArray.length;
    
    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [shuffledArray[currentIndex], shuffledArray[randomIndex]] = 
            [shuffledArray[randomIndex], shuffledArray[currentIndex]];
    }
    
    return shuffledArray;
}

function startMode(mode, customFilters = null) {
    currentMode = mode;
    currentFilters = customFilters || {};
    currentQuestionIndex = 0;
    let filteredProblems;

    switch(mode) {
        case 'random':
            filteredProblems = shuffle([...problems]);
            break;
        case 'mistakes':
            filteredProblems = shuffle([...problems.filter(p => userProgress.incorrect[p['Leetcode Id']] > 0)]);
            break;
        case 'custom':
            filteredProblems = shuffle([...filterProblems(problems, currentFilters)]);
            break;
        case 'single':
            filteredProblems = [currentProblem];
            break;
    }

    if (filteredProblems.length === 0) {
        showToast("No problems match the selected criteria", "error");
        return;
    }

    remainingProblems = filteredProblems;
    totalQuestions = filteredProblems.length;
    
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('flashcard-container').classList.remove('hidden');
    
    updateProgress();
    showNextProblem();
}

function startCustomMode(filters) {
    let filteredProblems = [...problems];
    
    if (filters.difficulty.length > 0) {
        filteredProblems = filteredProblems.filter(p => filters.difficulty.includes(p.Difficulty));
    }
    
    if (filters.minFrequency) {
        filteredProblems = filteredProblems.filter(p => 
            parseFloat(p.Frequency) >= parseFloat(filters.minFrequency));
    }
    
    if (filters.maxHardness) {
        filteredProblems = filteredProblems.filter(p => 
            parseInt(p['Hardness rating']) <= parseInt(filters.maxHardness));
    }
    
    startMode('custom', { filteredProblems });
}

function filterProblems(problems, filters) {
    if (filters.filteredProblems) {
        return filters.filteredProblems;
    }
    return problems;
}

function showNextProblem() {
    console.log(`showNextProblem: remaining ${remainingProblems.length}`)
    console.log(`showNextProblem:currentQuestionIndex ${currentQuestionIndex}`)
    if (currentQuestionIndex >= remainingProblems.length) {
        if (confirm('You\'ve completed all questions! Would you like to continue with a new set?')) {
            startMode(currentMode, currentFilters);
        } else {
            returnToMenu();
        }
        return;
    }

    clearInterval(timer);
    displayNextProblem();
}

function displayNextProblem() {
    console.log(`displayNextProblem BEFORE: currentQuestionIndex ${currentQuestionIndex}`);
    currentProblem = remainingProblems[currentQuestionIndex];
    displayProblem(currentProblem);
    updateProgress();
    console.log(`displayNextProblem AFTER: currentQuestionIndex ${currentQuestionIndex}`);
}


function displayProblem(problem) {
    document.getElementById('problem-name').textContent = problem.Name;
    document.getElementById('problem-link').href = problem.Link;
    document.getElementById('answer').textContent = problem.Answer;
    document.getElementById('complexity').textContent = problem.Complexity;
    document.getElementById('freq').textContent = problem.Frequency;
    document.getElementById('hardness-rating').textContent = problem['Hardness rating'];
    
    document.getElementById('problem-notes').value = userProgress.notes[problem['Leetcode Id']] || '';
    
    updateFavoriteButton(problem['Leetcode Id']);
    
    document.querySelector('.flashcard').classList.remove('flipped');
    resetTimer();
    startTimer();
}

function displaySearchResults(matches, container) {
    container.innerHTML = '';
    container.classList.remove('hidden');
    
    if (matches.length === 0) {
        container.innerHTML = '<div class="search-result">No matches found</div>';
        return;
    }
    
    matches.forEach(problem => {
        const div = document.createElement('div');
        div.className = 'search-result';
        div.innerHTML = `
            <div class="problem-id">#${problem['Leetcode Id']}</div>
            <div class="problem-title">${problem.Name}</div>
            <div class="problem-difficulty ${problem.Difficulty.toLowerCase()}">
                ${problem.Difficulty}
            </div>
        `;
        div.addEventListener('click', () => {
            currentProblem = problem;
            startMode('single');
            container.classList.add('hidden');
        });
        container.appendChild(div);
    });
}

function flipCard() {
    document.querySelector('.flashcard').classList.toggle('flipped');
}

function evaluateAnswer(result) {
    console.log(`evaluateAnswer BEFORE: currentQuestionIndex ${currentQuestionIndex}`);
    const problemId = currentProblem['Leetcode Id'];
    
    if (result === 'easy') {
        userProgress.correct[problemId] = (userProgress.correct[problemId] || 0) + 1;
        userProgress.stats.correctStreak++;
        userProgress.stats.longestStreak = Math.max(userProgress.stats.longestStreak, userProgress.stats.correctStreak);
    } else if (result === 'medium') {
        userProgress.stats.correctStreak = 0;
    } else {
        userProgress.incorrect[problemId] = (userProgress.incorrect[problemId] || 0) + 1;
        userProgress.stats.correctStreak = 0;
    }
    
    userProgress.lastSeen[problemId] = new Date().toISOString();
    userProgress.stats.totalSeen++;
    currentQuestionIndex++;
    console.log(`evaluateAnswer AFTER increment: currentQuestionIndex ${currentQuestionIndex}`);
    
    saveProgress();
    updateProgress();
    showNextProblem();
    console.log(`evaluateAnswer END: currentQuestionIndex ${currentQuestionIndex}`);
}
function toggleTimer() {
    if (timerRunning) {
        stopTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    let seconds = 0;
    timer = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        document.getElementById('timer-display').textContent = 
            `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, 1000);
    document.querySelector('#timer-toggle i').className = 'fas fa-pause';
    timerRunning = true;
}

function stopTimer() {
    clearInterval(timer);
    document.querySelector('#timer-toggle i').className = 'fas fa-play';
    timerRunning = false;
}

function resetTimer() {
    clearInterval(timer);
    document.getElementById('timer-display').textContent = '00:00';
    document.querySelector('#timer-toggle i').className = 'fas fa-pause';
    timerRunning = true;
}

let favoriteLock = false; // Prevent rapid toggling

function toggleFavorite() {
    if (!currentProblem || favoriteLock) return;
    favoriteLock = true; // Lock the function temporarily
    
    const problemId = currentProblem['Leetcode Id'];
    if (!userProgress.favorites) {
        userProgress.favorites = [];
    }
    
    const index = userProgress.favorites.indexOf(problemId);
    if (index > -1) {
        userProgress.favorites.splice(index, 1);
        showToast('Removed from favorites', 'warning');
    } else {
        userProgress.favorites.push(problemId);
        showToast('Added to favorites', 'success');
    }
    
    updateFavoriteButton(problemId);
    saveProgress();

    // Release the lock after a short delay
    setTimeout(() => {
        favoriteLock = false;
    }, 300);
}

function updateFavoriteButton(pid) {
    const starIcon = document.querySelector('.favorite-btn i');
    if (!starIcon || !currentProblem) return;
    
    starIcon.className = userProgress.favorites.includes(pid) ? 
        'fas fa-star' : 'far fa-star';
}

function showFavorites() {
    if (!userProgress.favorites || userProgress.favorites.length === 0) {
        showToast('No favorite problems found. Click the star icon on problems to add them to favorites.', 'warning');
        return;
    }
    
    const favoritedProblems = problems.filter(p => userProgress.favorites.includes(p['Leetcode Id']));
    if (favoritedProblems.length === 0) {
        showToast('No favorite problems found', 'warning');
        return;
    }
    
    startMode('custom', { filteredProblems: favoritedProblems });
}

function showCustomizeForm() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('custom-form-container').classList.remove('hidden');
}

function saveNotes() {
    if (!currentProblem) return;
    
    const problemId = currentProblem['Leetcode Id'];
    const notes = document.getElementById('problem-notes').value;
    userProgress.notes[problemId] = notes;
    saveProgress();
    showToast('Notes saved successfully!', 'success');
}

function updateProgress() {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const percentage = (currentQuestionIndex / totalQuestions) * 100;
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${currentQuestionIndex + 1} / ${totalQuestions} Questions`;
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
        longestStreak: userProgress.stats.longestStreak,
        favorites: userProgress.favorites ? userProgress.favorites.length : 0
    };
    
    document.getElementById('stats-container').innerHTML = `
        <div class="stats">
            <p>Total Problems: ${stats.total}</p>
            <p>Problems Seen: ${stats.seen}</p>
            <p>Correct: ${stats.correct}</p>
            <p>Incorrect: ${stats.incorrect}</p>
            <p>Current Streak: ${stats.streak}</p>
            <p>Longest Streak: ${stats.longestStreak}</p>
            <p>Favorite Problems: ${stats.favorites}</p>
        </div>
    `;
}

function returnToMenu() {
    document.getElementById('flashcard-container').classList.add('hidden');
    document.getElementById('report-container').classList.add('hidden');
    document.getElementById('custom-form-container').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
    stopTimer();
    document.getElementById('timer-display').textContent = '00:00';
}

function saveProgress() {
    localStorage.setItem('userProgress', JSON.stringify(userProgress));
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.getElementById('toast-container').appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function updateUIWithUserProgress() {
    // Initialize any UI elements that depend on user progress
}

loadProblems();
