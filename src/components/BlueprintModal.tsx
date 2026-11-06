import React, { useState } from 'react';
import {
  BIOME_BLUEPRINTS,
  BiomeId,
  LEVELS_500,
  PHILOSOPHICAL_ENDING_QUOTE,
  TOTAL_LEVELS,
  currentSpireSeed,
} from '../game/levels';

interface BlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPracticeStep: (stepNumber: number) => void;
  onRerollSeed: () => void;
  currentStep: number;
  peakStep: number;
}

export const BlueprintModal: React.FC<BlueprintModalProps> = ({
  isOpen,
  onClose,
  onSelectPracticeStep,
  onRerollSeed,
  currentStep,
  peakStep,
}) => {
  const [selectedBiome, setSelectedBiome] = useState<BiomeId>(1);

  if (!isOpen) return null;

  const filteredLevels = LEVELS_500.filter((l) => l.biome === selectedBiome);
  const activeBiomeMeta =
    BIOME_BLUEPRINTS.find((b) => b.biome === selectedBiome) ||
    BIOME_BLUEPRINTS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="500-Level World Atlas and Biome Blueprint"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-auto"
      style={{ backgroundColor: 'rgba(15, 23, 30, 0.85)' }}
    >
      <div className="voxel-panel w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#0f766e] text-amber-50 border-b-[3px] border-[#18181b]">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black tracking-tight">
              500-Monolith Procedural Spire Atlas (Seed #{currentSpireSeed})
            </h2>
            <p className="text-xs font-semibold text-teal-100 watch-hide">
              Non-Repeating Turn Angles, Variable Gaps, Sundial Turntables, Conveyors &amp; Decoy Traps
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRerollSeed}
              className="voxel-btn-yellow px-3 py-1.5 text-xs min-h-[40px] cursor-pointer whitespace-nowrap"
            >
              Mutate Spire Seed
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Atlas Modal"
              className="voxel-btn-neutral px-3 py-1.5 text-xs min-h-[40px] cursor-pointer whitespace-nowrap"
            >
              Close [Esc]
            </button>
          </div>
        </div>

        {/* Biome Selector Strip */}
        <div className="p-3 bg-stone-200 border-b-[3px] border-[#18181b] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {BIOME_BLUEPRINTS.map((b) => (
              <button
                key={b.biome}
                type="button"
                onClick={() => setSelectedBiome(b.biome)}
                className={`px-2.5 py-1.5 text-xs font-bold border-2 border-[#18181b] cursor-pointer transition-colors whitespace-nowrap ${
                  selectedBiome === b.biome
                    ? 'bg-[#d95829] text-white'
                    : 'bg-[#fffdf9] hover:bg-stone-100 text-zinc-800'
                }`}
              >
                Era {b.biome} ({(b.biome - 1) * 50 + 1}–{b.biome * 50})
              </button>
            ))}
          </div>

          <div className="text-xs font-mono-tabular font-bold text-zinc-800">
            Now: {currentStep}/{TOTAL_LEVELS} · Peak: {peakStep}/{TOTAL_LEVELS}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Biome Banner */}
          <div className="p-4 bg-[#fffdf9] border-[3px] border-[#18181b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono-tabular font-bold text-stone-600">
                <span
                  className="w-3 h-3 border border-[#18181b] inline-block"
                  style={{ backgroundColor: activeBiomeMeta.themeColor }}
                />
                <span>{activeBiomeMeta.range}</span>
                <span aria-hidden="true">·</span>
                <span>{activeBiomeMeta.subtitle}</span>
              </div>
              <h3 className="font-display text-lg font-black text-zinc-900">
                {activeBiomeMeta.name}
              </h3>
              <p className="text-xs text-stone-700 leading-relaxed max-w-2xl">
                {activeBiomeMeta.coreIrritationMechanic}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() =>
                  onSelectPracticeStep((selectedBiome - 1) * 50 + 1)
                }
                className="voxel-btn-yellow px-3 py-2 text-xs cursor-pointer whitespace-nowrap"
              >
                Inspect Step {(selectedBiome - 1) * 50 + 1}
              </button>
              <button
                type="button"
                onClick={() => onSelectPracticeStep(500)}
                className="voxel-btn-primary px-3 py-2 text-xs cursor-pointer whitespace-nowrap"
              >
                Preview Step 500 Climax
              </button>
            </div>
          </div>

          {/* 50 Levels of Selected Biome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredLevels.map((lvl) => (
              <div
                key={lvl.stepNumber}
                className="p-3 bg-[#fffdf9] border-2 border-[#18181b] flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono-tabular flex-wrap">
                    <span className="font-black text-zinc-900 bg-amber-300 px-1.5 py-0.5 border border-[#18181b]">
                      #{String(lvl.stepNumber).padStart(3, '0')}
                    </span>
                    <span className="font-bold text-zinc-900 truncate">
                      {lvl.title}
                    </span>
                    {lvl.decoyLedge && (
                      <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.5 border border-[#18181b]">
                        DECOY TRAP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-snug">
                    {lvl.psychologicalTrap}
                  </p>
                  <div className="text-[11px] font-mono-tabular text-stone-500">
                    Turn: {lvl.turnAngleDeg > 0 ? `+${lvl.turnAngleDeg}` : lvl.turnAngleDeg}° · Gap: {lvl.horizGap}m · Rise: +{lvl.vertRise}m · Tension: {lvl.chargeSpeedMultiplier}×
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectPracticeStep(lvl.stepNumber)}
                  aria-label={`Practice Step ${lvl.stepNumber}`}
                  className="voxel-btn-neutral px-2.5 py-1 text-xs font-mono-tabular shrink-0 cursor-pointer"
                >
                  Visit
                </button>
              </div>
            ))}
          </div>

          {/* Step 500 Philosophical Footer Note */}
          <div className="p-4 bg-[#1c1917] text-amber-50 border-[3px] border-[#18181b] text-center space-y-1">
            <div className="text-[11px] font-mono-tabular text-amber-400">
              MONOLITH 500 / 500 · THE FINAL VERDICT
            </div>
            <p className="font-display text-base font-bold">
              &ldquo;{PHILOSOPHICAL_ENDING_QUOTE}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
