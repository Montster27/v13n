import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../common/Card';
import { Input } from '../forms/Input';
import { TextArea } from '../forms/TextArea';
import { Select } from '../forms/Select';
import { Modal } from '../common/Modal';
import { useCharacterStore } from '../../stores/useCharacterStore';
import { useNarrativeStore } from '../../stores/useNarrativeStore';
import type { Character, CharacterFormData } from '../../types/character';

interface CharacterManagerProps {
  onEditCharacter?: (characterId: string) => void;
}

const initialCharacterForm: Omit<CharacterFormData, 'id'> = {
  name: '',
  displayName: '',
  description: '',
  biography: '',
  avatar: '',
  color: '#3B82F6',
  tags: [],
  category: 'supporting',
  importance: 'minor',
  status: 'active',
  availableInStorylets: [],
  unlockedBy: [],
};

export const CharacterManager: React.FC<CharacterManagerProps> = ({
  onEditCharacter
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<string | undefined>();
  const [formData, setFormData] = useState<Omit<CharacterFormData, 'id'>>(initialCharacterForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterImportance, setFilterImportance] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const {
    characters,
    loading,
    error,
    loadCharacters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    searchCharacters,
    getCharactersByCategory,
    getCharactersByImportance
  } = useCharacterStore();

  const { storylets } = useNarrativeStore();

  // Load characters on mount
  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  // Filter characters
  const filteredCharacters = useMemo(() => {
    let filtered = characters;

    if (searchTerm) {
      filtered = searchCharacters(searchTerm);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(char => char.category === filterCategory);
    }

    if (filterImportance !== 'all') {
      filtered = filtered.filter(char => char.importance === filterImportance);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(char => char.status === filterStatus);
    }

    return filtered;
  }, [characters, searchTerm, filterCategory, filterImportance, filterStatus, searchCharacters]);

  // Character statistics
  const characterStats = useMemo(() => {
    return {
      total: characters.length,
      byCategory: {
        main: getCharactersByCategory('main').length,
        supporting: getCharactersByCategory('supporting').length,
        background: getCharactersByCategory('background').length,
        antagonist: getCharactersByCategory('antagonist').length,
        ally: getCharactersByCategory('ally').length,
      },
      byImportance: {
        critical: getCharactersByImportance('critical').length,
        major: getCharactersByImportance('major').length,
        minor: getCharactersByImportance('minor').length,
      },
      byStatus: {
        active: characters.filter(c => c.status === 'active').length,
        deceased: characters.filter(c => c.status === 'deceased').length,
        missing: characters.filter(c => c.status === 'missing').length,
        hidden: characters.filter(c => c.status === 'hidden').length,
      }
    };
  }, [characters, getCharactersByCategory, getCharactersByImportance]);

  const handleCreateCharacter = () => {
    setEditingCharacter(undefined);
    setFormData(initialCharacterForm);
    setIsModalOpen(true);
  };

  const handleEditCharacterForm = (character: Character) => {
    setEditingCharacter(character.id);
    setFormData({
      name: character.name,
      displayName: character.displayName || '',
      description: character.description,
      biography: character.biography || '',
      avatar: character.avatar || '',
      color: character.color || '#3B82F6',
      tags: character.tags,
      category: character.category,
      importance: character.importance,
      status: character.status,
      availableInStorylets: character.availableInStorylets,
      unlockedBy: character.unlockedBy || [],
    });
    setIsModalOpen(true);
  };

  const handleSaveCharacter = async () => {
    if (!formData.name.trim()) return;

    try {
      if (editingCharacter) {
        await updateCharacter(editingCharacter, formData);
      } else {
        await addCharacter(formData);
      }

      setIsModalOpen(false);
      setFormData(initialCharacterForm);
    } catch (error) {
      console.error('Failed to save character:', error);
    }
  };

  const handleDeleteCharacter = async (character: Character) => {
    if (!window.confirm(`Delete character "${character.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCharacter(character.id!);
    } catch (error) {
      console.error('Failed to delete character:', error);
    }
  };

  const getCategoryBadge = (category: Character['category']) => {
    const styles = {
      main: 'badge-primary',
      supporting: 'badge-secondary',
      background: 'badge-accent',
      antagonist: 'badge-error',
      ally: 'badge-success'
    };
    return `badge ${styles[category]} badge-sm`;
  };

  const getImportanceBadge = (importance: Character['importance']) => {
    const styles = {
      critical: 'badge-error',
      major: 'badge-warning',
      minor: 'badge-info'
    };
    return `badge ${styles[importance]} badge-sm`;
  };

  const getStatusBadge = (status: Character['status']) => {
    const styles = {
      active: 'badge-success',
      deceased: 'badge-error',
      missing: 'badge-warning',
      hidden: 'badge-ghost'
    };
    return `badge ${styles[status]} badge-sm`;
  };

  const getStoryletName = (storyletId: string) => {
    const storylet = storylets.find(s => s.id === storyletId);
    return storylet?.title || 'Unknown Storylet';
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
          <h1 className="text-2xl font-bold">Character Manager</h1>
          <p className="text-base-content/70">
            Create and manage characters for your narrative
          </p>
        </div>
        
        <button onClick={handleCreateCharacter} className="btn btn-primary">
          Create New Character
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="stat">
            <div className="stat-title">Total Characters</div>
            <div className="stat-value text-primary">{characterStats.total}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="stat">
            <div className="stat-title">Main Characters</div>
            <div className="stat-value text-secondary">{characterStats.byCategory.main}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="stat">
            <div className="stat-title">Critical Importance</div>
            <div className="stat-value text-error">{characterStats.byImportance.critical}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="stat">
            <div className="stat-title">Active</div>
            <div className="stat-value text-success">{characterStats.byStatus.active}</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Search Characters"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, description, or tags..."
          />

          <Select
            label="Category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'main', label: 'Main' },
              { value: 'supporting', label: 'Supporting' },
              { value: 'background', label: 'Background' },
              { value: 'antagonist', label: 'Antagonist' },
              { value: 'ally', label: 'Ally' }
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
              { value: 'minor', label: 'Minor' }
            ]}
          />

          <Select
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'deceased', label: 'Deceased' },
              { value: 'missing', label: 'Missing' },
              { value: 'hidden', label: 'Hidden' }
            ]}
          />
        </div>
      </Card>

      {/* Character List */}
      {filteredCharacters.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-base-content/70 text-lg mb-4">
            {characters.length === 0 ? 'No characters created yet' : 'No characters match your filters'}
          </p>
          <button onClick={handleCreateCharacter} className="btn btn-primary">
            Create Your First Character
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCharacters.map((character) => (
            <Card key={character.id} className="hover:shadow-lg transition-shadow duration-200">
              <div className="space-y-4">
                {/* Character Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {character.avatar ? (
                      <img 
                        src={character.avatar} 
                        alt={character.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: character.color || '#3B82F6' }}
                      >
                        {character.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate" title={character.name}>
                        {character.displayName || character.name}
                      </h3>
                      {character.displayName && (
                        <p className="text-sm opacity-60">({character.name})</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1">
                  <span className={getCategoryBadge(character.category)}>
                    {character.category}
                  </span>
                  <span className={getImportanceBadge(character.importance)}>
                    {character.importance}
                  </span>
                  <span className={getStatusBadge(character.status)}>
                    {character.status}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-base-content/70 line-clamp-3">
                  {character.description || 'No description provided'}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-base-content/60">Attributes:</span>
                    <div className="font-semibold">{character.attributes.length}</div>
                  </div>
                  <div>
                    <span className="text-base-content/60">Traits:</span>
                    <div className="font-semibold">{character.traits.length}</div>
                  </div>
                  <div>
                    <span className="text-base-content/60">Relations:</span>
                    <div className="font-semibold">{character.relationships.length}</div>
                  </div>
                </div>

                {/* Storylet Connections */}
                {character.availableInStorylets.length > 0 && (
                  <div>
                    <span className="text-sm text-base-content/60">Available in:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {character.availableInStorylets.slice(0, 2).map(storyletId => (
                        <span key={storyletId} className="badge badge-ghost badge-xs">
                          {getStoryletName(storyletId)}
                        </span>
                      ))}
                      {character.availableInStorylets.length > 2 && (
                        <span className="badge badge-ghost badge-xs">
                          +{character.availableInStorylets.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {character.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {character.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="badge badge-outline badge-xs">
                        {tag}
                      </span>
                    ))}
                    {character.tags.length > 3 && (
                      <span className="badge badge-outline badge-xs">
                        +{character.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-base-300">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditCharacterForm(character)}
                      className="btn btn-ghost btn-sm"
                    >
                      Edit
                    </button>
                    {onEditCharacter && (
                      <button 
                        onClick={() => onEditCharacter(character.id!)}
                        className="btn btn-secondary btn-sm"
                      >
                        Details
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => handleDeleteCharacter(character)}
                    className="btn btn-error btn-sm btn-outline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Character Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCharacter ? 'Edit Character' : 'Create New Character'}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto max-w-5xl">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Character Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter character name"
              required
            />

            <Input
              label="Display Name (Optional)"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Nickname or alias"
            />
          </div>

          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief character description"
            rows={3}
            required
          />

          <TextArea
            label="Biography (Optional)"
            value={formData.biography}
            onChange={(e) => setFormData(prev => ({ ...prev, biography: e.target.value }))}
            placeholder="Detailed character background"
            rows={4}
          />

          {/* Character Properties */}
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as CharacterFormData['category'] }))}
              options={[
                { value: 'main', label: 'Main Character' },
                { value: 'supporting', label: 'Supporting' },
                { value: 'background', label: 'Background' },
                { value: 'antagonist', label: 'Antagonist' },
                { value: 'ally', label: 'Ally' }
              ]}
            />

            <Select
              label="Importance"
              value={formData.importance}
              onChange={(e) => setFormData(prev => ({ ...prev, importance: e.target.value as CharacterFormData['importance'] }))}
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'major', label: 'Major' },
                { value: 'minor', label: 'Minor' }
              ]}
            />

            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as CharacterFormData['status'] }))}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'deceased', label: 'Deceased' },
                { value: 'missing', label: 'Missing' },
                { value: 'hidden', label: 'Hidden' }
              ]}
            />
          </div>

          {/* Visual Properties */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Avatar URL (Optional)"
              value={formData.avatar}
              onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
              placeholder="https://..."
            />

            <div>
              <label className="label">
                <span className="label-text">Character Color</span>
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="input input-bordered w-full h-12"
              />
            </div>
          </div>

          <Input
            label="Tags (comma-separated)"
            value={formData.tags.join(', ')}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
            }))}
            placeholder="mysterious, detective, friendly"
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveCharacter} 
              className="btn btn-primary"
              disabled={!formData.name.trim()}
            >
              {editingCharacter ? 'Update Character' : 'Create Character'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};