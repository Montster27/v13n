import React from 'react';
import type { MinigameConfig } from '../../types/clue';
import { Card } from '../common/Card';

interface MinigameIntroductionProps {
  config: MinigameConfig;
  onContinue: () => void;
  onSkip: () => void;
}

export const MinigameIntroduction: React.FC<MinigameIntroductionProps> = ({
  config,
  onContinue,
  onSkip
}) => {
  // Split introduction into paragraphs for better readability
  const paragraphs = config.introduction.split('\n').filter(p => p.trim());
  
  return (
    <div className="p-8 min-h-[500px] flex items-center justify-center">
      <Card className="max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">{config.title}</h3>
            <div className="text-sm opacity-60">
              {config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1)} Challenge
            </div>
          </div>

          {/* Introduction text */}
          <div className="prose prose-base max-w-none">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-base leading-relaxed mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Theme styling */}
          {config.theme && config.theme !== 'default' && (
            <div className="text-center">
              <div 
                className={`inline-block px-4 py-2 rounded-full text-xs font-semibold ${
                  config.theme === 'noir' ? 'bg-gray-800 text-white' :
                  config.theme === 'vintage' ? 'bg-amber-100 text-amber-800' :
                  config.theme === 'modern' ? 'bg-blue-100 text-blue-800' :
                  config.theme === 'fantasy' ? 'bg-purple-100 text-purple-800' :
                  'bg-base-200 text-base-content'
                }`}
                style={{ 
                  backgroundColor: config.accentColor ? `${config.accentColor}20` : undefined,
                  color: config.accentColor || undefined
                }}
              >
                {config.theme.toUpperCase()} THEME
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4 justify-center pt-4">
            <button 
              onClick={onSkip}
              className="btn btn-ghost"
            >
              Skip to Game
            </button>
            <button 
              onClick={onContinue}
              className="btn btn-primary"
            >
              Continue
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};