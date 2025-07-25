import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../common/Card';
import { Input } from '../forms/Input';
import { TextArea } from '../forms/TextArea';
import { Select } from '../forms/Select';
import { Modal } from '../common/Modal';
import { LoadingButton } from '../common/LoadingSpinner';
import { useClueStore } from '../../stores/useClueStore';
import { useMinigameStore } from '../../stores/useMinigameStore';
import { useNarrativeStore } from '../../stores/useNarrativeStore';
import type { Clue, ClueFormData, MinigameConfig } from '../../types/clue';
import { MinigameContainer } from '../minigames/MinigameContainer';
import { createSampleMinigameClue } from '../../utils/createSampleMinigameClue';
import { MEMORY_CARD_GAME, NARRATIVE_WEIGHT } from '../../constants/game';
import { databaseHelpers } from '../../db/database';

interface ClueManagerProps {
  onEditClue?: (clueId: string) => void;
  onViewClueBoard?: () => void;
}

const initialClueForm: Omit<ClueFormData, 'id'> = {
  name: '',
  title: '',
  description: '',
  fullDescription: '',
  category: 'evidence',
  type: 'physical',
  importance: 'minor',
  investigationLevel: 'superficial',
  reliability: 'uncertain',
  status: 'active',
  tags: [],
  keywords: [],
  narrativeWeight: NARRATIVE_WEIGHT.DEFAULT,
  icon: '',
  color: '#10B981',
  prerequisites: [],
  requiredStorylets: [],
  requiredCharacterInteractions: [],
  unlocksStorylets: [],
  storyArc: undefined,
  isMinigame: false,
  minigameConfig: undefined,
};

export const ClueManager: React.FC<ClueManagerProps> = ({
  onEditClue,
  onViewClueBoard
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClue, setEditingClue] = useState<string | undefined>();
  const [formData, setFormData] = useState<Omit<ClueFormData, 'id'>>(initialClueForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterImportance, setFilterImportance] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDiscoveredOnly, setShowDiscoveredOnly] = useState(false);
  const [playingMinigame, setPlayingMinigame] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});

  const {
    clues,
    loading,
    error,
    loadClues,
    addClue,
    updateClue,
    deleteClue,
    searchClues,
    getCluesByCategory,
    getCluesByImportance,
    getDiscoveredClues,
    getUndiscoveredClues,
    analyzeClueReliability,
    findContradictingClues,
    getSupportingClues
  } = useClueStore();

  const { startMinigame } = useMinigameStore();
  const { arcs } = useNarrativeStore();


  // Load clues on mount
  useEffect(() => {
    loadClues();
  }, [loadClues]);

  // Filter clues
  const filteredClues = useMemo(() => {
    let filtered = clues;

    if (searchTerm) {
      filtered = searchClues(searchTerm);
    }

    if (showDiscoveredOnly) {
      filtered = filtered.filter(clue => clue.isDiscovered);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(clue => clue.category === filterCategory);
    }

    if (filterImportance !== 'all') {
      filtered = filtered.filter(clue => clue.importance === filterImportance);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(clue => clue.status === filterStatus);
    }

    return filtered;
  }, [clues, searchTerm, showDiscoveredOnly, filterCategory, filterImportance, filterStatus, searchClues]);

  // Clue statistics
  const clueStats = useMemo(() => {
    const discovered = getDiscoveredClues();
    const undiscovered = getUndiscoveredClues();
    
    return {
      total: clues.length,
      discovered: discovered.length,
      undiscovered: undiscovered.length,
      byCategory: {
        evidence: getCluesByCategory('evidence').length,
        testimony: getCluesByCategory('testimony').length,
        theory: getCluesByCategory('theory').length,
        fact: getCluesByCategory('fact').length,
        lead: getCluesByCategory('lead').length,
        red_herring: getCluesByCategory('red_herring').length,
      },
      byImportance: {
        critical: getCluesByImportance('critical').length,
        major: getCluesByImportance('major').length,
        minor: getCluesByImportance('minor').length,
        trivial: getCluesByImportance('trivial').length,
      },
      byStatus: {
        active: clues.filter(c => c.status === 'active').length,
        resolved: clues.filter(c => c.status === 'resolved').length,
        abandoned: clues.filter(c => c.status === 'abandoned').length,
        red_herring: clues.filter(c => c.status === 'red_herring').length,
      }
    };
  }, [clues, getDiscoveredClues, getUndiscoveredClues, getCluesByCategory, getCluesByImportance]);

  const handleCreateClue = () => {
    setEditingClue(undefined);
    setFormData(initialClueForm);
    setIsModalOpen(true);
  };

  const handleEditClueForm = (clue: Clue) => {
    setEditingClue(clue.id);
    setFormData({
      name: clue.name,
      title: clue.title,
      description: clue.description,
      fullDescription: clue.fullDescription || '',
      category: clue.category,
      type: clue.type,
      importance: clue.importance,
      investigationLevel: clue.investigationLevel,
      reliability: clue.reliability,
      status: clue.status,
      tags: clue.tags,
      keywords: clue.keywords,
      narrativeWeight: clue.narrativeWeight,
      icon: clue.icon || '',
      color: clue.color || '#10B981',
      prerequisites: clue.prerequisites,
      requiredStorylets: clue.requiredStorylets,
      requiredCharacterInteractions: clue.requiredCharacterInteractions,
      unlocksStorylets: clue.unlocksStorylets,
      storyArc: clue.storyArc,
      isMinigame: clue.isMinigame,
      minigameConfig: clue.minigameConfig,
    });
    setIsModalOpen(true);
  };

  const handleSaveClue = async () => {
    if (!formData.name.trim() || !formData.title.trim()) return;

    setIsSaving(true);
    try {
      if (editingClue) {
        await updateClue(editingClue, formData);
      } else {
        await addClue(formData);
      }

      setIsModalOpen(false);
      setFormData(initialClueForm);
    } catch (error) {
      console.error('Failed to save clue:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClue = async (clue: Clue) => {
    if (!window.confirm(`Delete clue "${clue.title}"? This action cannot be undone.`)) {
      return;
    }

    const operationId = `delete-${clue.id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      await deleteClue(clue.id!);
    } catch (error) {
      console.error('Failed to delete clue:', error);
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  };

  const handlePlayMinigame = async (clue: Clue) => {
    if (!clue.minigameConfig) {
      console.error('No minigame config found for clue:', clue.id);
      return;
    }

    try {
      setPlayingMinigame(clue.id!);
      await startMinigame(clue.id!, clue.minigameConfig);
    } catch (error) {
      console.error('Failed to start minigame:', error);
      setPlayingMinigame(null);
    }
  };

  const handleCreateSampleMinigame = async () => {
    const operationId = 'create-sample';
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      await createSampleMinigameClue();
      // Sample minigame clue created
      // Reload clues to show the new one
      loadClues();
    } catch (error) {
      console.error('Failed to create sample minigame clue:', error);
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('This will completely reset the database and all data will be lost. Are you sure?')) {
      return;
    }
    
    try {
      const result = await databaseHelpers.resetDatabase();
      if (result.success) {
        // Database reset successful
        window.location.reload(); // Reload the page to reinitialize everything
      }
    } catch (error) {
      console.error('Failed to reset database:', error);
    }
  };

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

  const getReliabilityBadge = (reliability: Clue['reliability']) => {
    const styles = {
      confirmed: 'badge-success',
      likely: 'badge-info',
      uncertain: 'badge-warning',
      false: 'badge-error'
    };
    return `badge ${styles[reliability]} badge-sm`;
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clue Manager</h1>
          <p className="text-base-content/70">
            Organize evidence, testimonies, and investigation leads
          </p>
        </div>
        
        <div className="flex gap-2">
          {onViewClueBoard && (
            <button onClick={onViewClueBoard} className="btn btn-secondary">
              Clue Board
            </button>
          )}
          <button onClick={handleCreateClue} className="btn btn-primary">
            Add New Clue
          </button>
          <LoadingButton
            isLoading={operationLoading['create-sample']}
            loadingText="Creating..."
            onClick={handleCreateSampleMinigame}
            className="btn-success"
          >
            🎮 Add Sample Minigame
          </LoadingButton>
          {import.meta.env.DEV && (
            <button onClick={handleResetDatabase} className="btn btn-warning btn-sm">
              🗑️ Reset DB
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="stat">
            <div className="stat-title">Total Clues</div>
            <div className="stat-value text-primary">{clueStats.total}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="stat">
            <div className="stat-title">Discovered</div>
            <div className="stat-value text-success">{clueStats.discovered}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="stat">
            <div className="stat-title">Critical</div>
            <div className="stat-value text-error">{clueStats.byImportance.critical}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="stat">
            <div className="stat-title">Resolved</div>
            <div className="stat-value text-info">{clueStats.byStatus.resolved}</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            label="Search Clues"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, keywords, or tags..."
          />

          <Select
            label="Category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'evidence', label: 'Evidence' },
              { value: 'testimony', label: 'Testimony' },
              { value: 'theory', label: 'Theory' },
              { value: 'fact', label: 'Fact' },
              { value: 'lead', label: 'Lead' },
              { value: 'red_herring', label: 'Red Herring' }
            ]}
          />

          <Select
            label="Importance"
            value={filterImportance}
            onChange={(e) => setFilterImportance(e.target.value)}
            options={[
              { value: 'all', label: 'All Levels' },
              { value: 'critical', label: 'Critical' },
              { value: 'major', label: 'Major' },
              { value: 'minor', label: 'Minor' },
              { value: 'trivial', label: 'Trivial' }
            ]}
          />

          <Select
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'abandoned', label: 'Abandoned' },
              { value: 'red_herring', label: 'Red Herring' }
            ]}
          />

          <div className="flex items-center gap-2">
            <label className="label cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={showDiscoveredOnly}
                onChange={(e) => setShowDiscoveredOnly(e.target.checked)}
              />
              <span className="label-text ml-2">Discovered Only</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Clue List */}
      {filteredClues.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-base-content/70 text-lg mb-4">
            {clues.length === 0 ? 'No clues created yet' : 'No clues match your filters'}
          </p>
          <button onClick={handleCreateClue} className="btn btn-primary">
            Add Your First Clue
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClues.map((clue) => {
            const reliabilityAnalysis = analyzeClueReliability(clue.id!);
            const contradictingClues = findContradictingClues(clue.id!);
            const supportingClues = getSupportingClues(clue.id!);
            
            return (
              <Card key={clue.id} className="hover:shadow-lg transition-shadow duration-200">
                <div className="space-y-4">
                  {/* Clue Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {clue.icon ? (
                        <div className="text-2xl">{clue.icon}</div>
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: clue.color || '#10B981' }}
                        >
                          {clue.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate" title={clue.title}>
                          {clue.title}
                        </h3>
                        <p className="text-sm opacity-60">{clue.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {clue.isDiscovered && (
                        <div className="badge badge-success badge-xs">Discovered</div>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    <span className={getCategoryBadge(clue.category)}>
                      {clue.category}
                    </span>
                    <span className={getImportanceBadge(clue.importance)}>
                      {clue.importance}
                    </span>
                    <span className={getReliabilityBadge(clue.reliability)}>
                      {clue.reliability}
                    </span>
                    {clue.isMinigame && (
                      <span className="badge badge-accent badge-sm">
                        🎮 Minigame
                      </span>
                    )}
                    {clue.storyArc && (
                      <span className="badge badge-outline badge-sm">
                        📖 {arcs.find(arc => arc.id === clue.storyArc)?.name || 'Unknown Arc'}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-base-content/70 line-clamp-3">
                    {clue.description || 'No description provided'}
                  </p>

                  {/* Analysis */}
                  <div className="bg-base-200 p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-base-content/60">Reliability:</span>
                        <div className="font-semibold">{reliabilityAnalysis.score}%</div>
                      </div>
                      <div>
                        <span className="text-base-content/60">Evidence:</span>
                        <div className="font-semibold">{clue.evidence.length}</div>
                      </div>
                      <div>
                        <span className="text-base-content/60">Connections:</span>
                        <div className="font-semibold">{clue.connections.length}</div>
                      </div>
                      <div>
                        <span className="text-base-content/60">Weight:</span>
                        <div className="font-semibold">{clue.narrativeWeight}/10</div>
                      </div>
                    </div>
                  </div>

                  {/* Relations */}
                  {(supportingClues.length > 0 || contradictingClues.length > 0) && (
                    <div className="text-sm">
                      {supportingClues.length > 0 && (
                        <div className="mb-1">
                          <span className="text-success">Supporting:</span> {supportingClues.length}
                        </div>
                      )}
                      {contradictingClues.length > 0 && (
                        <div>
                          <span className="text-error">Contradicting:</span> {contradictingClues.length}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prerequisites */}
                  {clue.prerequisites.length > 0 && (
                    <div>
                      <span className="text-sm text-base-content/60">Prerequisites:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {clue.prerequisites.slice(0, 2).map(prereqId => {
                          const prereq = clues.find(c => c.id === prereqId);
                          return (
                            <span key={prereqId} className="badge badge-ghost badge-xs">
                              {prereq?.title || 'Unknown'}
                            </span>
                          );
                        })}
                        {clue.prerequisites.length > 2 && (
                          <span className="badge badge-ghost badge-xs">
                            +{clue.prerequisites.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  {clue.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {clue.keywords.slice(0, 3).map(keyword => (
                        <span key={keyword} className="badge badge-outline badge-xs">
                          {keyword}
                        </span>
                      ))}
                      {clue.keywords.length > 3 && (
                        <span className="badge badge-outline badge-xs">
                          +{clue.keywords.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-2 border-t border-base-300">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditClueForm(clue)}
                        className="btn btn-ghost btn-sm"
                      >
                        Edit
                      </button>
                      {clue.isMinigame && (
                        <button
                          onClick={() => handlePlayMinigame(clue)}
                          className="btn btn-primary btn-sm"
                        >
                          🎮 Play
                        </button>
                      )}
                      {onEditClue && (
                        <button 
                          onClick={() => onEditClue(clue.id!)}
                          className="btn btn-secondary btn-sm"
                        >
                          Investigate
                        </button>
                      )}
                    </div>
                    <LoadingButton
                      isLoading={operationLoading[`delete-${clue.id}`]}
                      loadingText="Deleting..."
                      onClick={() => handleDeleteClue(clue)}
                      className="btn-error btn-sm btn-outline"
                      size="sm"
                    >
                      Delete
                    </LoadingButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Clue Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClue ? 'Edit Clue' : 'Create New Clue'}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto max-w-5xl">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Clue Name (ID)"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="evidence_murder_weapon"
              required
            />

            <Input
              label="Display Title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Murder Weapon"
              required
            />
          </div>

          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the clue"
            rows={3}
            required
          />

          <TextArea
            label="Full Description (Optional)"
            value={formData.fullDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, fullDescription: e.target.value }))}
            placeholder="Detailed analysis and investigation notes"
            rows={4}
          />

          {/* Classification */}
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ClueFormData['category'] }))}
              options={[
                { value: 'evidence', label: 'Physical Evidence' },
                { value: 'testimony', label: 'Testimony' },
                { value: 'theory', label: 'Theory' },
                { value: 'fact', label: 'Established Fact' },
                { value: 'lead', label: 'Lead' },
                { value: 'red_herring', label: 'Red Herring' }
              ]}
            />

            <Select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ClueFormData['type'] }))}
              options={[
                { value: 'physical', label: 'Physical' },
                { value: 'digital', label: 'Digital' },
                { value: 'social', label: 'Social' },
                { value: 'logical', label: 'Logical' },
                { value: 'temporal', label: 'Temporal' }
              ]}
            />

            <Select
              label="Story Arc"
              value={formData.storyArc || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, storyArc: e.target.value || undefined }))}
              options={[
                { value: '', label: 'No Arc' },
                ...arcs.map(arc => ({ value: arc.id, label: arc.name }))
              ]}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Importance"
              value={formData.importance}
              onChange={(e) => setFormData(prev => ({ ...prev, importance: e.target.value as ClueFormData['importance'] }))}
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'major', label: 'Major' },
                { value: 'minor', label: 'Minor' },
                { value: 'trivial', label: 'Trivial' }
              ]}
            />

            <Select
              label="Reliability"
              value={formData.reliability}
              onChange={(e) => setFormData(prev => ({ ...prev, reliability: e.target.value as ClueFormData['reliability'] }))}
              options={[
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'likely', label: 'Likely' },
                { value: 'uncertain', label: 'Uncertain' },
                { value: 'false', label: 'False' }
              ]}
            />

            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ClueFormData['status'] }))}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'abandoned', label: 'Abandoned' },
                { value: 'red_herring', label: 'Red Herring' }
              ]}
            />
          </div>

          {/* Visual Properties */}
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Icon (Emoji)"
              value={formData.icon}
              onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              placeholder="🔍"
            />

            <div>
              <label className="label">
                <span className="label-text">Color</span>
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="input input-bordered w-full h-12"
              />
            </div>

            <Input
              type="number"
              label="Narrative Weight (1-10)"
              value={formData.narrativeWeight.toString()}
              onChange={(e) => setFormData(prev => ({ ...prev, narrativeWeight: parseInt(e.target.value) || NARRATIVE_WEIGHT.DEFAULT }))}
              min={NARRATIVE_WEIGHT.MIN.toString()}
              max={NARRATIVE_WEIGHT.MAX.toString()}
            />
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tags (comma-separated)"
              value={formData.tags.join(', ')}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
              }))}
              placeholder="murder, weapon, evidence"
            />

            <Input
              label="Keywords (comma-separated)"
              value={formData.keywords.join(', ')}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) 
              }))}
              placeholder="knife, blood, fingerprints"
            />
          </div>

          {/* Minigame Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={formData.isMinigame}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  isMinigame: e.target.checked,
                  minigameConfig: e.target.checked ? {
                    id: `minigame_${prev.name || 'unnamed'}`,
                    type: 'memory_cards',
                    title: prev.title || 'Minigame Challenge',
                    introduction: '',
                    instructions: 'Complete the challenge to proceed.',
                    difficulty: 'medium',
                    successStoryletId: '',
                    failureStoryletId: '',
                    gameSettings: {
                      cardCount: MEMORY_CARD_GAME.DEFAULT_CARD_PAIRS,
                      cardSetId: 'retro-80s',
                      flipTime: MEMORY_CARD_GAME.DEFAULT_FLIP_TIME
                    }
                  } : undefined
                }))}
              />
              <label className="label-text font-semibold">🎮 Enable Minigame</label>
            </div>
            
            {formData.isMinigame && formData.minigameConfig && (
              <div className="bg-base-200 p-4 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Minigame Type"
                    value={formData.minigameConfig.type}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      minigameConfig: prev.minigameConfig ? {
                        ...prev.minigameConfig,
                        type: e.target.value as MinigameConfig['type']
                      } : undefined
                    }))}
                    options={[
                      { value: 'memory_cards', label: 'Memory Cards' },
                      { value: 'logic_puzzle', label: 'Logic Puzzle' },
                      { value: 'sequence_match', label: 'Sequence Match' },
                      { value: 'word_puzzle', label: 'Word Puzzle' },
                      { value: 'reaction_time', label: 'Reaction Time' },
                      { value: 'pattern_recognition', label: 'Pattern Recognition' }
                    ]}
                  />
                  
                  <Select
                    label="Difficulty"
                    value={formData.minigameConfig.difficulty}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      minigameConfig: prev.minigameConfig ? {
                        ...prev.minigameConfig,
                        difficulty: e.target.value as MinigameConfig['difficulty']
                      } : undefined
                    }))}
                    options={[
                      { value: 'easy', label: 'Easy' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'hard', label: 'Hard' },
                      { value: 'expert', label: 'Expert' }
                    ]}
                  />
                </div>

                <TextArea
                  label="Introduction (Scene Setting)"
                  value={formData.minigameConfig.introduction}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    minigameConfig: prev.minigameConfig ? {
                      ...prev.minigameConfig,
                      introduction: e.target.value
                    } : undefined
                  }))}
                  placeholder="Set the scene before the minigame begins..."
                  rows={3}
                />

                <TextArea
                  label="Instructions"
                  value={formData.minigameConfig.instructions}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    minigameConfig: prev.minigameConfig ? {
                      ...prev.minigameConfig,
                      instructions: e.target.value
                    } : undefined
                  }))}
                  placeholder="How to play the minigame..."
                  rows={2}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Success Storylet ID"
                    value={formData.minigameConfig.successStoryletId}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      minigameConfig: prev.minigameConfig ? {
                        ...prev.minigameConfig,
                        successStoryletId: e.target.value
                      } : undefined
                    }))}
                    placeholder="storylet_success"
                  />

                  <Input
                    label="Failure Storylet ID"
                    value={formData.minigameConfig.failureStoryletId}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      minigameConfig: prev.minigameConfig ? {
                        ...prev.minigameConfig,
                        failureStoryletId: e.target.value
                      } : undefined
                    }))}
                    placeholder="storylet_failure"
                  />
                </div>

                {formData.minigameConfig.type === 'memory_cards' && (
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      type="number"
                      label="Card Pairs"
                      value={formData.minigameConfig.gameSettings.cardCount?.toString() || MEMORY_CARD_GAME.DEFAULT_CARD_PAIRS.toString()}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        minigameConfig: prev.minigameConfig ? {
                          ...prev.minigameConfig,
                          gameSettings: {
                            ...prev.minigameConfig.gameSettings,
                            cardCount: parseInt(e.target.value) || MEMORY_CARD_GAME.DEFAULT_CARD_PAIRS
                          }
                        } : undefined
                      }))}
                      min={MEMORY_CARD_GAME.MIN_CARD_PAIRS.toString()}
                      max={MEMORY_CARD_GAME.MAX_CARD_PAIRS.toString()}
                    />

                    <Select
                      label="Card Set"
                      value={formData.minigameConfig.gameSettings.cardSetId || 'retro-80s'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        minigameConfig: prev.minigameConfig ? {
                          ...prev.minigameConfig,
                          gameSettings: {
                            ...prev.minigameConfig.gameSettings,
                            cardSetId: e.target.value
                          }
                        } : undefined
                      }))}
                      options={[
                        { value: 'retro-80s', label: '80s Nostalgia' }
                      ]}
                    />

                    <Input
                      type="number"
                      label="Flip Time (ms)"
                      value={formData.minigameConfig.gameSettings.flipTime?.toString() || MEMORY_CARD_GAME.DEFAULT_FLIP_TIME.toString()}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        minigameConfig: prev.minigameConfig ? {
                          ...prev.minigameConfig,
                          gameSettings: {
                            ...prev.minigameConfig.gameSettings,
                            flipTime: parseInt(e.target.value) || MEMORY_CARD_GAME.DEFAULT_FLIP_TIME
                          }
                        } : undefined
                      }))}
                      min={MEMORY_CARD_GAME.MIN_FLIP_TIME.toString()}
                      max={MEMORY_CARD_GAME.MAX_FLIP_TIME.toString()}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="btn btn-ghost"
              disabled={isSaving}
            >
              Cancel
            </button>
            <LoadingButton
              isLoading={isSaving}
              loadingText={editingClue ? 'Updating...' : 'Creating...'}
              onClick={handleSaveClue}
              disabled={!formData.name.trim() || !formData.title.trim()}
              className="btn-primary"
            >
              {editingClue ? 'Update Clue' : 'Create Clue'}
            </LoadingButton>
          </div>
        </div>
      </Modal>
      
      {/* Minigame Container */}
      {playingMinigame && (
        <MinigameContainer
          clueId={playingMinigame}
          onComplete={() => setPlayingMinigame(null)}
          onExit={() => setPlayingMinigame(null)}
        />
      )}
    </div>
  );
};