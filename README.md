# EduQuests — 3D Multiplayer Study & Quiz Battle Arena

**EduQuests** is an interactive 3D multiplayer study hangout room and quiz battle arena where classmates review PDF study notes together, hang out on live voice/video chat, and battle across 4 arena modes (**Co-Op Raid Boss**, **1v1 PvP Duel**, **3v3 Team Battle**, and **Solo Training**).

---

## Live Playable Links

- **Live Shared Web Link**: [https://ais-pre-uj7ndjye4xip46hgbwljpl-907503175078.asia-southeast1.run.app](https://ais-pre-uj7ndjye4xip46hgbwljpl-907503175078.asia-southeast1.run.app)
- **Direct Room #CS3A99 Invite Link**: [https://ais-pre-uj7ndjye4xip46hgbwljpl-907503175078.asia-southeast1.run.app/?room=CS3A99](https://ais-pre-uj7ndjye4xip46hgbwljpl-907503175078.asia-southeast1.run.app/?room=CS3A99)

You can also click the **SHARE LINK** button in the top-right bar of the game lobby at any time to copy your live app link or a direct room invite link (`?room=CODE`).

---

## Accessing via Link on GitHub (GitHub Pages)

This repository is pre-configured for one-click **GitHub Pages** deployment:

1. **Relative Base Path Configured**: `vite.config.ts` uses `base: './'` and all assets resolve relatively, so the built app runs cleanly on any GitHub Pages URL (`https://<your-username>.github.io/<repo-name>/`).
2. **Offline / Static Quiz Fallback**: When hosted on static GitHub Pages without a Node backend, the **Inventory** PDF/notes quiz generator automatically falls back to client-side question extraction so all features remain 100% playable.
3. **Automated GitHub Actions Workflow**: `.github/workflows/deploy.yml` automatically builds `./dist` and deploys to GitHub Pages on every push to `main` or `master`.

### Steps to Publish Your GitHub Link:
1. Push or export this project to a GitHub repository.
2. In your GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Once the **Deploy EduQuests to GitHub Pages** workflow finishes (~1 minute), your live game link will be available at:
   ```text
   https://<your-github-username>.github.io/<repository-name>/
   ```
   You can also share room-specific links with classmates:
   ```text
   https://<your-github-username>.github.io/<repository-name>/?room=CS3A99
   ```

---

## Key Features

- **3D Squad Hangout Lobby**: Up to 6 classmates stand together in the 3D study room beside your character.
- **Transparent Room Chat & Live Video/Voice Call**:
  - Send text messages, **Photos**, **Videos**, **Hyperlinks**, **PDF Files**, and **Study Notes** directly in the transparent room chat drawer above the Profile card.
  - Turn on the **Camera** toggle to view live camera feeds of joined room members at the top of the chat; click any user's video feed to open a split-screen **Live Video & Chat** pop-up window.
- **Student Profile & Character Customizer**:
  - Click **PROFILE (VIEW PROFILE)** to inspect your Scholar Profile, room standing, and active study deck, or customize your 3D character's body type, outfit style, and aura glow.
- **Inventory & Canvas Topic Drawer**:
  - Upload or paste PDF lecture notes in the top drawer to generate custom quiz decks, and organize your subjects in the Canvas-style bottom drawer.
- **4 Arena Battle Modes**:
  - **1v1 PvP**: Head-to-head classmate quiz duel with 2 Damage Blocks and charged attacks.
  - **Co-Op Raid**: Team up with classmates to defeat the Raid Boss before the timer runs out.
  - **3v3 Team**: Alpha vs. Omega block section squad battle.
  - **Training**: Unlimited-time solo practice mode.

---

## Local Development & Verification

```bash
# Install dependencies
npm install

# Run full-stack development server (Port 3000)
npm run dev

# Run pure combat & quiz parser unit tests
npx tsx --test src/game/rules.test.ts

# Build static bundle for production / GitHub Pages
npm run build
```

## Public Multiplayer and Account Deployment

GitHub Pages can serve the EduQuests interface, but real multiplayer rooms and accounts require the Node/WebSocket server plus a PostgreSQL database.

1. Create a PostgreSQL database in Neon or Render.
2. Deploy this repository as a Node Web Service on Render using `render.yaml`.
3. Configure `DATABASE_URL`, `JWT_SECRET`, and `APP_URL`:
   - `DATABASE_URL`: PostgreSQL connection string.
   - `JWT_SECRET`: a random secret of at least 32 characters.
   - `APP_URL`: the public GitHub Pages URL.
4. For GitHub Pages, set the frontend build environment variable `VITE_API_URL` to the Render service URL and redeploy.
5. Add a real administrator email to the privacy policy before public release.

The server provides account registration, login, session verification, account deletion, quiz generation, room WebSockets, and the live room directory.
