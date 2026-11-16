/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sparkles, User, Shirt, Palette, Check } from 'lucide-react';
import { HEROES, HeroId } from '../game/rules';

interface CharacterCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHero: HeroId;
  onSelectHero: (heroId: HeroId) => void;
  gender: 'male' | 'female' | 'neutral';
  onChangeGender: (gender: 'male' | 'female' | 'neutral') => void;
  outfitStyle: string;
  onChangeOutfitStyle: (style: string) => void;
  accentColor: string;
  onChangeAccentColor: (color: string) => void;
}

export const CharacterCustomizerModal: React.FC<CharacterCustomizerModalProps> = ({
  isOpen,
  onClose,
  selectedHero,
  onSelectHero,
  gender,
  onChangeGender,
  outfitStyle,
  onChangeOutfitStyle,
  accentColor,
  onChangeAccentColor,
}) => {
  if (!isOpen) return null;

  const outfits = [
    { id: 'instinct', name: 'Team Instinct (Yellow Sporty Jacket)', color: 'from-amber-400 to-amber-600' },
    { id: 'mystic', name: 'Team Mystic (Blue Long Coat)', color: 'from-blue-500 to-indigo-600' },
    { id: 'valor', name: 'Team Valor (White & Red Trench)', color: 'from-rose-500 to-red-600' },
    { id: 'cozy', name: 'Cozy Knit Turtleneck (Study Room)', color: 'from-amber-700 to-yellow-800' },
    { id: 'shinobi', name: 'Cyber Shinobi Tactical Gi', color: 'from-slate-700 to-slate-900' },
  ];

  const accents = [
    { id: 'cyan', hex: '#06b6d4', name: 'Cyan Glow' },
    { id: 'amber', hex: '#f59e0b', name: 'Instinct Yellow' },
    { id: 'emerald', hex: '#10b981', name: 'Emerald Forest' },
    { id: 'rose', hex: '#f43f5e', name: 'Valor Rose' },
    { id: 'violet', hex: '#8b5cf6', name: 'Mystic Violet' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customizer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[min(88dvh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white/95 text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-md">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 bg-[oklch(0.21_0.04_265.75/_1)] px-4 py-3.5 text-white sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 id="customizer-title" className="text-sm font-display font-black tracking-wide text-white sm:text-base">
                CHARACTER CUSTOMIZER
              </h2>
              <p className="text-[10px] text-slate-300 sm:text-[11px]">
                Personalize your avatar, outfit, and combat guardian.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customizer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Inner Drawer Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 drawer-scroll sm:p-5">
          {/* 1. Sex / Body Type Selection */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-display font-extrabold text-amber-700">
              <User className="h-3.5 w-3.5" />
              <span>BODY TYPE / SEX PRESET</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'male', label: 'Male' },
                { id: 'female', label: 'Female' },
                { id: 'neutral', label: 'Neutral / Co-ed' },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={gender === g.id}
                  onClick={() => onChangeGender(g.id as 'male' | 'female' | 'neutral')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-display font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    gender === g.id
                      ? 'bg-amber-50 border-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {gender === g.id && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  <span>{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Guardian / Hero Class */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-display font-extrabold text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>COMBAT GUARDIAN & COMPANION</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HEROES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  aria-pressed={selectedHero === h.id}
                  onClick={() => onSelectHero(h.id)}
                  className={`rounded-xl border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    selectedHero === h.id
                      ? 'bg-amber-50 border-amber-500 text-slate-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-display font-black truncate">{h.name}</div>
                  <div className="text-[10px] font-mono-num text-amber-700 font-bold mt-0.5">CP {h.cp}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Outfit / Clothes Style */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-display font-extrabold text-amber-700">
              <Shirt className="h-3.5 w-3.5" />
              <span>OUTFIT & CLOTHES STYLE</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {outfits.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={outfitStyle === o.id}
                  onClick={() => onChangeOutfitStyle(o.id)}
                  className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    outfitStyle === o.id
                      ? 'bg-amber-50 border-amber-500 text-slate-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-5 w-5 shrink-0 rounded-md border border-slate-300 bg-gradient-to-br ${o.color}`} />
                    <span className="text-[11px] font-display font-bold">{o.name}</span>
                  </div>
                  {outfitStyle === o.id && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Accent Color Glow */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-display font-extrabold text-amber-700">
              <Palette className="h-3.5 w-3.5" />
              <span>ENERGY ACCENT COLOR</span>
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {accents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onChangeAccentColor(a.id)}
                  aria-label={a.name}
                  aria-pressed={accentColor === a.id}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    accentColor === a.id ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: a.hex }}
                >
                  {accentColor === a.id && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 px-4 py-2.5 text-xs font-display font-black text-slate-950 shadow-sm transition-all hover:from-yellow-200 hover:to-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            Save & Apply Customization
          </button>
        </div>
      </div>
    </div>
  );
};
