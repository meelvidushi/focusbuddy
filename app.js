// FocusBuddy - Enhanced Application
class FocusBuddyApp {
  constructor() {
    // Timer state
    this.timerInterval = null;
    this.timeRemaining = 25 * 60; // seconds
    this.totalTime = 25 * 60;
    this.isRunning = false;
    this.isPaused = false;
    this.currentMode = 'focus'; // 'focus' or 'break'
    
    // Settings
    this.settings = {
      focusDuration: 25,
      breakDuration: 5,
      autoStartBreak: false,
      autoStartFocus: false,
      soundNotifications: true,
      desktopNotifications: false,
      theme: 'blue',
      showMascot: true,
      volume: 50
    };
    
    // Stats
    this.stats = {
      streak: 0,
      todayBlocks: 0,
      todayMinutes: 0,
      weekSessions: 0,
      weekMinutes: 0,
      totalSessions: 0,
      totalMinutes: 0,
      longestStreak: 0,
      sessions: [],
      lastSessionDate: null,
      weeklyData: [0, 0, 0, 0, 0, 0, 0] // Sun-Sat
    };
    
    // Soundscape
    this.currentSoundscape = 'rain';
    this.audioContext = null;
    this.audioElements = {};
    
    // Mascot messages
    this.mascotMessages = {
      ready: [
        "Ready to focus? Let's crush this session together! 💪",
        "Time to get productive! I believe in you! 🌟",
        "Let's make this session count! You've got this! 🚀",
        "Ready for some focused work? I'm here to cheer you on! 🎯"
      ],
      running: [
        "You're doing amazing! Stay focused! 💫",
        "Great focus! Keep up the momentum! 🔥",
        "You're in the zone! Keep going strong! ⚡",
        "Fantastic work! Stay on track! 🌈"
      ],
      paused: [
        "Paused. Take a breather and come back strong! 😊",
        "Taking a moment? That's okay! Ready when you are! 🌸",
        "Short break? You deserve it! Resume when ready! ☕"
      ],
      completed: [
        "Incredible! You finished the session! 🎉",
        "Awesome work! You're unstoppable! 🌟",
        "Session complete! You're on fire! 🔥",
        "Well done! That's how it's done! 🏆"
      ],
      break: [
        "Break time! Relax and recharge! 🌺",
        "Great job! Enjoy your well-earned break! 🎈",
        "Time to rest! You've earned it! 💙"
      ]
    };
    
    this.init();
  }
  
  init() {
    this.loadData();
    this.setupEventListeners();
    this.updateDisplay();
    this.updateStats();
    this.checkStreak();
    this.applyTheme();
    this.updateMascotVisibility();
    
    // Initialize audio for soundscapes
    this.initAudio();
  }
  
  // Data Management
  loadData() {
    const savedSettings = localStorage.getItem('focusBuddySettings');
    const savedStats = localStorage.getItem('focusBuddyStats');
    
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }
    
    if (savedStats) {
      this.stats = { ...this.stats, ...JSON.parse(savedStats) };
    }
  }
  
  saveData() {
    localStorage.setItem('focusBuddySettings', JSON.stringify(this.settings));
    localStorage.setItem('focusBuddyStats', JSON.stringify(this.stats));
  }
  
  // Timer Functions
  startTimer() {
    if (this.isRunning && !this.isPaused) return;
    
    if (!this.isPaused) {
      // Starting fresh
      this.updateMascotMessage('running');
    }
    
    this.isRunning = true;
    this.isPaused = false;
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('stopBtn').disabled = false;
    
    document.querySelector('.timer-display-card').classList.add('timer-running');
    
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      
      if (this.timeRemaining <= 0) {
        this.completeSession();
      }
      
      this.updateDisplay();
    }, 1000);
  }
  
  pauseTimer() {
    if (!this.isRunning || this.isPaused) return;
    
    this.isPaused = true;
    clearInterval(this.timerInterval);
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.querySelector('.timer-display-card').classList.remove('timer-running');
    
    this.updateMascotMessage('paused');
  }
  
  stopTimer() {
    this.isRunning = false;
    this.isPaused = false;
    clearInterval(this.timerInterval);
    
    this.timeRemaining = this.totalTime;
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('stopBtn').disabled = true;
    document.querySelector('.timer-display-card').classList.remove('timer-running');
    
    this.updateDisplay();
    this.updateMascotMessage('ready');
  }
  
  completeSession() {
    clearInterval(this.timerInterval);
    this.isRunning = false;
    this.isPaused = false;
    
    document.querySelector('.timer-display-card').classList.remove('timer-running');
    
    // Play completion sound
    if (this.settings.soundNotifications) {
      this.playCompletionSound();
    }
    
    // Show desktop notification
    if (this.settings.desktopNotifications && Notification.permission === 'granted') {
      new Notification('FocusBuddy', {
        body: this.currentMode === 'focus' ? 
          'Focus session complete! Great job! 🎉' : 
          'Break is over! Ready to focus again?',
        icon: '🎯'
      });
    }
    
    if (this.currentMode === 'focus') {
      // Log the session
      this.logSession();
      
      // Update stats
      this.stats.todayBlocks++;
      this.stats.todayMinutes += Math.floor(this.totalTime / 60);
      this.stats.weekSessions++;
      this.stats.weekMinutes += Math.floor(this.totalTime / 60);
      this.stats.totalSessions++;
      this.stats.totalMinutes += Math.floor(this.totalTime / 60);
      
      // Update weekly data
      const today = new Date().getDay();
      this.stats.weeklyData[today]++;
      
      this.updateStats();
      this.checkStreak();
      this.saveData();
      
      // Show completion modal
      this.showCompletionModal();
      
      // Auto-start break if enabled
      if (this.settings.autoStartBreak) {
        setTimeout(() => {
          this.startBreak();
        }, 3000);
      }
    } else {
      // Break completed
      this.currentMode = 'focus';
      this.setSessionDuration(this.settings.focusDuration);
      this.updateMascotMessage('ready');
      
      // Auto-start focus if enabled
      if (this.settings.autoStartFocus) {
        setTimeout(() => {
          this.startTimer();
        }, 2000);
      }
    }
  }
  
  startBreak() {
    this.currentMode = 'break';
    this.setSessionDuration(this.settings.breakDuration);
    document.getElementById('sessionMode').textContent = 'Break Time';
    this.updateMascotMessage('break');
    this.closeModal();
    this.startTimer();
  }
  
  setSessionDuration(minutes) {
    this.totalTime = minutes * 60;
    this.timeRemaining = minutes * 60;
    this.updateDisplay();
    
    // Update session buttons
    document.querySelectorAll('.session-btn').forEach(btn => {
      btn.classList.remove('active');
      if (parseInt(btn.dataset.duration) === minutes) {
        btn.classList.add('active');
      }
    });
  }
  
  updateDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;
    
    // Update progress circle
    const progress = 1 - (this.timeRemaining / this.totalTime);
    const circumference = 2 * Math.PI * 90;
    const offset = circumference * (1 - progress);
    document.getElementById('progressCircle').style.strokeDashoffset = offset;
  }
  
  // Stats Functions
  updateStats() {
    document.getElementById('streakValue').textContent = this.stats.streak;
    document.getElementById('todayBlocks').textContent = this.stats.todayBlocks;
    document.getElementById('todayMinutes').textContent = this.stats.todayMinutes;
    
    document.getElementById('weekSessions').textContent = this.stats.weekSessions;
    document.getElementById('weekMinutes').textContent = this.stats.weekMinutes;
    document.getElementById('weekStreak').textContent = this.stats.longestStreak;
    
    document.getElementById('totalSessions').textContent = this.stats.totalSessions;
    document.getElementById('totalMinutes').textContent = this.stats.totalMinutes + ' minutes';
    document.getElementById('longestStreak').textContent = this.stats.longestStreak + ' days';
    
    // Calculate favorite soundscape
    const soundscapeCounts = {};
    this.stats.sessions.forEach(session => {
      soundscapeCounts[session.soundscape] = (soundscapeCounts[session.soundscape] || 0) + 1;
    });
    
    const favorite = Object.keys(soundscapeCounts).reduce((a, b) => 
      soundscapeCounts[a] > soundscapeCounts[b] ? a : b, 'None');
    document.getElementById('favoriteSoundscape').textContent = 
      favorite.charAt(0).toUpperCase() + favorite.slice(1);
    
    // Average session
    const avgMinutes = this.stats.totalSessions > 0 ? 
      Math.round(this.stats.totalMinutes / this.stats.totalSessions) : 0;
    document.getElementById('avgSession').textContent = avgMinutes + ' min';
    
    // Update session log
    this.updateSessionLog();
  }
  
  logSession() {
    const session = {
      date: new Date().toISOString(),
      duration: Math.floor(this.totalTime / 60),
      soundscape: this.currentSoundscape,
      completed: true
    };
    
    this.stats.sessions.unshift(session);
    
    // Keep only last 100 sessions
    if (this.stats.sessions.length > 100) {
      this.stats.sessions = this.stats.sessions.slice(0, 100);
    }
    
    this.stats.lastSessionDate = new Date().toDateString();
  }
  
  updateSessionLog() {
    const logContainer = document.getElementById('sessionLog');
    
    if (this.stats.sessions.length === 0) {
      logContainer.innerHTML = `
        <div class="empty-state">
          <p>No sessions yet. Start your first focus session! 🚀</p>
        </div>
      `;
      return;
    }
    
    const recentSessions = this.stats.sessions.slice(0, 20);
    
    logContainer.innerHTML = recentSessions.map(session => {
      const date = new Date(session.date);
      const timeStr = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `
        <div class="session-entry">
          <div class="session-info">
            <div class="session-time">⏰ ${timeStr}</div>
            <div class="session-details">
              <span class="session-duration">${session.duration} minutes</span>
              <span class="session-soundscape">🎵 ${session.soundscape}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  checkStreak() {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (this.stats.lastSessionDate === today) {
      // Already counted today
      return;
    } else if (this.stats.lastSessionDate === yesterday || !this.stats.lastSessionDate) {
      // Continue streak or start new
      this.stats.streak++;
      if (this.stats.streak > this.stats.longestStreak) {
        this.stats.longestStreak = this.stats.streak;
      }
    } else {
      // Streak broken
      this.stats.streak = 0;
    }
    
    // Reset daily stats if new day
    if (this.stats.lastSessionDate !== today) {
      this.stats.todayBlocks = 0;
      this.stats.todayMinutes = 0;
    }
    
    this.saveData();
  }
  
  // Mascot Functions
  updateMascotMessage(state) {
    const messages = this.mascotMessages[state];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    document.getElementById('mascotMessage').innerHTML = `<p>${randomMessage}</p>`;
  }
  
  updateMascotVisibility() {
    document.body.setAttribute('data-show-mascot', this.settings.showMascot);
  }
  
  // Modal Functions
  showCompletionModal() {
    const modal = document.getElementById('completionModal');
    modal.classList.add('active');
    
    document.getElementById('modalSessionTime').textContent = Math.floor(this.totalTime / 60);
    document.getElementById('modalSessionCount').textContent = this.stats.todayBlocks;
    
    this.updateMascotMessage('completed');
  }
  
  closeModal() {
    document.getElementById('completionModal').classList.remove('active');
  }
  
  // Soundscape Functions
  initAudio() {
    // Simulated soundscape - in production would use actual audio files
    this.audioElements = {
      rain: null,
      ocean: null,
      cafe: null,
      forest: null
    };
  }
  
  changeSoundscape(soundscape) {
    this.currentSoundscape = soundscape;
    
    // Update UI
    document.querySelectorAll('.soundscape-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.sound === soundscape) {
        btn.classList.add('active');
      }
    });
    
    // In production, this would actually play/stop audio files
    console.log(`Soundscape changed to: ${soundscape}`);
  }
  
  changeVolume(volume) {
    this.settings.volume = volume;
    // In production, would adjust actual audio volume
    this.saveData();
  }
  
  playCompletionSound() {
    // Simple beep using Web Audio API
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }
  
  // Settings Functions
  updateSettings() {
    this.settings.focusDuration = parseInt(document.getElementById('customFocus').value);
    this.settings.breakDuration = parseInt(document.getElementById('customBreak').value);
    this.settings.autoStartBreak = document.getElementById('autoStartBreak').checked;
    this.settings.autoStartFocus = document.getElementById('autoStartFocus').checked;
    this.settings.soundNotifications = document.getElementById('soundNotifications').checked;
    this.settings.desktopNotifications = document.getElementById('desktopNotifications').checked;
    this.settings.theme = document.getElementById('themeSelect').value;
    this.settings.showMascot = document.getElementById('showMascot').checked;
    
    this.saveData();
    this.applyTheme();
    this.updateMascotVisibility();
  }
  
  applyTheme() {
    document.body.setAttribute('data-theme', this.settings.theme);
  }
  
  requestNotificationPermission() {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          alert('Notifications enabled! You\'ll receive alerts when sessions complete.');
        }
      });
    }
  }
  
  exportData() {
    const dataStr = JSON.stringify({
      settings: this.settings,
      stats: this.stats
    }, null, 2);
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `focusbuddy-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }
  
  resetData() {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      localStorage.removeItem('focusBuddySettings');
      localStorage.removeItem('focusBuddyStats');
      location.reload();
    }
  }
  
  // Navigation
  switchView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    document.getElementById(`${viewName}-view`).classList.add('active');
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    
    if (viewName === 'stats') {
      this.renderChart();
    }
  }
  
  renderChart() {
    const canvas = document.getElementById('weeklyChart');
    const ctx = canvas.getContext('2d');
    
    // Simple bar chart
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = this.stats.weeklyData;
    const max = Math.max(...data, 1);
    
    const barWidth = canvas.width / 7 - 20;
    const maxHeight = canvas.height - 60;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    data.forEach((value, index) => {
      const x = index * (canvas.width / 7) + 10;
      const height = (value / max) * maxHeight;
      const y = canvas.height - height - 40;
      
      // Bar
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
      ctx.fillRect(x, y, barWidth, height);
      
      // Value label
      ctx.fillStyle = '#333';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(value, x + barWidth / 2, y - 5);
      
      // Day label
      ctx.fillText(days[index], x + barWidth / 2, canvas.height - 15);
    });
  }
  
  // Event Listeners
  setupEventListeners() {
    // Timer controls
    document.getElementById('startBtn').addEventListener('click', () => this.startTimer());
    document.getElementById('pauseBtn').addEventListener('click', () => this.pauseTimer());
    document.getElementById('stopBtn').addEventListener('click', () => this.stopTimer());
    
    // Session duration buttons
    document.querySelectorAll('.session-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const duration = parseInt(btn.dataset.duration);
        this.setSessionDuration(duration);
      });
    });
    
    // Soundscape buttons
    document.querySelectorAll('.soundscape-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.changeSoundscape(btn.dataset.sound);
      });
    });
    
    // Volume control
    document.getElementById('volumeSlider').addEventListener('input', (e) => {
      this.changeVolume(parseInt(e.target.value));
    });
    
    // Navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchView(tab.dataset.view);
      });
    });
    
    // Modal controls
    document.getElementById('startBreakBtn').addEventListener('click', () => {
      this.startBreak();
    });
    
    document.getElementById('continueBtn').addEventListener('click', () => {
      this.closeModal();
      this.currentMode = 'focus';
      this.setSessionDuration(this.settings.focusDuration);
      this.updateMascotMessage('ready');
    });
    
    // Settings
    document.getElementById('customFocus').addEventListener('change', () => this.updateSettings());
    document.getElementById('customBreak').addEventListener('change', () => this.updateSettings());
    document.getElementById('autoStartBreak').addEventListener('change', () => this.updateSettings());
    document.getElementById('autoStartFocus').addEventListener('change', () => this.updateSettings());
    document.getElementById('soundNotifications').addEventListener('change', () => this.updateSettings());
    document.getElementById('desktopNotifications').addEventListener('change', () => this.updateSettings());
    document.getElementById('themeSelect').addEventListener('change', () => this.updateSettings());
    document.getElementById('showMascot').addEventListener('change', () => this.updateSettings());
    
    document.getElementById('requestNotificationBtn').addEventListener('click', () => {
      this.requestNotificationPermission();
    });
    
    document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
    document.getElementById('resetDataBtn').addEventListener('click', () => this.resetData());
    
    // Load settings into UI
    document.getElementById('customFocus').value = this.settings.focusDuration;
    document.getElementById('customBreak').value = this.settings.breakDuration;
    document.getElementById('autoStartBreak').checked = this.settings.autoStartBreak;
    document.getElementById('autoStartFocus').checked = this.settings.autoStartFocus;
    document.getElementById('soundNotifications').checked = this.settings.soundNotifications;
    document.getElementById('desktopNotifications').checked = this.settings.desktopNotifications;
    document.getElementById('themeSelect').value = this.settings.theme;
    document.getElementById('showMascot').checked = this.settings.showMascot;
    document.getElementById('volumeSlider').value = this.settings.volume;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.focusBuddyApp = new FocusBuddyApp();
});