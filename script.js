const analyzeBtn = document.getElementById('analyzeBtn');
const codeInput = document.getElementById('codeInput');
const languageSelect = document.getElementById('language');
const resultsDiv = document.getElementById('results');
const useAICheckbox = document.getElementById('useAI');
const ollamaStatusIcon = document.getElementById('ollamaStatusIcon');
const ollamaStatusText = document.getElementById('ollamaStatusText');
const ollamaStatus = document.querySelector('.ollama-status');

// UI Elements
const settingsBtn = document.getElementById('settingsBtn');
const themeToggle = document.getElementById('themeToggle');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const soundToggle = document.getElementById('soundToggle');
const autoSaveToggle = document.getElementById('autoSaveToggle');
const clearHistoryBtn = document.getElementById('clearHistory');
const historyList = document.getElementById('historyList');
const copyResultsBtn = document.getElementById('copyResults');
const exportResultsBtn = document.getElementById('exportResults');
const prevAnalysisBtn = document.getElementById('prevAnalysis');
const nextAnalysisBtn = document.getElementById('nextAnalysis');
const analysisCounter = document.getElementById('analysisCounter');
const analysisTime = document.getElementById('analysisTime');
const codeComplexity = document.getElementById('codeComplexity');

const OLLAMA_API = 'http://localhost:11434/api/generate';
let ollamaAvailable = false;

// Audio context for sound effects
let audioContext = null;
let soundEnabled = true;

// Analysis history management
let analysisHistory = [];
let currentHistoryIndex = -1;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  checkOllamaAvailability();
  addInteractiveEffects();
  setupEventListeners();
  loadSettings();
  updateCodeStats();
});

function setupEventListeners() {
  // Settings panel
  settingsBtn.addEventListener('click', () => settingsPanel.classList.add('open'));
  closeSettings.addEventListener('click', () => settingsPanel.classList.remove('open'));
  
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
  // Settings
  soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    localStorage.setItem('soundEnabled', soundEnabled);
  });
  
  autoSaveToggle.addEventListener('change', () => {
    localStorage.setItem('autoSave', autoSaveToggle.checked);
  });
  
  clearHistoryBtn.addEventListener('click', clearHistory);
  
  // Code input
  codeInput.addEventListener('input', updateCodeStats);
  codeInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') analyzeCode();
  });
  
  // Analysis buttons
  analyzeBtn.addEventListener('click', analyzeCode);
  copyResultsBtn.addEventListener('click', copyResults);
  exportResultsBtn.addEventListener('click', exportResults);
  prevAnalysisBtn.addEventListener('click', previousAnalysis);
  nextAnalysisBtn.addEventListener('click', nextAnalysis);
}

function loadSettings() {
  soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  soundToggle.checked = soundEnabled;
  autoSaveToggle.checked = localStorage.getItem('autoSave') !== 'false';
  
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeToggle.textContent = '☀️';
  }
  
  loadHistoryFromStorage();
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  themeToggle.textContent = isLight ? '☀️' : '🌙';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

function updateCodeStats() {
  const code = codeInput.value;
  const lines = code.split('\n').length;
  const chars = code.length;
  const words = code.trim().split(/\s+/).filter(w => w.length > 0).length;
  
  document.getElementById('lineCount').textContent = lines;
  document.getElementById('charCount').textContent = chars;
  document.getElementById('wordCount').textContent = words;
}

function saveToHistory(code, language, analysis) {
  if (!autoSaveToggle.checked) return;
  
  const historyEntry = {
    code,
    language,
    analysis,
    timestamp: new Date().toLocaleTimeString(),
    analysisTime: analysis.analysisTime
  };
  
  analysisHistory.push(historyEntry);
  currentHistoryIndex = analysisHistory.length - 1;
  
  if (analysisHistory.length > 50) {
    analysisHistory.shift();
    currentHistoryIndex--;
  }
  
  updateHistoryUI();
  saveHistoryToStorage();
  updateNavigationButtons();
}

function updateHistoryUI() {
  historyList.innerHTML = analysisHistory.map((entry, index) => `
    <div class="history-item ${index === currentHistoryIndex ? 'active' : ''}" 
         onclick="loadFromHistory(${index})" 
         title="${entry.code.substring(0, 50)}...">
      ${entry.timestamp} - ${entry.language}
    </div>
  `).reverse().join('');
  
  analysisCounter.textContent = `${currentHistoryIndex + 1}/${analysisHistory.length}`;
}

function loadFromHistory(index) {
  if (index < 0 || index >= analysisHistory.length) return;
  
  currentHistoryIndex = index;
  const entry = analysisHistory[index];
  
  codeInput.value = entry.code;
  languageSelect.value = entry.language;
  displayResults(entry.analysis);
  updateCodeStats();
  updateHistoryUI();
  updateNavigationButtons();
  
  analysisTime.textContent = entry.analysisTime ? `${entry.analysisTime}ms` : '-';
}

function previousAnalysis() {
  if (currentHistoryIndex > 0) {
    loadFromHistory(currentHistoryIndex - 1);
  }
}

function nextAnalysis() {
  if (currentHistoryIndex < analysisHistory.length - 1) {
    loadFromHistory(currentHistoryIndex + 1);
  }
}

function updateNavigationButtons() {
  prevAnalysisBtn.disabled = currentHistoryIndex <= 0;
  nextAnalysisBtn.disabled = currentHistoryIndex >= analysisHistory.length - 1;
}

function clearHistory() {
  if (confirm('Clear all analysis history?')) {
    analysisHistory = [];
    currentHistoryIndex = -1;
    updateHistoryUI();
    updateNavigationButtons();
    saveHistoryToStorage();
  }
}

function saveHistoryToStorage() {
  try {
    localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory.map(h => ({
      code: h.code.substring(0, 500),
      language: h.language,
      timestamp: h.timestamp
    }))));
  } catch (e) {
    console.log('Could not save to localStorage');
  }
}

function loadHistoryFromStorage() {
  try {
    const saved = localStorage.getItem('analysisHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      analysisHistory = parsed.map(h => ({
        ...h,
        analysis: null,
        analysisTime: 0
      }));
      updateHistoryUI();
    }
  } catch (e) {
    console.log('Could not load from localStorage');
  }
}

function copyResults() {
  const text = resultsDiv.innerText;
  navigator.clipboard.writeText(text).then(() => {
    const originalText = copyResultsBtn.textContent;
    copyResultsBtn.textContent = '✓ Copied!';
    setTimeout(() => {
      copyResultsBtn.textContent = originalText;
    }, 2000);
  });
}

function exportResults() {
  if (analysisHistory.length === 0 || currentHistoryIndex < 0) return;
  
  const entry = analysisHistory[currentHistoryIndex];
  const data = JSON.stringify({
    code: entry.code,
    language: entry.language,
    analysis: entry.analysis,
    timestamp: entry.timestamp,
    exportedAt: new Date().toISOString()
  }, null, 2);
  
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analysis-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function addInteractiveEffects() {
  // Add ripple effect on button click
  analyzeBtn.addEventListener('mousedown', (e) => {
    const ripple = document.createElement('span');
    const rect = analyzeBtn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
    ripple.style.animation = 'ripple 0.6s ease-out';
    ripple.style.pointerEvents = 'none';
    
    analyzeBtn.style.position = 'relative';
    analyzeBtn.style.overflow = 'hidden';
    analyzeBtn.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });

  // Textarea focus effect
  codeInput.addEventListener('focus', () => {
    codeInput.style.transform = 'scale(1.01)';
  });

  codeInput.addEventListener('blur', () => {
    codeInput.style.transform = 'scale(1)';
  });

  // Language select effect
  languageSelect.addEventListener('change', () => {
    languageSelect.style.transform = 'scale(0.98)';
    setTimeout(() => {
      languageSelect.style.transform = 'scale(1)';
    }, 150);
  });
}

async function checkOllamaAvailability() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET'
    });
    if (response.ok) {
      ollamaAvailable = true;
      ollamaStatusIcon.textContent = '✅';
      ollamaStatusText.textContent = 'Ollama Available';
      ollamaStatus.classList.add('available');
      ollamaStatus.classList.remove('unavailable');
      useAICheckbox.disabled = false;
    } else {
      showOllamaUnavailable();
    }
  } catch (error) {
    showOllamaUnavailable();
  }
}

function showOllamaUnavailable() {
  ollamaAvailable = false;
  ollamaStatusIcon.textContent = '❌';
  ollamaStatusText.textContent = 'Ollama Not Running';
  ollamaStatus.classList.add('unavailable');
  ollamaStatus.classList.remove('available');
  useAICheckbox.disabled = true;
  useAICheckbox.checked = false;
}

async function analyzeCode() {
  const code = codeInput.value.trim();
  const language = languageSelect.value;
  const useAI = useAICheckbox.checked;

  if (!code) {
    alert('Please paste some code');
    return;
  }

  analyzeBtn.textContent = '⏳ Analyzing...';
  analyzeBtn.disabled = true;

  try {
    const startTime = performance.now();
    let analysis;
    if (useAI && ollamaAvailable) {
      analysis = await performAIAnalysis(code, language);
    } else {
      analysis = performLocalAnalysis(code, language);
    }
    const endTime = performance.now();
    const analysisTime = Math.round(endTime - startTime);
    
    analysis.analysisTime = analysisTime;
    displayResults(analysis);
    
    // Save to history
    const historyEntry = {
      code,
      language,
      analysis,
      timestamp: new Date().toLocaleTimeString(),
      analysisTime
    };
    saveToHistory(code, language, analysis);
    
    // Update UI
    analysisTime.textContent = `${analysisTime}ms`;
    copyResultsBtn.disabled = false;
    exportResultsBtn.disabled = false;
    
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    alert('Error analyzing code: ' + error.message);
    console.error(error);
  }

  analyzeBtn.textContent = '✨ Analyze Code';
  analyzeBtn.disabled = false;
}

function performLocalAnalysis(code, language) {
  return {
    errors: detectErrors(code),
    suggestions: getSuggestions(code),
    explanation: explainCode(code),
    howItWorks: analyzeCodeFlow(code),
    quality_rating: calculateQuality(code),
    isAI: false
  };
}

async function performAIAnalysis(code, language) {
  try {
    const prompt = `Analyze this ${language} code and provide:
1. Any errors or issues
2. Suggestions for improvement
3. What the code does
4. How the code works (step by step)
5. A code quality rating from 1-10

Code:
\`\`\`${language}
${code}
\`\`\`

Please format your response with clear sections for each point.`;

    const response = await fetch(OLLAMA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        prompt: prompt,
        stream: false,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Ollama API error');
    }

    const data = await response.json();
    const aiResponse = data.response;

    // Parse AI response
    return parseAIResponse(aiResponse);
  } catch (error) {
    console.error('AI Analysis Error:', error);
    alert('AI analysis failed. Falling back to local analysis.');
    return performLocalAnalysis(code, language);
  }
}

function parseAIResponse(response) {
  const sections = response.split(/\n(?=[0-9]\.|\*\*)/);
  
  let errors = '✅ No major errors found!';
  let suggestions = '✨ Code looks clean!';
  let explanation = '📖 Code Overview:\n' + response.substring(0, 200);
  let howItWorks = '🔄 How It Works:\n' + response.substring(200, 400);
  let quality = 7;

  // Try to extract sections from AI response
  for (let section of sections) {
    if (section.toLowerCase().includes('error') || section.toLowerCase().includes('issue')) {
      errors = '🐛 ' + section.substring(0, 500);
    }
    if (section.toLowerCase().includes('suggestion') || section.toLowerCase().includes('improvement')) {
      suggestions = '✨ ' + section.substring(0, 500);
    }
    if (section.toLowerCase().includes('does') || section.toLowerCase().includes('overview')) {
      explanation = '📖 ' + section.substring(0, 500);
    }
    if (section.toLowerCase().includes('works') || section.toLowerCase().includes('step')) {
      howItWorks = '🔄 ' + section.substring(0, 500);
    }
    if (section.toLowerCase().includes('quality') || section.toLowerCase().includes('rating')) {
      const match = section.match(/[0-9]+/);
      if (match) quality = Math.min(10, parseInt(match[0]));
    }
  }

  return {
    errors,
    suggestions,
    explanation,
    howItWorks,
    quality_rating: quality,
    isAI: true
  };
}

function detectErrors(code) {
  const issues = [];
  if (code.includes('var ')) issues.push('⚠️ Avoid using "var", use "let" or "const"');
  if (!code.includes(';') && code.length > 20) issues.push('⚠️ Missing semicolons detected');
  if (code.match(/function\s+\w+\s*\(/g) && !code.includes('return')) issues.push('⚠️ Function may be missing return statement');
  if (code.match(/==\s/g)) issues.push('⚠️ Loose equality (==) detected - use strict equality (===)');
  return issues.length > 0 ? issues.join('\n') : '✅ No major errors found!';
}

function getSuggestions(code) {
  const suggestions = [];
  if (code.length < 50) suggestions.push('💡 Code is very short - add more context for better analysis');
  if (!code.includes('//') && !code.includes('/*')) suggestions.push('💡 Consider adding comments to explain logic');
  if (code.match(/[a-z][a-z0-9]{20,}/gi)) suggestions.push('💡 Some variable names are quite long - consider shortening');
  if (code.match(/[a-z_]{1,2}\s*=/g)) suggestions.push('💡 Use descriptive variable names for clarity');
  if (!code.includes('const') && code.includes('let')) suggestions.push('💡 Prefer "const" by default, use "let" only when reassignment is needed');
  return suggestions.length > 0 ? suggestions.join('\n') : '✨ Code looks clean!';
}

function explainCode(code) {
  let explanation = '📖 Code Overview:\n';
  
  const functions = code.match(/function\s+\w+/g) || [];
  const classes = code.match(/class\s+\w+/g) || [];
  const loops = code.match(/\b(for|while|forEach)\b/g) || [];
  const conditionals = code.match(/\b(if|else|switch)\b/g) || [];
  
  if (functions.length > 0) {
    explanation += `\n• Defines ${functions.length} function(s): ${[...new Set(functions)].join(', ')}`;
  }
  if (classes.length > 0) {
    explanation += `\n• Contains ${classes.length} class(es)`;
  }
  if (loops.length > 0) {
    explanation += `\n• Uses ${loops.length} loop(s) for iteration`;
  }
  if (conditionals.length > 0) {
    explanation += `\n• Contains ${conditionals.length} conditional statement(s) for logic control`;
  }
  
  const variables = code.match(/(?:const|let|var)\s+\w+/g) || [];
  if (variables.length > 0) {
    explanation += `\n• Declares ${variables.length} variable(s)`;
  }
  
  if (explanation === '📖 Code Overview:\n') {
    explanation += '\nThis appears to be general programming code with basic logic.';
  }
  
  return explanation;
}

function analyzeCodeFlow(code) {
  let flow = '🔄 How It Works:\n';
  const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('//')).slice(0, 20);
  
  let stepNum = 1;
  
  lines.forEach(line => {
    line = line.trim();
    
    if (line.includes('function') || line.includes('const') || line.includes('let') || line.includes('var')) {
      flow += `\n${stepNum}. Declaration/Setup: ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`;
      stepNum++;
    } else if (line.includes('for') || line.includes('while')) {
      flow += `\n${stepNum}. Loop: Iterates through data${line.includes('for') ? ' using for loop' : ' using while loop'}`;
      stepNum++;
    } else if (line.includes('if') || line.includes('else')) {
      flow += `\n${stepNum}. Conditional: Checks condition and executes branch`;
      stepNum++;
    } else if (line.includes('return')) {
      flow += `\n${stepNum}. Return: Outputs result from function`;
      stepNum++;
    }
  });
  
  if (stepNum === 1) {
    flow += '\nExecution flow involves basic operations and logic blocks.';
  }
  
  return flow;
}

function calculateQuality(code) {
  let score = 5;
  if (code.includes('const')) score += 1.5;
  if (code.includes('//') || code.includes('/*')) score += 1;
  if (!code.includes('var')) score += 1;
  if (code.match(/[A-Z]/g)) score += 0.5;
  if (!code.includes('==')) score += 1;
  const commentRatio = (code.match(/\/\//g) || []).length / code.split('\n').length;
  if (commentRatio > 0.1) score += 0.5;
  return Math.min(10, Math.round(score * 10) / 10);
}

function displayResults(analysis) {
  const aiIndicator = analysis.isAI ? '<div class="ai-badge">🤖 AI-Powered Analysis</div>' : '';
  
  resultsDiv.innerHTML = `
    ${aiIndicator}
    <div class="result-card errors">
      <h3>🐛 Errors & Issues</h3>
      <p>${analysis.errors}</p>
    </div>
    <div class="result-card suggestions">
      <h3>✨ Suggestions</h3>
      <p>${analysis.suggestions}</p>
    </div>
    <div class="result-card explanation">
      <h3>📖 What This Code Does</h3>
      <p>${analysis.explanation}</p>
    </div>
    <div class="result-card how-it-works">
      <h3>🔄 How It Works</h3>
      <p>${analysis.howItWorks}</p>
    </div>
    <div class="result-card quality">
      <h3>⭐ Code Quality Rating</h3>
      <p class="rating">${analysis.quality_rating}/10</p>
      <p class="rating-label">${getRatingLabel(analysis.quality_rating)}</p>
    </div>
  `;
  
  // Calculate and display complexity
  const complexity = calculateCodeComplexity(codeInput.value);
  codeComplexity.textContent = `Complexity: ${complexity}`;
  
  // Play sound based on rating (only if enabled)
  if (soundEnabled) {
    playRatingSound(analysis.quality_rating);
  }
}

function calculateCodeComplexity(code) {
  let complexity = 0;
  
  // Count nested structures
  let depth = 0;
  let maxDepth = 0;
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '{' || code[i] === '[' || code[i] === '(') {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
    } else if (code[i] === '}' || code[i] === ']' || code[i] === ')') {
      depth--;
    }
  }
  
  complexity += maxDepth * 2;
  
  // Count control flow
  const controlFlow = (code.match(/\b(if|else|for|while|switch|catch)\b/g) || []).length;
  complexity += controlFlow;
  
  // Count functions
  const functions = (code.match(/\b(function|def|class|=>)\b/g) || []).length;
  complexity += functions;
  
  if (complexity < 5) return '🟢 Low';
  if (complexity < 15) return '🟡 Medium';
  if (complexity < 30) return '🟠 High';
  return '🔴 Very High';
}

function getRatingLabel(rating) {
  if (rating >= 9) return '🌟 Excellent';
  if (rating >= 7.5) return '✨ Very Good';
  if (rating >= 6) return '👍 Good';
  if (rating >= 4.5) return '📝 Fair';
  return '⚠️ Needs Improvement';
}

function playRatingSound(rating) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    let frequencies = [];
    let duration = 0.5;
    let delay = 0;
    
    if (rating >= 9) {
      // Excellent - happy high pitches
      frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
      duration = 0.4;
    } else if (rating >= 7.5) {
      // Very Good - bright middle pitches
      frequencies = [440, 554.37, 659.25]; // A4, C#5, E5
      duration = 0.35;
    } else if (rating >= 6) {
      // Good - neutral middle pitch
      frequencies = [392, 440, 494]; // G4, A4, B4
      duration = 0.3;
    } else if (rating >= 4.5) {
      // Fair - lower pitches
      frequencies = [329.63, 349.23]; // E4, F4
      duration = 0.4;
    } else {
      // Needs improvement - low sad pitches
      frequencies = [261.63, 246.94]; // C4, B3
      duration = 0.5;
    }
    
    // Play each frequency with slight delay for chord effect
    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const envelope = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      envelope.gain.setValueAtTime(0.3, now + delay + index * 0.05);
      envelope.gain.exponentialRampToValueAtTime(0.01, now + delay + index * 0.05 + duration);
      
      osc.connect(envelope);
      envelope.connect(ctx.destination);
      
      osc.start(now + delay + index * 0.05);
      osc.stop(now + delay + index * 0.05 + duration);
    });
  } catch (error) {
    console.log('Audio not available or blocked:', error);
  }
}