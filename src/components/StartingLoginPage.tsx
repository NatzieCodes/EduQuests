import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  CheckCircle2,
  KeyRound,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { computeCircularPreviewOrbit } from '../game/rules';

export interface GamePreviewItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  modeTag: string;
  imageUrl: string;
  description: string;
}

const GAME_PREVIEWS: GamePreviewItem[] = [
  {
    id: 'lobby',
    title: '3D Cozy Study Lobby & Companion',
    subtitle: 'Interactive 3D Student Avatar & Otter Companion',
    badge: '3D SCHOLAR LOBBY',
    modeTag: 'LIVE HUB',
    imageUrl: `${import.meta.env.BASE_URL}assets/previews/preview-lobby.png`,
    description:
      'Hang out in your 3D study room with your animated scholar avatar and goggled otter companion before launching into quiz combat.',
  },
  {
    id: 'battle',
    title: 'Real-Time 1v1 PvP & Raid Quiz Arena',
    subtitle: 'Fast-Attack Combos, Protect Shields & Charged Specials',
    badge: 'BATTLE ARENA',
    modeTag: 'PVP & RAID',
    imageUrl: `${import.meta.env.BASE_URL}assets/previews/preview-battle.png`,
    description:
      'Answer course questions accurately and quickly to unleash 3D Fast Attacks, charge your Special Move, and block rival damage.',
  },
  {
    id: 'profile',
    title: '3D Standing Character & Outfit Customizer',
    subtitle: 'Full-Body 3D Standing Rig, Outfits & Live Friends',
    badge: 'SCHOLAR PROFILE',
    modeTag: '3D RIG',
    imageUrl: `${import.meta.env.BASE_URL}assets/previews/preview-profile.png`,
    description:
      'Customize your 3D standing scholar from head to sneakers, rotate 360°, and connect with real online classmates.',
  },
  {
    id: 'room',
    title: '6-Player Multiplayer Study Room & Chat',
    subtitle: 'Public & Password-Protected Rooms with Live Media Chat',
    badge: 'MULTIPLAYER ROOM',
    modeTag: '6 PLAYERS',
    imageUrl: `${import.meta.env.BASE_URL}assets/previews/preview-room.png`,
    description:
      'Create or join rooms with up to 6 real players, stand side-by-side in 3D, share PDFs/notes, and toggle live video & mic.',
  },
  {
    id: 'world',
    title: 'Sky Airship Academy & Raid Bosses',
    subtitle: 'Co-Op Raid Battles & Course Topic Mastery',
    badge: 'RAID BOSSES',
    modeTag: 'CO-OP BOSS',
    imageUrl: `${import.meta.env.BASE_URL}assets/aistudio/image_9acd0d81.png`,
    description:
      'Team up with classmates from your block section to defeat high-CP Raid Bosses using custom decks from your lecture notes.',
  },
];

/* ============================================================================
   AUTHENTIC BRAND & INSTITUTION LOGOS (SVG)
   ============================================================================ */

const GmailLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path fill="#4285F4" d="M6 12.8V36c0 2.21 1.79 4 4 4h4V21.8l-8-6V12.8z" />
    <path fill="#34A853" d="M34 40h4c2.21 0 4-1.79 4-4V12.8l-8 6V40z" />
    <path fill="#FBBC04" d="M34 10.8v11l8-6V12c0-3.31-3.78-5.2-6.4-3.2L34 10.8z" />
    <path fill="#EA4335" d="M14 21.8v-11l10 7.5 10-7.5v11L24 29.3 14 21.8z" />
    <path fill="#C5221F" d="M6 12v3.8l8 6v-11L12.4 8.8C9.78 6.8 6 8.69 6 12z" />
  </svg>
);

const FacebookLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="21" fill="#1877F2" />
    <path
      fill="#FFFFFF"
      d="M29.82 30.6l.94-6.12h-5.87v-3.97c0-1.67.82-3.3 3.45-3.3h2.67V11.99s-2.42-.41-4.74-.41c-4.84 0-8 2.93-8 8.24v4.66h-5.38v6.12h5.38V44.9a21.2 21.2 0 006.62 0V30.6h4.93z"
    />
  </svg>
);

const GitHubLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="#181717"
      d="M24 4C12.95 4 4 12.95 4 24c0 8.85 5.73 16.35 13.68 19 .99.18 1.36-.43 1.36-.96 0-.48-.02-2.06-.03-3.73-5.56 1.21-6.73-2.36-6.73-2.36-.91-2.31-2.22-2.92-2.22-2.92-1.81-1.24.14-1.21.14-1.21 2.01.14 3.07 2.06 3.07 2.06 1.78 3.06 4.68 2.17 5.82 1.66.18-1.29.7-2.17 1.27-2.67-4.44-.5-9.11-2.22-9.11-9.89 0-2.18.78-3.97 2.06-5.37-.21-.5-.89-2.54.2-5.29 0 0 1.68-.54 5.5 2.05A19.16 19.16 0 0124 13.68c1.7.01 3.41.23 5.01.68 3.82-2.59 5.5-2.05 5.5-2.05 1.09 2.75.41 4.79.2 5.29 1.28 1.4 2.06 3.19 2.06 5.37 0 7.69-4.68 9.38-9.13 9.88.72.62 1.36 1.84 1.36 3.71 0 2.68-.02 4.84-.02 5.5 0 .53.36 1.15 1.37.95C38.28 40.34 44 32.84 44 24c0-11.05-8.95-20-20-20z"
    />
  </svg>
);

const UniversityOfTheEastLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    {/* Outer UE Crimson Red Seal Ring */}
    <circle cx="32" cy="32" r="30" fill="#C8102E" stroke="#FACC15" strokeWidth="2.2" />
    <circle cx="32" cy="32" r="24.5" fill="#FFFFFF" stroke="#991B1B" strokeWidth="1.5" />
    <circle cx="32" cy="32" r="21.5" fill="#C8102E" />

    {/* Rising Sun of the East Rays */}
    <g stroke="#FDE047" strokeWidth="1.6" strokeLinecap="round">
      <line x1="32" y1="13" x2="32" y2="18" />
      <line x1="23" y1="15.5" x2="25.5" y2="19.5" />
      <line x1="41" y1="15.5" x2="38.5" y2="19.5" />
      <line x1="16.5" y1="21.5" x2="20.5" y2="23.5" />
      <line x1="47.5" y1="21.5" x2="43.5" y2="23.5" />
    </g>

    {/* Golden Laurel Wreath Left & Right */}
    <path
      d="M18 39c-2.5-5-1.5-11 2.5-15M46 39c2.5-5 1.5-11-2.5-15"
      stroke="#FACC15"
      strokeWidth="2"
      strokeLinecap="round"
    />

    {/* Flaming Torch of Knowledge */}
    <path d="M32 16c2.2 2.2 2.5 4.6 0 6.6-2.5-2-2.2-4.4 0-6.6z" fill="#FACC15" />
    <rect x="30.7" y="22.5" width="2.6" height="9" rx="1" fill="#FEF08A" />

    {/* Open Book of Wisdom */}
    <path
      d="M21 31.5c3.5-1.2 7.2-.8 11 1.2 3.8-2 7.5-2.4 11-1.2v8.2c-3.5-1.1-7.2-.7-11 1.2-3.8-1.9-7.5-2.3-11-1.2v-8.2z"
      fill="#FFFFFF"
      stroke="#991B1B"
      strokeWidth="1.2"
    />
    <line x1="32" y1="32.5" x2="32" y2="40.5" stroke="#C8102E" strokeWidth="1.2" />

    {/* Bold UE Monogram Ribbon & 1946 Founding Banner */}
    <rect x="21" y="42.5" width="22" height="7.5" rx="3.5" fill="#FACC15" stroke="#7F1D1D" strokeWidth="1" />
    <text
      x="32"
      y="48"
      textAnchor="middle"
      fill="#7F1D1D"
      fontSize="6.5"
      fontWeight="900"
      fontFamily="sans-serif"
      letterSpacing="0.6"
    >
      UE 1946
    </text>
  </svg>
);

interface StartingLoginPageProps {
  defaultUsername: string;
  defaultBlockSection: string;
  onLoginEnter: (username: string, blockSection: string, password: string) => void | Promise<void>;
  onRegisterEnter: (username: string, blockSection: string, password: string, confirmPassword?: string) => void | Promise<void>;
}

export const StartingLoginPage: React.FC<StartingLoginPageProps> = ({
  defaultUsername,
  defaultBlockSection,
  onLoginEnter,
  onRegisterEnter,
}) => {
  const [username, setUsername] = useState<string>(defaultUsername || 'Honchkrow93');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Continuous circular preview phase in [0, GAME_PREVIEWS.length)
  const [orbitPhase, setOrbitPhase] = useState<number>(0);

  const phaseRef = useRef<number>(0);
  const targetIndexRef = useRef<number | null>(null);
  const pauseUntilRef = useRef<number>(0);

  // Smooth automatic circular animation loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    const total = GAME_PREVIEWS.length;
    // Balanced speed: noticeable continuous movement without frame jumps.
    const orbitSpeed = 0.12;
    const selectedCardSpeed = 10;

    const tick = (now: number) => {
      const dt = Math.min(0.06, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      if (targetIndexRef.current !== null) {
        // Smoothly glide selected card into the center (offset = 0) when clicked
        const target = targetIndexRef.current;
        let diff = target - phaseRef.current;
        if (diff > total / 2) diff -= total;
        if (diff < -total / 2) diff += total;

        if (Math.abs(diff) < 0.008) {
          phaseRef.current = ((target % total) + total) % total;
          targetIndexRef.current = null;
        } else {
          const step = diff * (1 - Math.exp(-selectedCardSpeed * dt));
          phaseRef.current = (((phaseRef.current + step) % total) + total) % total;
        }
      } else if (now >= pauseUntilRef.current) {
        // Continuous circular movement (cards move top -> middle -> bottom)
        phaseRef.current = (((phaseRef.current - dt * orbitSpeed) % total) + total) % total;
      }

      setOrbitPhase(phaseRef.current);

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const resolvedBlockSection = defaultBlockSection || 'BSCS-3A';

  const handleEnterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().replace(/^@/, '') || defaultUsername || 'Honchkrow93';
    if (isRegisterMode) {
      if (password.length < 8) {
        setStatusBanner('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setStatusBanner('Passwords do not match.');
        return;
      }
      void onRegisterEnter(cleanUser, resolvedBlockSection, password, confirmPassword);
    } else {
      void onLoginEnter(cleanUser, resolvedBlockSection, password);
    }
  };

  const handleRegisterClick = () => {
    if (!isRegisterMode) {
      setIsRegisterMode(true);
      setStatusBanner(
        'Registration mode enabled: verify your username and password, then press REGISTER or ENTER.'
      );
      return;
    }
    const cleanUser = username.trim().replace(/^@/, '') || defaultUsername || 'Honchkrow93';
    if (password.length < 8) {
      setStatusBanner('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setStatusBanner('Passwords do not match.');
      return;
    }
    void onRegisterEnter(cleanUser, resolvedBlockSection, password, confirmPassword);
  };

  const handlePressPreviewCard = (index: number) => {
    // Pressing any preview card smoothly moves it into the middle and maximizes it
    targetIndexRef.current = index;
    pauseUntilRef.current = performance.now() + 2500;
  };

  return (
    <div
      data-testid="starting-login-page"
      className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto lg:overflow-hidden bg-slate-950/35"
    >
      {/* Subtle atmospheric vignette for legible contrast against the 3D background */}
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-r from-slate-950/65 via-slate-900/20 to-slate-950/60"
        aria-hidden="true"
      />

      {/* =====================================================================
          CENTER-BALANCED MAIN CONTAINER
          Login Section sits slightly toward the middle-left;
          Sliding Circular Previews are shifted to the right
         ===================================================================== */}
      <div className="relative z-20 w-full max-w-[1400px] mx-auto h-full grid grid-cols-1 lg:grid-cols-2 items-center gap-6 lg:gap-6 px-5 sm:px-10 lg:px-14 xl:px-16 py-6">
        {/* ===================================================================
            LEFT / CENTER-LEFT COLUMN: HCI-OPTIMIZED LOGIN & REGISTRATION CARD
           =================================================================== */}
        <section
          data-testid="starting-login-card"
          aria-label="Scholar Login and Registration"
          className="relative z-20 justify-self-start w-full max-w-[460px] lg:w-[460px] xl:w-[475px] rounded-[28px] bg-white/95 text-slate-900 border border-slate-200/90 shadow-[0_24px_64px_rgba(15,23,42,0.5)] p-6 sm:p-8 flex flex-col gap-4 shrink-0 lg:-translate-x-8 xl:-translate-x-12"
        >
          {/* Brand Logo Lockup */}
          <div className="flex flex-col items-center text-center pb-4 border-b border-slate-200/80">
            <img
              src={`${import.meta.env.BASE_URL}assets/aistudio/image_d8bbdfa5.png`}
              alt="EduQuests"
              className="h-20 sm:h-22 w-auto object-contain drop-shadow-[0_6px_14px_rgba(15,23,42,0.22)] select-none"
            />
            <p className="mt-2 text-xs sm:text-sm font-medium text-slate-600">
              Sign in to enter the 3D Scholar Lobby &amp; Quiz Arena
            </p>
          </div>

          {/* Credentials Form */}
          <form
            onSubmit={handleEnterSubmit}
            className="rounded-2xl bg-slate-100/90 border border-slate-200/90 p-5 sm:p-6 flex flex-col gap-4"
          >
            {/* Clean Form Mode Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
              <h1 className="font-display font-black text-base sm:text-lg tracking-wide uppercase text-slate-900">
                {isRegisterMode ? 'Create Account' : 'Login'}
              </h1>
              {isRegisterMode && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setStatusBanner(null);
                  }}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-600 underline-offset-2 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
              )}
            </div>

            {/* USERNAME FIELD */}
            <div>
              <label
                htmlFor="starting-username-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Username
              </label>
              <input
                id="starting-username-input"
                data-testid="starting-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your scholar username"
                className="w-full h-12 px-4 bg-white text-slate-900 font-medium text-[15px] rounded-xl border border-slate-300/90 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30 transition-all"
              />
            </div>

            {/* PASSWORD FIELD */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="starting-password-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
              </div>
              <input
                id="starting-password-input"
                data-testid="starting-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-12 px-4 bg-white text-slate-900 font-medium text-[15px] rounded-xl border border-slate-300/90 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30 transition-all"
              />
            </div>

            {isRegisterMode && (
              <div>
                <label
                  htmlFor="starting-confirm-password-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                >
                  Re-enter Password
                </label>
                <input
                  id="starting-confirm-password-input"
                  data-testid="starting-confirm-password-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  className="w-full h-12 px-4 bg-white text-slate-900 font-medium text-[15px] rounded-xl border border-slate-300/90 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30 transition-all"
                />
              </div>
            )}

            {/* Status or Forgot Password feedback banner */}
            {statusBanner && (
              <div
                data-testid="starting-status-banner"
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-yellow-300 border border-slate-800 text-xs font-medium flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>{statusBanner}</span>
              </div>
            )}

            {/* Primary & Secondary Action Buttons */}
            <div className="grid grid-cols-12 gap-4 pt-0">
              <button
                type="button"
                data-testid="starting-register-btn"
                onClick={handleRegisterClick}
                className="col-span-5 h-12 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-yellow-300 font-display font-bold text-xs sm:text-sm uppercase tracking-wider border border-slate-800 shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>REGISTER</span>
              </button>

              <button
                type="submit"
                data-testid="starting-enter-btn"
                data-start="true"
                className="col-span-7 h-12 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-black text-sm sm:text-base uppercase tracking-wider border border-amber-500/80 shadow-[0_6px_18px_rgba(245,158,11,0.38)] hover:shadow-[0_10px_24px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>ENTER</span>
                <ChevronRight className="w-5 h-5 stroke-[2.5] shrink-0" />
              </button>
            </div>
          </form>

        </section>

        {/* ===================================================================
            RIGHT COLUMN: AUTOMATIC SLOW-MOTION CIRCULAR GAME PREVIEW
            - Shifted to the right side of the viewport
            - Back-returning cards are hidden so no card is shown going up/down at the back
            - Same padding hover effect as the Profile section (warm amber/yellow gradient, golden border & ring glow)
           =================================================================== */}
        <section
          data-testid="circular-game-preview"
          aria-label="Game Preview Carousel"
          className="relative z-20 w-full h-[640px] lg:h-full flex items-center justify-end select-none overflow-visible lg:pr-0 xl:pr-0"
        >
          <div className="relative w-full max-w-[680px] h-full flex items-center justify-end lg:translate-x-6 xl:translate-x-10">
            {GAME_PREVIEWS.map((item, index) => {
              const orbit = computeCircularPreviewOrbit(index, GAME_PREVIEWS.length, orbitPhase);
              const { isMiddleMaximized, isVisible } = orbit;

              return (
                <div
                  key={item.id}
                  data-testid={`preview-card-${item.id}`}
                  data-maximized={isMiddleMaximized ? 'true' : 'false'}
                  onClick={() => handlePressPreviewCard(index)}
                  style={{
                    transform: `translate3d(${orbit.x}px, ${orbit.y}px, 0px) scale(${orbit.scale})`,
                    zIndex: orbit.zIndex,
                    opacity: orbit.opacity,
                    visibility: isVisible ? 'visible' : 'hidden',
                    pointerEvents: isVisible ? 'auto' : 'none',
                  }}
                  title={`Click anywhere on this card to maximize ${item.title}`}
                  className={`group/preview absolute w-[330px] sm:w-[500px] lg:w-[620px] xl:w-[680px] h-[220px] sm:h-[295px] lg:h-[360px] xl:h-[390px] rounded-3xl bg-white/95 hover:bg-gradient-to-br hover:from-amber-50/95 hover:via-white hover:to-yellow-50/90 text-slate-900 p-4 border-2 cursor-pointer overflow-hidden will-change-transform transition-[border-color,box-shadow,background-color] duration-300 ${
                    isMiddleMaximized
                      ? 'border-yellow-400 ring-4 ring-yellow-400/30 shadow-[0_24px_65px_rgba(0,0,0,0.6)] hover:shadow-[0_24px_68px_rgba(250,204,21,0.45)]'
                      : 'border-slate-200/90 hover:border-yellow-400 hover:ring-4 hover:ring-yellow-400/25 shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_20px_48px_rgba(250,204,21,0.38)]'
                  }`}
                >
                  {/* Card Top Header in Padding Area (Matches Profile Section Hover Highlight) */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 px-1">
                    <span className="text-[11px] font-mono font-bold text-amber-700 group-hover/preview:text-amber-600 uppercase tracking-wider truncate transition-colors">
                      {isMiddleMaximized ? item.badge : 'PREVIEW OF THE GAME'}
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 group-hover/preview:text-slate-900 transition-colors">
                      {item.modeTag}
                    </span>
                  </div>

                  {/* Inner Framed Game Screenshot */}
                  <div className="relative w-full h-[calc(100%-30px)] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 group-hover/preview:border-yellow-400/70 transition-colors">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover object-center group-hover/preview:scale-105 transition-transform duration-500"
                    />

                    {/* Measured gradient scrim for text legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />

                    {/* Bottom Info Overlay */}
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <div
                        className={`font-display font-black tracking-tight drop-shadow transition-colors ${
                          isMiddleMaximized
                            ? 'text-base sm:text-xl text-yellow-300 group-hover/preview:text-yellow-200'
                            : 'text-sm sm:text-base text-white group-hover/preview:text-yellow-300'
                        }`}
                      >
                        {item.title}
                      </div>
                      {isMiddleMaximized ? (
                        <p className="text-xs sm:text-sm text-slate-100/95 line-clamp-2 mt-1 leading-snug">
                          {item.description}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-200 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
