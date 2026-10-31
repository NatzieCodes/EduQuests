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
      <div className="relative w-full max-w-xl rounded-3xl bg-white/95 text-slate-900 border border-slate-200/90 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-md overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="customizer-title" className="text-base sm:text-lg font-display font-black tracking-wide text-slate-900">
                CHARACTER CUSTOMIZER
              </h2>
              <p className="text-[11px] text-slate-600">
                Personalize your avatar sex, outfit style, and combat guardian.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customizer"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Inner Drawer Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto drawer-scroll">
          {/* 1. Sex / Body Type Selection */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-display font-extrabold text-amber-700 mb-2">
              <User className="w-4 h-4" />
              <span>BODY TYPE / SEX PRESET</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'male', label: 'Male' },
                { id: 'female', label: 'Female' },
                { id: 'neutral', label: 'Neutral / Co-ed' },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onChangeGender(g.id as any)}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-display font-bold flex items-center justify-center gap-1.5 transition-all ${
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
            <label className="flex items-center gap-1.5 text-xs font-display font-extrabold text-amber-700 mb-2">
              <Sparkles className="w-4 h-4" />
              <span>COMBAT GUARDIAN & COMPANION</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HEROES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onSelectHero(h.id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
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
            <label className="flex items-center gap-1.5 text-xs font-display font-extrabold text-amber-700 mb-2">
              <Shirt className="w-4 h-4" />
              <span>OUTFIT & CLOTHES STYLE</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {outfits.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onChangeOutfitStyle(o.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    outfitStyle === o.id
                      ? 'bg-amber-50 border-amber-500 text-slate-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${o.color} border border-slate-300`} />
                    <span className="text-xs font-display font-bold">{o.name}</span>
                  </div>
                  {outfitStyle === o.id && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Accent Color Glow */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-display font-extrabold text-amber-700 mb-2">
              <Palette className="w-4 h-4" />
              <span>ENERGY ACCENT COLOR</span>
            </label>
            <div className="flex items-center gap-3">
              {accents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onChangeAccentColor(a.id)}
                  aria-label={a.name}
                  className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
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
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 text-slate-950 font-display font-black text-xs transition-all shadow-sm"
          >
            Save & Apply Customization
          </button>
        </div>
      </div>
    </div>
  );
};
