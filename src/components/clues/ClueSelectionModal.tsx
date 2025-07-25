import React, { useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Card } from '../common/Card';
import { useClueStore } from '../../stores/useClueStore';
import { useNarrativeStore } from '../../stores/useNarrativeStore';
import type { Clue } from '../../types/clue';

interface ClueSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClue: (clue: Clue) => void;
  arcId?: string;
  title?: string;
}

export const ClueSelectionModal: React.FC<ClueSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectClue,
  arcId,
  title = 'Select a Clue'
}) => {
  const { getCluesByArc, clues } = useClueStore();
  const { arcs } = useNarrativeStore();

  // Get clues for the specific arc, or all clues if no arc specified
  const availableClues = useMemo(() => {
    if (arcId) {
      return getCluesByArc(arcId);
    }
    return clues;
  }, [arcId, getCluesByArc, clues]);

  const arcName = useMemo(() => {
    if (arcId) {
      return arcs.find(arc => arc.id === arcId)?.name || 'Unknown Arc';
    }
    return null;
  }, [arcId, arcs]);

  const getCategoryBadge = (category: Clue['category']) => {
    const styles = {
      evidence: 'badge-primary',
      testimony: 'badge-secondary',
      theory: 'badge-accent',
      fact: 'badge-success',
      lead: 'badge-info',
      red_herring: 'badge-error'
    };
    return `badge ${styles[category]} badge-sm`;
  };

  const getImportanceBadge = (importance: Clue['importance']) => {
    const styles = {
      critical: 'badge-error',
      major: 'badge-warning',
      minor: 'badge-info',
      trivial: 'badge-ghost'
    };
    return `badge ${styles[importance]} badge-sm`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <div className="space-y-4">
        {/* Header Info */}
        {arcName && (
          <div className="bg-base-200 p-3 rounded-lg">
            <p className="text-sm text-base-content/70">
              📖 Showing clues for story arc: <span className="font-semibold">{arcName}</span>
            </p>
          </div>
        )}

        {/* Empty State */}
        {availableClues.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">No Clues Available</h3>
            <p className="text-base-content/70 mb-4">
              {arcId 
                ? `No clues have been assigned to the "${arcName}" story arc yet.`
                : 'No clues have been created yet.'
              }
            </p>
            <p className="text-sm text-base-content/60">
              Create clues in the Clue Manager and assign them to story arcs to use them in storylets.
            </p>
          </div>
        )}

        {/* Clue Grid */}
        {availableClues.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {availableClues.map((clue) => (
              <div 
                key={clue.id}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
                onClick={() => onSelectClue(clue)}
              >
                <Card className="border-2 border-transparent hover:border-primary/20">
                <div className="space-y-3">
                  {/* Clue Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {clue.icon ? (
                        <div className="text-2xl">{clue.icon}</div>
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: clue.color || '#10B981' }}
                        >
                          {clue.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate" title={clue.title}>
                          {clue.title}
                        </h3>
                        <p className="text-xs opacity-60">{clue.name}</p>
                      </div>
                    </div>
                    {clue.isDiscovered && (
                      <div className="badge badge-success badge-xs">Discovered</div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    <span className={getCategoryBadge(clue.category)}>
                      {clue.category}
                    </span>
                    <span className={getImportanceBadge(clue.importance)}>
                      {clue.importance}
                    </span>
                    {clue.isMinigame && (
                      <span className="badge badge-accent badge-sm">
                        🎮 Minigame
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-base-content/70 line-clamp-2">
                    {clue.description || 'No description provided'}
                  </p>

                  {/* Quick Info */}
                  <div className="flex justify-between text-xs text-base-content/60">
                    <span>Weight: {clue.narrativeWeight}/10</span>
                    <span>Status: {clue.status}</span>
                  </div>

                  {/* Selection Hint */}
                  <div className="text-center pt-2 border-t border-base-300">
                    <p className="text-xs text-primary opacity-80">
                      Click to select this clue
                    </p>
                  </div>
                </div>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        {availableClues.length > 0 && (
          <div className="bg-info/10 border border-info/20 rounded-lg p-3">
            <p className="text-sm text-info">
              💡 <strong>Tip:</strong> Select a clue to create a choice that references it. 
              The clue will be available to players when they select this choice option.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button 
            onClick={onClose} 
            className="btn btn-ghost"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};