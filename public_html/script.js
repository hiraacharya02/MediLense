/**
 * LearnLense — script.js
 * Shared across all pages. Detects which page it's on via
 * document.body.dataset.page and runs the right init function.
 *
 * Sections:
 *   1. Page detection & init
 *   2. Auth helpers  (localStorage fake auth)
 *   3. Landing page  (no JS needed beyond auth redirect)
 *   4. Login page    (switchAuthTab, handleLogin, handleSignup)
 *   5. Dashboard     (greeting, stats, recent topics, mode selector)
 *   6. Learning tool (handleLearnClick, render, builders)
 *   7. AI API call   ← ADD YOUR KEY HERE WHEN READY
 *   8. Chat panel
 *   9. Utilities
 */


/* ══════════════════════════════════════════════════════════════════════
   1. PAGE DETECTION & INIT
══════════════════════════════════════════════════════════════════════ */

const PAGE = document.body.dataset.page; // 'landing' | 'login' | 'dashboard'

document.addEventListener('DOMContentLoaded', () => {
  if (PAGE === 'landing')   initLanding();
  if (PAGE === 'login')     initLogin();
  if (PAGE === 'dashboard') initDashboard();
});


/* ══════════════════════════════════════════════════════════════════════
   2. AUTH HELPERS
   Storage key: 'll_user'  →  { name, email, password }
   This is a local school project — passwords are stored in plain text
   in the browser. Never do this in a real app.
══════════════════════════════════════════════════════════════════════ */

const AUTH_KEY = 'll_user';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
}

function saveUser(name, email, password) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ name, email, password }));
}

function isLoggedIn() {
  return getUser() !== null;
}

function handleLogout() {
  // Keep study stats — only remove the user session
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'index.html';
}

/** requireAuth — call at top of any page that needs login */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}


/* ══════════════════════════════════════════════════════════════════════
   3. LANDING PAGE
══════════════════════════════════════════════════════════════════════ */

function initLanding() {
  // If already logged in, "Get started" goes straight to dashboard
  if (isLoggedIn()) {
    document.querySelectorAll('a[href="login.html?mode=signup"]').forEach(el => {
      el.href = 'dashboard.html';
      el.textContent = el.textContent.includes('→')
        ? 'Go to dashboard →'
        : 'Go to dashboard';
    });
  }
}


/* ══════════════════════════════════════════════════════════════════════
   4. LOGIN PAGE
══════════════════════════════════════════════════════════════════════ */

function initLogin() {
  // If already logged in, skip to dashboard
  if (isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Check URL param ?mode=signup to open the signup tab by default
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'signup') {
    switchAuthTab('signup');
  }
}

function switchAuthTab(tab) {
  // Update tab buttons
  document.getElementById('tab-login').classList.toggle('auth-tab--active',  tab === 'login');
  document.getElementById('tab-signup').classList.toggle('auth-tab--active', tab === 'signup');

  // Show/hide forms
  document.getElementById('form-login').hidden  = (tab !== 'login');
  document.getElementById('form-signup').hidden = (tab !== 'signup');

  // Clear any errors
  hideAuthError('login');
  hideAuthError('signup');
}

function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  // Basic empty checks
  if (!email || !password) {
    showAuthError('login', 'Please fill in both fields.');
    return;
  }

  const user = getUser();

  // No account registered
  if (!user) {
    showAuthError('login', 'No account found. Please sign up first.');
    return;
  }

  // Wrong credentials
  if (user.email !== email || user.password !== password) {
    showAuthError('login', 'Incorrect email or password.');
    return;
  }

  // Success
  window.location.href = 'dashboard.html';
}

function handleSignup() {
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!name) {
    showAuthError('signup', 'Please enter your name.');
    return;
  }

  if (!email || !email.includes('@')) {
    showAuthError('signup', 'Please enter a valid email address.');
    return;
  }

  if (password.length < 6) {
    showAuthError('signup', 'Password must be at least 6 characters.');
    return;
  }

  saveUser(name, email, password);
  window.location.href = 'dashboard.html';
}

function showAuthError(formId, message) {
  const el = document.getElementById(formId + '-error');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function hideAuthError(formId) {
  const el = document.getElementById(formId + '-error');
  if (el) el.hidden = true;
}


/* ══════════════════════════════════════════════════════════════════════
   5. DASHBOARD — greeting, stats, recent topics
══════════════════════════════════════════════════════════════════════ */

// ── Study data storage keys ──────────────────────────────────────────
const STORE = {
  recentTopics:  'll_recent',
  sessionsDate:  'll_sess_date',
  sessionsCount: 'll_sess_count',
  streakDate:    'll_streak_date',
  streakCount:   'll_streak_count',
};

function initDashboard() {
  requireAuth();

  const user = getUser();

  // Show username in nav and welcome heading
  const navName     = document.getElementById('nav-username');
  const welcomeName = document.getElementById('welcome-name');
  if (navName)     navName.textContent     = user.name;
  if (welcomeName) welcomeName.textContent = user.name;

  setGreeting();
  renderStats();
  renderRecentTopics();
  setMode('visual'); // default tab
}

function setGreeting() {
  const hour = new Date().getHours();
  const el   = document.getElementById('greeting-text');
  if (!el) return;

  if      (hour < 12) el.textContent = 'Good morning';
  else if (hour < 18) el.textContent = 'Good afternoon';
  else                el.textContent = 'Good evening';
}

function renderStats() {
  const recent   = getRecentTopics();
  const sessions = getSessionsToday();
  const streak   = getStreak();

  setText('stat-topics',   recent.length);
  setText('stat-sessions', sessions);
  setText('stat-streak',   streak);
  setText('stat-mode',     capitalise(currentMode));

  // Nav streak pill
  const navStreak = document.getElementById('nav-streak');
  if (navStreak) {
    if (streak > 0) {
      navStreak.textContent = `🔥 ${streak} day streak`;
      navStreak.hidden = false;
    } else {
      navStreak.hidden = true;
    }
  }
}

function renderRecentTopics() {
  const recent  = getRecentTopics();
  const section = document.getElementById('recent-section');
  const grid    = document.getElementById('recent-topics-grid');
  if (!section || !grid) return;

  if (recent.length === 0) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  const modeIcons = {
    visual: '🎨', auditory: '🎧', reading: '📖', kinesthetic: '⚙️',
  };

  grid.innerHTML = recent.map(item => `
    <button
      class="topic-history-card"
      onclick="reloadTopic('${escapeAttr(item.topic)}', '${item.mode}')"
    >
      <span class="topic-history-card__mode-icon">${modeIcons[item.mode] || '📚'}</span>
      <div class="topic-history-card__info">
        <div class="topic-history-card__name">${escapeHtml(item.topic)}</div>
        <div class="topic-history-card__meta">
          <span class="topic-history-card__mode-label mode-label--${item.mode}">
            ${item.mode}
          </span>
          <span>${formatTimeAgo(item.timestamp)}</span>
        </div>
      </div>
    </button>
  `).join('');
}

function reloadTopic(topic, mode) {
  setMode(mode);
  document.getElementById('topic-input').value = topic;
  handleLearnClick();
  document.querySelector('.learn-tool').scrollIntoView({ behavior: 'smooth' });
}

function clearRecentTopics() {
  localStorage.removeItem(STORE.recentTopics);
  renderRecentTopics();
  renderStats();
}

// ── localStorage read helpers ────────────────────────────────────────
function getRecentTopics() {
  try { return JSON.parse(localStorage.getItem(STORE.recentTopics) || '[]'); }
  catch { return []; }
}

function getSessionsToday() {
  const today = new Date().toDateString();
  if (localStorage.getItem(STORE.sessionsDate) !== today) return 0;
  return parseInt(localStorage.getItem(STORE.sessionsCount) || '0', 10);
}

function getStreak() {
  return parseInt(localStorage.getItem(STORE.streakCount) || '0', 10);
}

// ── Save session after each successful Learn click ───────────────────
function saveSession(topic, mode) {
  // Recent topics list
  let recent = getRecentTopics().filter(
    item => item.topic.toLowerCase() !== topic.toLowerCase()
  );
  recent.unshift({ topic, mode, timestamp: Date.now() });
  recent = recent.slice(0, 8);
  localStorage.setItem(STORE.recentTopics, JSON.stringify(recent));

  // Sessions today
  const today   = new Date().toDateString();
  const storedD = localStorage.getItem(STORE.sessionsDate);
  if (storedD === today) {
    const n = parseInt(localStorage.getItem(STORE.sessionsCount) || '0', 10);
    localStorage.setItem(STORE.sessionsCount, n + 1);
  } else {
    localStorage.setItem(STORE.sessionsDate,  today);
    localStorage.setItem(STORE.sessionsCount, '1');
  }

  // Streak
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const lastDay   = localStorage.getItem(STORE.streakDate);
  const streak    = getStreak();

  if      (lastDay === today)     { /* same day, no change */ }
  else if (lastDay === yesterday) {
    localStorage.setItem(STORE.streakCount, streak + 1);
    localStorage.setItem(STORE.streakDate,  today);
  } else {
    localStorage.setItem(STORE.streakCount, '1');
    localStorage.setItem(STORE.streakDate,  today);
  }
}


/* ══════════════════════════════════════════════════════════════════════
   6. LEARNING TOOL — mode, learn button, render
══════════════════════════════════════════════════════════════════════ */

let currentMode  = 'visual';
let currentTopic = '';
let exerciseData = [];

function setMode(mode) {
  currentMode = mode;

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.className = 'mode-btn';
    btn.setAttribute('aria-selected', 'false');
  });

  const btn = document.getElementById('mode-btn-' + mode);
  if (btn) {
    btn.classList.add('mode-btn--active-' + mode);
    btn.setAttribute('aria-selected', 'true');
  }

  // Keep stat card in sync
  setText('stat-mode', capitalise(mode));
}

async function handleLearnClick() {
  const input = document.getElementById('topic-input');
  const topic = input.value.trim();
  if (!topic) { input.focus(); return; }

  currentTopic = topic;

  // Reset chat
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '';
  const chatPanel = document.getElementById('chat-panel');
  if (chatPanel) chatPanel.hidden = true;

  showLoadingState();

  try {
    const aiText = await callAI(buildPrompt(topic));
    renderOutput(aiText);

    saveSession(topic, currentMode);
    renderStats();
    renderRecentTopics();

    if (chatPanel) {
      chatPanel.hidden = false;
      appendChatMessage('ai',
        `Loaded your ${currentMode} content on "${topic}". Ask me anything! 💡`
      );
    }
  } catch (err) {
    showErrorState(err);
  }
}

function renderOutput(rawText) {
  const panel = document.getElementById('output-panel');

  if (currentMode === 'visual') {
    panel.innerHTML = `<div class="visual-content">${rawText}</div>`;
    return;
  }

  let parsed;
  try {
    const clean = rawText.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    panel.innerHTML = `<div class="visual-content"><p>${rawText}</p></div>`;
    return;
  }

  if (currentMode === 'auditory')    panel.innerHTML = buildAuditoryHTML(parsed);
  if (currentMode === 'reading')     panel.innerHTML = buildReadingHTML(parsed);
  if (currentMode === 'kinesthetic') {
    exerciseData    = (parsed.exercises || []).map(e => ({ answer: e.modelAnswer, hint: e.hint }));
    panel.innerHTML = buildKinestheticHTML(parsed.exercises || []);
  }
}

// ── HTML builders per mode ───────────────────────────────────────────
function buildAuditoryHTML(data) {
  let html = '';

  (data.videos || []).forEach(v => {
    const idMatch = v.url && v.url.match(/v=([^&]+)/);
    const thumb   = idMatch
      ? `<img src="https://img.youtube.com/vi/${idMatch[1]}/hqdefault.jpg"
              alt="Thumbnail" onerror="this.parentElement.innerHTML='🎬'">`
      : '🎬';

    html += `
      <div class="video-card">
        <div class="video-card__thumbnail">${thumb}</div>
        <div class="video-card__body">
          <div class="video-card__title">${v.title || ''}</div>
          <div class="video-card__channel">📺 ${v.channel || ''}</div>
          <div class="video-card__description">${v.description || ''}</div>
          <a class="video-card__link" href="${v.url || '#'}" target="_blank" rel="noopener">
            ▶ Watch on YouTube
          </a>
        </div>
      </div>`;
  });

  if (data.listeningGuide?.length) {
    html += `
      <div class="listening-guide">
        <div class="listening-guide__title">🎯 Listening Guide</div>
        <ul>${data.listeningGuide.map(p => `<li>${p}</li>`).join('')}</ul>
      </div>`;
  }
  return html;
}

function buildReadingHTML(data) {
  const paras = (data.article?.body || '').split('\n\n').map(p => `<p>${p}</p>`).join('');

  let html = `
    <div class="article-card">
      <div class="article-card__title">📄 ${data.article?.title || ''}</div>
      <div class="article-card__body">${paras}</div>
      <div class="article-card__source">— ${data.article?.source || ''}</div>
    </div>`;

  if (data.furtherReading?.length) {
    html += `
      <div class="further-reading">
        <div class="further-reading__title">📚 Further Reading</div>
        ${data.furtherReading.map(b => `
          <div class="book-item">
            <div class="book-item__title">${b.title}</div>
            <div class="book-item__author">— ${b.author}</div>
            <div class="book-item__note">${b.note}</div>
          </div>`).join('')}
      </div>`;
  }
  return html;
}

function buildKinestheticHTML(exercises) {
  return exercises.map((ex, i) => `
    <div class="exercise-card">
      <div class="exercise-card__title">Exercise ${i + 1}: ${ex.title}</div>
      <div class="exercise-card__prompt">${ex.prompt}</div>
      <textarea id="ex-answer-${i}" class="exercise-card__textarea"
        placeholder="Write your answer here…"></textarea>
      <button class="exercise-card__check-btn" onclick="checkAnswer(${i})">
        Check Answer
      </button>
      <div id="ex-feedback-${i}"></div>
    </div>`).join('');
}

function checkAnswer(i) {
  const val      = document.getElementById('ex-answer-' + i).value.trim();
  const feedback = document.getElementById('ex-feedback-' + i);
  if (!val) {
    feedback.innerHTML = '<div class="exercise-card__feedback exercise-card__feedback--empty">Please write something first!</div>';
    return;
  }
  const { answer, hint } = exerciseData[i] || {};
  feedback.innerHTML = `
    <div class="exercise-card__feedback exercise-card__feedback--correct">
      💡 <strong>Model answer:</strong> ${answer}
      <br><small style="opacity:.65">Hint: ${hint}</small>
    </div>`;
}


/* ══════════════════════════════════════════════════════════════════════
   7. AI API CALL
   ─────────────────────────────────────────────────────────────────────
   This is the ONLY function you need to change when adding the AI.
   Step 1: Paste your Anthropic API key into API_KEY below.
   Step 2: That's it — everything else is already wired up.

   ⚠️  SECURITY REMINDER:
       Your API key is visible to anyone who opens DevTools.
       This is fine for a local school project. Never deploy this online.
══════════════════════════════════════════════════════════════════════ */

const API_KEY = ''; // ← paste your key here when ready

// Medical context injected into every prompt
const MEDICAL_CONTEXT =
  'You are LearnLense, an AI tutor for medical students. ' +
  'Only provide information consistent with peer-reviewed medical knowledge ' +
  '(anatomy, physiology, pharmacology, pathology, clinical medicine). ' +
  'Never invent sources. Keep content accurate and clinically relevant.';

async function callAI(prompt) {
  // ── DEMO MODE — remove this block once you add your API key ──────────
  if (!API_KEY) {
    return getDemoContent(currentMode, currentTopic);
  }
  // ─────────────────────────────────────────────────────────────────────

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type':                              'application/json',
      'x-api-key':                                 API_KEY,
      'anthropic-version':                         '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

function buildPrompt(topic) {
  const prompts = {
    visual: `
      ${MEDICAL_CONTEXT}
      The student wants to visually learn about: "${topic}".
      Write a rich explanation as plain HTML — no code fences, no markdown.
      Use ONLY: <h3>, <p>, <ul>, <li>, <div class="concept-box">, <span class="key-term">.
      Structure: 2-sentence clinical overview · Key concepts with <h3> headings ·
      A clinical analogy · Key facts as <ul>.
    `,
    auditory: `
      ${MEDICAL_CONTEXT}
      Student wants to watch/listen about: "${topic}".
      Reply ONLY with raw JSON (no markdown, no backticks).
      Suggest 2 real YouTube videos from: Osmosis, Ninja Nerd, Armando Hasudungan, Khan Academy Medicine.
      {"videos":[{"url":"https://www.youtube.com/watch?v=REAL_ID","title":"...","channel":"...","description":"one sentence"}],"listeningGuide":["point 1","point 2","point 3"]}
    `,
    reading: `
      ${MEDICAL_CONTEXT}
      Student wants to read about: "${topic}".
      Reply ONLY with raw JSON (no markdown, no backticks).
      {"article":{"title":"...","body":"para1\\n\\npara2\\n\\npara3","source":"LearnLense Medical Digest"},"furtherReading":[{"title":"...","author":"...","note":"why read this"}]}
    `,
    kinesthetic: `
      ${MEDICAL_CONTEXT}
      Student wants to practise: "${topic}".
      Reply ONLY with raw JSON (no markdown, no backticks).
      Create 4 exercises (clinical reasoning, labelling, recall, problem-solving).
      {"exercises":[{"title":"short title","prompt":"full task","hint":"helpful hint","modelAnswer":"correct answer"}]}
    `,
  };
  return prompts[currentMode];
}


/* ══════════════════════════════════════════════════════════════════════
   DEMO CONTENT
   Shows while there is no API key — so the interface still looks
   complete and you can present it without needing an API key yet.
══════════════════════════════════════════════════════════════════════ */

function getDemoContent(mode, topic) {
  if (mode === 'visual') {
    return `
      <h3>Overview</h3>
      <p>This is a <span class="key-term">demo preview</span> of the visual mode for
      <strong>${escapeHtml(topic)}</strong>. Add your Anthropic API key to
      <code>script.js</code> to generate real medical content.</p>
      <h3>How it works</h3>
      <p>When the AI is connected, this section will contain structured clinical
      explanations, key term highlights, and concept boxes generated specifically
      for the topic you entered.</p>
      <div class="concept-box">
        <strong>🔑 Key concept box</strong><br/>
        Important definitions and core mechanisms will appear here, formatted clearly
        for medical students.
      </div>
      <h3>Key facts</h3>
      <ul>
        <li>Visual mode delivers structured HTML explanations</li>
        <li>Key terms are highlighted for quick scanning</li>
        <li>Concept boxes isolate the most important ideas</li>
        <li>All content sourced from trusted medical knowledge</li>
      </ul>`;
  }

  if (mode === 'auditory') {
    return JSON.stringify({
      videos: [
        {
          url:         'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          title:       `Demo: ${topic} — Medical Explanation`,
          channel:     'Osmosis (example)',
          description: 'Add your API key to get real curated YouTube recommendations for this topic.',
        },
        {
          url:         'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          title:       `Demo: Understanding ${topic}`,
          channel:     'Ninja Nerd (example)',
          description: 'This is placeholder content. Real videos will be suggested once the AI is connected.',
        },
      ],
      listeningGuide: [
        'Listen for the core mechanism being described',
        'Note any clinical relevance or disease associations',
        'Pause and summarise each major section in your own words',
      ],
    });
  }

  if (mode === 'reading') {
    return JSON.stringify({
      article: {
        title:  `Introduction to ${topic}`,
        body:   `This is a demo article for ${topic}. Once you add your API key, a real 350-word clinical article will be generated here.\n\nThe article will cover the core concepts, clinical relevance, and key mechanisms in clear, student-friendly language.\n\nFurther context, case applications, and connections to related topics will also be included.`,
        source: 'LearnLense Medical Digest (demo)',
      },
      furtherReading: [
        { title: 'Gray\'s Anatomy',    author: 'Henry Gray',     note: 'The definitive anatomical reference for medical students.' },
        { title: 'Robbins Pathology',  author: 'Kumar et al.',   note: 'Essential for understanding disease mechanisms.' },
        { title: 'Goodman & Gilman',   author: 'Brunton et al.', note: 'The standard pharmacology textbook for medical education.' },
      ],
    });
  }

  if (mode === 'kinesthetic') {
    return JSON.stringify({
      exercises: [
        {
          title:       'Recall challenge',
          prompt:      `Without looking anything up, write down everything you know about ${topic}. Include mechanisms, clinical relevance, and any related conditions.`,
          hint:        'Start with the basic definition, then add mechanisms, then clinical applications.',
          modelAnswer: 'This is a demo. Add your API key to get a proper model answer tailored to the topic.',
        },
        {
          title:       'Clinical reasoning',
          prompt:      `A patient presents with symptoms related to ${topic}. Describe the likely mechanism and what investigations you would order.`,
          hint:        'Think about pathophysiology first, then connect it to clinical findings.',
          modelAnswer: 'This is a demo. Real model answers will be generated by the AI.',
        },
        {
          title:       'Explain like a teacher',
          prompt:      `Explain ${topic} as if you were teaching it to a fellow student who has never heard of it before.`,
          hint:        'Use an analogy to make it memorable.',
          modelAnswer: 'This is a demo. Add your API key to see real model answers.',
        },
        {
          title:       'Connect the concepts',
          prompt:      `List three other medical topics that are directly connected to ${topic} and explain why each connection matters clinically.`,
          hint:        'Think about upstream causes, downstream effects, and treatment implications.',
          modelAnswer: 'This is a demo. Real content requires an API key.',
        },
      ],
    });
  }

  return '<p>Demo content not available for this mode.</p>';
}


/* ══════════════════════════════════════════════════════════════════════
   8. CHAT PANEL
══════════════════════════════════════════════════════════════════════ */

let chatHistory = [];

async function handleChatSend() {
  const input   = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  appendChatMessage('user', message);
  chatHistory.push({ role: 'user', content: message });

  // Demo mode
  if (!API_KEY) {
    const reply = `This is a demo response. Add your API key to get real AI answers about "${currentTopic}".`;
    chatHistory.push({ role: 'assistant', content: reply });
    appendChatMessage('ai', reply);
    return;
  }

  try {
    const system =
      `${MEDICAL_CONTEXT} ` +
      `The student is studying "${currentTopic}" in ${currentMode} mode. ` +
      `Reply helpfully in 2–3 sentences. Stay medically accurate.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type':                              'application/json',
        'x-api-key':                                 API_KEY,
        'anthropic-version':                         '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 400,
        system,
        messages:   [...chatHistory],
      }),
    });

    const data  = await res.json();
    const reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    chatHistory.push({ role: 'assistant', content: reply });
    appendChatMessage('ai', reply);
  } catch {
    appendChatMessage('ai', 'Connection issue — please try again.');
  }
}

function appendChatMessage(sender, text) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const el = document.createElement('div');
  el.className  = 'chat-message chat-message--' + (sender === 'user' ? 'user' : 'ai');
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}


/* ══════════════════════════════════════════════════════════════════════
   9. UTILITIES
══════════════════════════════════════════════════════════════════════ */

function showLoadingState() {
  const panel = document.getElementById('output-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="output-loading">
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
      &nbsp;Generating your ${currentMode} content…
    </div>`;
}

function showErrorState(err) {
  const panel = document.getElementById('output-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="output-error">
      ⚠️ Something went wrong.
      <br><small style="opacity:.5">${String(err).slice(0, 200)}</small>
    </div>`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
