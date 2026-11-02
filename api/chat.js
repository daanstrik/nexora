const NEXORA_SYSTEM = `You are Nexora, a capable, clear, friendly general-purpose AI assistant. Help with learning, planning, writing, coding, brainstorming, and problem solving. Be honest about uncertainty. Do not claim to have performed actions you have not performed.`;
const LISA_SYSTEM = `You are Lisa, a classic-computing emulation-style AI persona inspired by the Apple Lisa, Lisa Office System concepts, early graphical user interfaces, and the early Macintosh era. Your tone is composed, precise, and lightly period-inspired, like a helpful classic desktop assistant. When the user asks to interact with the old-computer experience, simulate it in text: present plausible menus, dialogs, desktop items, document workflows, and command-style prompts, while labeling the interaction as a simulation. Also answer historical and technical questions, and distinguish documented facts from informed reconstruction. You are not actually running or emulating vintage software: never claim to boot Lisa Office System, execute original applications, access vintage hardware, or reproduce an authentic operating system. If asked about “Lisa OS 1.90”, explain that version labels and historical references should be verified rather than inventing release details. Keep explanations accessible and do not pretend modern capabilities existed in the original system.`;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!supabaseUrl || !supabaseKey || !openRouterKey) return res.status(500).json({ error: 'Server setup is incomplete. Add the required environment variables in Vercel.' });
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in is required.' });
  try {
    const userResponse = await fetch(supabaseUrl.replace(/\/$/, '') + '/auth/v1/user', {
      headers: { apikey: supabaseKey, Authorization: auth }
    });
    if (!userResponse.ok) return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const mode = body.mode === 'lisa' ? 'lisa' : 'nexora';
    if (!message) return res.status(400).json({ error: 'Write a message first.' });
    if (message.length > 8000) return res.status(413).json({ error: 'Message is too long. Please keep it under 8,000 characters.' });
    const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + openRouterKey,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://vercel.app',
        'X-Title': 'Nexora AI'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: mode === 'lisa' ? LISA_SYSTEM : NEXORA_SYSTEM },
          { role: 'user', content: message }
        ],
        temperature: mode === 'lisa' ? 0.45 : 0.7,
        max_tokens: 1200
      })
    });
    const result = await aiResponse.json();
    if (!aiResponse.ok) {
      const safeMessage = result?.error?.message || 'The AI provider returned an error.';
      return res.status(502).json({ error: safeMessage.slice(0, 300) });
    }
    const reply = result?.choices?.[0]?.message?.content;
    if (!reply || typeof reply !== 'string') return res.status(502).json({ error: 'The AI provider returned an empty response.' });
    return res.status(200).json({ reply, mode, model });
  } catch (error) {
    console.error('Nexora chat error:', error);
    return res.status(500).json({ error: 'Could not reach the AI service. Please try again.' });
  }
};
