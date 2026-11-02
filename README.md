# Nexora — Vercel + Supabase Google Login + OpenRouter

Nexora is a vanilla HTML/CSS/JavaScript workspace with two modes:

- **Nexora:** a modern workspace and general-purpose AI assistant.
- **Lisa:** a classic desktop-inspired interface and a specialist AI persona for vintage Lisa / early Macintosh computing. Lisa mode simulates workflows in text; it is not an operating-system emulator.

The app uses **Google sign-in only**. Apple sign-in has been removed. AI requests go from the browser to the Vercel serverless endpoint `/api/chat`, which calls OpenRouter. The OpenRouter key is never sent to the browser.

## What you need

- A GitHub account
- A Vercel account
- A Supabase project
- A Google Cloud project for OAuth credentials
- An OpenRouter account and API key

## Part 1 — Create the Supabase project

1. Open [Supabase](https://supabase.com/) and create a new project.
2. Wait until the project is ready.
3. In the Supabase dashboard, open **Project Settings → API** (sometimes shown as **API Keys**).
4. Copy these two values and keep the dashboard open:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / publishable key** — the public browser key. Do not use a `service_role` or secret key.

You will add both values to Vercel later. The app reads them from a small server endpoint at `/api/config`; you do not need to create a `config.js` file.

## Part 2 — Create Google OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or select an existing project).
3. Open **Google Auth Platform**. If Google asks you to configure the consent screen, choose **External** if this is for general Google accounts, fill in the app name and support email, and complete the required contact details.
4. If the app is still in testing, add your own Google account under **Audience → Test users**. Only listed test users can sign in while the OAuth app remains in testing.
5. Open **Clients** (or **APIs & Services → Credentials**) and choose **Create client → OAuth client ID**.
6. Select **Web application**.
7. Under **Authorized JavaScript origins**, add your Vercel site origin after your first deployment, for example:
   - `https://nexora-yourname.vercel.app`
8. Under **Authorized redirect URIs**, add the Supabase callback URL. Find the exact value in **Supabase → Authentication → Sign In / Providers → Google**. It usually looks like:
   - `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   Use the exact callback displayed by Supabase, not your Vercel URL.
9. Create the OAuth client. Copy the **Client ID** and **Client secret**.

## Part 3 — Enable Google in Supabase

1. In Supabase, open **Authentication → Sign In / Providers → Google** (the dashboard label may be **Authentication → Providers**).
2. Turn Google on.
3. Paste the Google **Client ID** and **Client secret**.
4. Save.

Do not put the Google client secret in your website files or GitHub repository.

## Part 4 — Create an OpenRouter API key

1. Open [OpenRouter](https://openrouter.ai/), create/sign in to your account, and open the **Keys** page in the dashboard.
2. Create a new API key. Copy it once and keep it private.
3. Choose a model from the [OpenRouter models catalogue](https://openrouter.ai/models). Copy its exact model ID (the format is usually `provider/model-name`).
4. If you want to start with a free model, select one marked free in the catalogue and use the exact model ID shown there. Free model availability and rate limits can change; some models require credits.

The app uses the model ID in `OPENROUTER_MODEL`. The same model is used for Nexora and Lisa; their different system prompts make the modes behave differently.

## Part 5 — Put the project on GitHub

1. Download and unzip `nexora-vercel-starter.zip`.
2. Open the unzipped `nexora` folder. The folder you upload must contain `index.html`, `app.js`, `styles.css`, `api/`, `package.json`, and `vercel.json` directly inside it.
3. Create a new **private** repository on [GitHub](https://github.com/).
4. Upload the contents of the `nexora` folder to the repository root (not an extra nested `nexora/nexora` folder).
5. Commit the files.

Do not upload API keys, `.env` files, Google client secrets, or OpenRouter keys to GitHub.

## Part 6 — Deploy on Vercel

1. Open [Vercel](https://vercel.com/) and sign in with GitHub.
2. Choose **Add New → Project**.
3. Import your Nexora GitHub repository.
4. In project configuration:
   - **Project Name:** `nexora` (or another available name)
   - **Framework Preset:** `Other`
   - **Root Directory:** `./` if the files are at the repository root
   - **Build Command:** leave empty / override disabled
   - **Output Directory:** leave empty / default
   - **Install Command:** leave default; this project has no npm dependencies
5. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | Your Supabase Project URL |
   | `SUPABASE_ANON_KEY` | Your Supabase anon / publishable key |
   | `OPENROUTER_API_KEY` | Your private OpenRouter API key |
   | `OPENROUTER_MODEL` | Exact model ID from OpenRouter |

   Add each variable to **Production**, **Preview**, and **Development** if you want all environments to work. Do not add quotes around values.
6. Click **Deploy**.
7. When deployment finishes, open the Vercel URL, for example `https://nexora-yourname.vercel.app`. Copy the exact URL.

## Part 7 — Finish the Google redirect settings

Now that you have your Vercel URL:

1. In **Supabase → Authentication → URL Configuration**, set **Site URL** to your Vercel URL, e.g. `https://nexora-yourname.vercel.app`.
2. Under **Redirect URLs**, add the exact Vercel URL and a local development URL if needed:
   - `https://nexora-yourname.vercel.app/**`
   - `http://localhost:3000/**`
3. In **Google Cloud Console → Google Auth Platform → Clients**, add your Vercel origin under **Authorized JavaScript origins**:
   - `https://nexora-yourname.vercel.app`
4. Keep the **Authorized redirect URI** set to the Supabase callback URL from Part 2.
5. Save changes.

The distinction matters: Google redirects back to **Supabase's callback URL**; Supabase then redirects the user back to your **Vercel site**.

## Part 8 — Redeploy and test

If you changed Vercel environment variables after the first deployment, go to **Vercel → Project → Deployments**, open the latest deployment menu, and choose **Redeploy**. Then test:

1. Open your Vercel URL in a private/incognito browser window.
2. Click **Continue with Google** and complete the Google consent flow.
3. Confirm the dashboard opens and your Google account appears in the sidebar.
4. Open **AI Assistant** and send a short test message in Nexora mode.
5. Switch to **Lisa** and ask it to describe the classic Lisa desktop. Confirm its answer has the Lisa persona.
6. Sign out and confirm you return to the login screen.

## Environment variables and secrets

- `SUPABASE_URL` — public project URL, read by both the browser config endpoint and the API.
- `SUPABASE_ANON_KEY` — public anon/publishable key. It is expected to be visible to browsers; secure data with Supabase Auth and Row Level Security if you add database tables.
- `OPENROUTER_API_KEY` — **secret**. Only `/api/chat` reads it on the server. Never add it to HTML, CSS, `app.js`, `config.js`, or GitHub.
- `OPENROUTER_MODEL` — exact model ID selected from OpenRouter.

If you rotate a key, update the Vercel environment variable and redeploy.

## Troubleshooting

- **Google says `redirect_uri_mismatch`:** the Google OAuth client must contain the exact Supabase callback URL shown in Supabase's Google provider settings. It is not the Vercel website URL.
- **Supabase says `redirect URL not allowed`:** add the Vercel site URL to Supabase **Authentication → URL Configuration → Redirect URLs**.
- **Google app is in testing:** add the Google account you're testing with under Google Auth Platform **Audience → Test users**.
- **Login button says setup required:** check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Vercel and that the latest deployment has been redeployed.
- **AI says server setup is incomplete:** check `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `OPENROUTER_API_KEY` in Vercel. Also check the latest deployment has the variables.
- **AI returns a model error:** check that `OPENROUTER_MODEL` is an exact, currently available model ID and that your OpenRouter account can use it.
- **Changes do not appear:** redeploy the project or push a new commit to the connected GitHub repository.

## Current limitations

- Google OAuth is the only sign-in provider in this build. Apple sign-in UI and code have been removed.
- The AI endpoint currently sends the latest message with the mode's system prompt; it does not yet store or send full multi-turn chat history.
- The Projects page is a visual placeholder, not a database-backed project manager.
- The browser session is kept in `sessionStorage` for the current tab. Closing the tab ends the local session; sign in again when you return.
- Lisa is a text-based AI persona and visual theme, not a real Lisa OS emulator.
