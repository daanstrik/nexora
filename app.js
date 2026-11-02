const $ = (id) => document.getElementById(id);
const SUPABASE_URL = (window.NEXORA_CONFIG?.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = window.NEXORA_CONFIG?.SUPABASE_ANON_KEY || '';
let accessToken = null;
let refreshToken = null;
let currentUser = null;
let currentMode = 'nexora';
let busy = false;

function toast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 3000);
}
function setAuthMessage(message) { $('authMessage').textContent = message || ''; }
function configReady() { return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY); }
function authHeaders(extra = {}) { return { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json', ...extra }; }
function base64url(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
async function sha256(value) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); }

async function signIn(provider) {
  if (!configReady()) { setAuthMessage('Add your Supabase URL and anon key in config.js first.'); return; }
  if (provider !== 'google') return;
  setAuthMessage('Connecting to Google…');
  try {
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
    sessionStorage.setItem('nexora_pkce_verifier', verifier);
    const challenge = base64url(await sha256(verifier));
    const redirectTo = window.location.origin + window.location.pathname;
    const url = new URL(SUPABASE_URL + '/auth/v1/authorize');
    url.searchParams.set('provider', provider);
    url.searchParams.set('redirect_to', redirectTo);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 's256');
    window.location.assign(url.toString());
  } catch (error) { setAuthMessage('Could not start sign-in. Check that this site uses HTTPS.'); }
}

async function exchangeAuthCode() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (!code) return false;
  const verifier = sessionStorage.getItem('nexora_pkce_verifier');
  if (!verifier) { setAuthMessage('Sign-in session expired. Please try again.'); return false; }
  const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=pkce', {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ auth_code: code, code_verifier: verifier })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.message || 'Could not complete sign-in.');
  sessionStorage.removeItem('nexora_pkce_verifier');
  history.replaceState({}, document.title, location.pathname);
  setSession(data); return true;
}
function setSession(data) {
  accessToken = data.access_token; refreshToken = data.refresh_token; currentUser = data.user || null;
  // Keep the session for this browser tab so refreshing the page does not sign the user out.
  sessionStorage.setItem('nexora_session', JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, user: currentUser }));
}
function restoreSession() {
  try { const saved = JSON.parse(sessionStorage.getItem('nexora_session') || 'null'); if (saved?.access_token && saved?.refresh_token) { accessToken = saved.access_token; refreshToken = saved.refresh_token; currentUser = saved.user || null; return true; } } catch (_) { sessionStorage.removeItem('nexora_session'); }
  return false;
}
async function getUser() {
  if (!accessToken) return null;
  const response = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: authHeaders({ Authorization: 'Bearer ' + accessToken }) });
  if (response.status === 401 && refreshToken) { await refreshSession(); return getUser(); }
  if (!response.ok) throw new Error('Could not verify your session.');
  currentUser = await response.json(); return currentUser;
}
async function refreshSession() {
  const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', { method:'POST', headers:authHeaders(), body:JSON.stringify({refresh_token:refreshToken}) });
  if (!response.ok) { accessToken = refreshToken = currentUser = null; sessionStorage.removeItem('nexora_session'); return; }
  setSession(await response.json());
}
function showApp(user) {
  $('loginScreen').classList.add('hidden'); $('appShell').classList.remove('hidden');
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Nexora user';
  $('userName').textContent = name; $('userEmail').textContent = user.email || '';
  $('userAvatar').textContent = name.charAt(0).toUpperCase();
  $('todayDate').textContent = new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'}).format(new Date());
}
async function signOut() {
  if (accessToken) await fetch(SUPABASE_URL + '/auth/v1/logout', { method:'POST', headers:authHeaders({Authorization:'Bearer '+accessToken}) }).catch(()=>{});
  accessToken = refreshToken = currentUser = null; sessionStorage.removeItem('nexora_session'); $('appShell').classList.add('hidden'); $('loginScreen').classList.remove('hidden'); setAuthMessage('You have signed out.');
}

function setMode(mode) {
  currentMode = mode === 'lisa' ? 'lisa' : 'nexora';
  document.body.classList.toggle('theme-lisa', currentMode === 'lisa');
  document.body.classList.toggle('theme-nexora', currentMode === 'nexora');
  document.querySelectorAll('.mode-button').forEach(button => button.classList.toggle('selected', button.dataset.mode === currentMode));
  $('footerMode').textContent = currentMode.toUpperCase() + ' MODE';
  $('assistantTitle').innerHTML = currentMode === 'lisa' ? 'Lisa <span>Assistant</span>' : 'AI <span>Assistant</span>';
  $('assistantSubtitle').textContent = currentMode === 'lisa' ? 'A retro-computing guide with a classic desktop sensibility.' : 'A helpful AI for thinking, creating, and learning.';
  $('chatWelcomeTitle').textContent = currentMode === 'lisa' ? 'What shall we work on, operator?' : 'What would you like to explore?';
  $('chatWelcomeCopy').textContent = currentMode === 'lisa' ? 'Ask about classic computing, early graphical interfaces, or period-inspired workflows.' : 'Ask a question, work through an idea, or start something new.';
  $('chatInput').placeholder = currentMode === 'lisa' ? 'Enter a request for Lisa…' : 'Message Nexora AI…';
  $('modeInfoIcon').textContent = currentMode === 'lisa' ? '▤' : '✦';
  $('modeInfoTitle').textContent = currentMode === 'lisa' ? 'Lisa mode' : 'Nexora';
  $('modeInfoCopy').textContent = currentMode === 'lisa' ? 'A specialist guide to the history, concepts, terminology, and workflows of classic Lisa and early Macintosh-era computing. It is an AI persona, not a software emulator.' : 'A versatile assistant for everyday questions, planning, writing, and creative work.';
  $('suggestions').innerHTML = currentMode === 'lisa'
    ? '<button>Explain the Lisa desktop metaphor</button><button>Describe classic file workflows</button><button>Compare Lisa and early Macintosh</button>'
    : '<button>Help me plan a project</button><button>Explain a difficult concept</button><button>Give me creative ideas</button>';
  $('suggestions').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { $('chatInput').value = button.textContent; $('chatInput').focus(); }));
}
function showView(name) {
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'view-' + name));
  document.querySelectorAll('.side-link[data-view]').forEach(link => link.classList.toggle('active', link.dataset.view === name));
  $('breadcrumbTitle').textContent = name === 'home' ? 'Overview' : name === 'assistant' ? 'AI Assistant' : 'Projects';
  $('sidebar').classList.remove('open');
}
function addMessage(role, text, isError = false) {
  const wrap = document.createElement('div'); wrap.className = 'message ' + role;
  const avatar = document.createElement('div'); avatar.className = 'message-avatar'; avatar.textContent = role === 'user' ? (currentUser?.email?.[0]?.toUpperCase() || 'Y') : (currentMode === 'lisa' ? '▤' : '✧');
  const bubble = document.createElement('div'); bubble.className = 'message-bubble' + (isError ? ' error' : ''); bubble.textContent = text;
  wrap.append(avatar,bubble); $('chatMessages').append(wrap); $('chatMessages').scrollTop = $('chatMessages').scrollHeight; return bubble;
}
async function sendMessage(text) {
  if (!text.trim() || busy) return;
  if (!accessToken) { toast('Please sign in again.'); return; }
  busy = true; $('sendButton').disabled = true; $('chatWelcomeTitle')?.closest('.welcome-message')?.remove();
  addMessage('user', text);
  const pending = addMessage('assistant', currentMode === 'lisa' ? 'Processing request…' : 'Thinking…');
  try {
    const response = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken}, body:JSON.stringify({message:text,mode:currentMode}) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The AI request failed.');
    pending.textContent = data.reply || 'No response was returned.';
  } catch (error) { pending.textContent = error.message || 'Something went wrong.'; pending.classList.add('error'); }
  finally { busy = false; $('sendButton').disabled = false; $('chatInput').focus(); $('chatMessages').scrollTop = $('chatMessages').scrollHeight; }
}

$('googleLogin').addEventListener('click', () => signIn('google'));
$('signOut').addEventListener('click', signOut);
document.querySelectorAll('.side-link[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => showView(button.dataset.go)));
document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('switchLisaCard').addEventListener('click', () => { setMode('lisa'); toast('Lisa mode enabled.'); });
$('mobileMenu').addEventListener('click', () => $('sidebar').classList.toggle('open'));
$('newChat').addEventListener('click', () => { $('chatMessages').innerHTML = ''; const welcome = document.createElement('div'); welcome.className='welcome-message'; welcome.innerHTML='<div class="assistant-avatar">✧</div><h2 id="chatWelcomeTitle"></h2><p id="chatWelcomeCopy"></p><div class="suggestion-list" id="suggestions"></div>';  $('chatMessages').append(welcome); setMode(currentMode); toast('New conversation started.'); });
$('chatForm').addEventListener('submit', event => { event.preventDefault(); const text = $('chatInput').value.trim(); if (!text) return; $('chatInput').value=''; sendMessage(text); });
$('chatInput').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); $('chatForm').requestSubmit(); } });

(async function init() {
  setMode('nexora');
  if (!configReady()) { setAuthMessage('Setup required: add Supabase settings to config.js.'); return; }
  try {
    const exchanged = await exchangeAuthCode();
    if (!exchanged) restoreSession();
    const user = await getUser();
    if (user) showApp(user);
  } catch (error) { setAuthMessage(error.message); }
})();
