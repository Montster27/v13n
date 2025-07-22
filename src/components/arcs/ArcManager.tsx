import React, { useState, useMemo } from 'react';
import { Card } from '../common/Card';
import { Input } from '../forms/Input';
import { TextArea } from '../forms/TextArea';
import { Select } from '../forms/Select';
import { Modal } from '../common/Modal';
import { useNarrativeStore } from '../../stores/useNarrativeStore';
import { type StoryArc } from '../../types/narrative';

interface ArcManagerProps {
  onVisualEdit?: (arcId: string) => void;
}

interface ArcFormData {
  id?: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedLength: number;
  prerequisites: string[];
  tags: string[];
}

const initialArcForm: ArcFormData = {
  name: '',
  description: '',
  category: 'main',
  difficulty: 'beginner',
  estimatedLength: 10,
  prerequisites: [],
  tags: []
};

export const ArcManager: React.FC<ArcManagerProps> = ({
  onVisualEdit
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArc, setEditingArc] = useState<string | undefined>();
  const [formData, setFormData] = useState<ArcFormData>(initialArcForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const { 
    arcs, 
    storylets, 
    addStoryArc, 
    updateStoryArc, 
    deleteStoryArc
  } = useNarrativeStore();

  // Calculate arc statistics
  const arcStats = useMemo(() => {
    return arcs.map(arc => {
      const arcStorylets = storylets.filter(s => s.storyArc === arc.id);
      const completedStorylets = arcStorylets.filter(s => s.status === 'live');
      
      // Cast to our enhanced StoryArc type for display
      const enhancedArc = arc as StoryArc & {
        category?: string;
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
        tags?: string[];
      };
      
      return {
        ...enhancedArc,
        storyletCount: arcStorylets.length,
        completedCount: completedStorylets.length,
        progress: arcStorylets.length > 0 ? 
          Math.round((completedStorylets.length / arcStorylets.length) * 100) : 0,
        estimatedPlayTime: arcStorylets.reduce((sum, s) => 
          sum + (s.estimatedPlayTime || 5), 0)
      };
    });
  }, [arcs, storylets]);

  // Filter arcs
  const filteredArcs = useMemo(() => {
    return arcStats.filter(arc => {
      const matchesSearch = searchTerm === '' || 
        arc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arc.description.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesCategory = filterCategory === 'all' || 
        arc.category === filterCategory;
        
      return matchesSearch && matchesCategory;
    });
  }, [arcStats, searchTerm, filterCategory]);

  const handleCreateArc = () => {
    setEditingArc(undefined);
    setFormData(initialArcForm);
    setIsModalOpen(true);
  };

  const handleEditArcForm = (arc: StoryArc) => {
    setEditingArc(arc.id);
    setFormData({
      id: arc.id,
      name: arc.name,
      description: arc.description,
      category: arc.category || 'main',
      difficulty: arc.difficulty || 'beginner',
      estimatedLength: arc.estimatedLength || 10,
      prerequisites: arc.prerequisites || [],
      tags: arc.tags || []
    });
    setIsModalOpen(true);
  };

  const handleSaveArc = async () => {
    if (!formData.name.trim()) return;

    const arcData: Omit<StoryArc, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      difficulty: formData.difficulty,
      estimatedLength: formData.estimatedLength,
      prerequisites: formData.prerequisites,
      tags: formData.tags
    };

    try {
      if (editingArc) {
        await updateStoryArc(editingArc, arcData);
      } else {
        await addStoryArc(arcData);
      }

      setIsModalOpen(false);
      setFormData(initialArcForm);
    } catch (error) {
      console.error('Failed to save arc:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleDeleteArc = async (arc: any) => {
    if (arc.storyletCount > 0) {
      if (!window.confirm(
        `Arc "${arc.name}" has ${arc.storyletCount} storylets. Deleting the arc will unassign these storylets. Continue?`
      )) {
        return;
      }
    } else if (!window.confirm(`Delete arc "${arc.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteStoryArc(arc.id);
    } catch (error) {
      console.error('Failed to delete arc:', error);
      // You might want to show an error message to the user here
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    const styles = {
      beginner: 'badge-success',
      intermediate: 'badge-warning',
      advanced: 'badge-error'
    };
    return `badge ${styles[difficulty as keyof typeof styles] || 'badge-neutral'}`;
  };

  const getCategoryBadge = (category: string) => {
    const styles = {
      main: 'badge-primary',
      side: 'badge-secondary',
      epilogue: 'badge-accent',
      tutorial: 'badge-info'
    };
    return `badge ${styles[category as keyof typeof styles] || 'badge-neutral'}`;
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const categorySet = new Set(['main']);
    arcs.forEach(arc => {
      if (arc.category) categorySet.add(arc.category);
    });
    return Array.from(categorySet);
  }, [arcs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Arc Manager</h1>
          <p className="text-base-content/70">
            Organize storylets into narrative arcs and track progress
          </p>
        </div>
        
        <button onClick={handleCreateArc} className="btn btn-primary">
          Create New Arc
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Search Arcs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or description..."
          />

          <Select
            label="Category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.map(cat => ({ 
                value: cat, 
                label: cat.charAt(0).toUpperCase() + cat.slice(1) 
              }))
            ]}
          />
        </div>
      </Card>

      {/* Arc List */}
      {filteredArcs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-base-content/70 text-lg mb-4">
            {arcs.length === 0 ? 'No arcs created yet' : 'No arcs match your filters'}
          </p>
          <button onClick={handleCreateArc} className="btn btn-primary">
            Create Your First Arc
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredArcs.map((arc) => (
            <Card key={arc.id} className="hover:shadow-lg transition-shadow duration-200">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate" title={arc.name}>
                      {arc.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`badge ${getCategoryBadge(arc.category || 'main')} badge-sm`}>
                        {arc.category || 'main'}
                      </span>
                      <span className={`badge ${getDifficultyBadge(arc.difficulty || 'beginner')} badge-sm`}>
                        {arc.difficulty || 'beginner'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-base-content/70 line-clamp-3">
                  {arc.description || 'No description provided'}
                </p>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{arc.progress}%</span>
                  </div>
                  <progress 
                    className="progress progress-primary w-full" 
                    value={arc.progress} 
                    max="100"
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-base-content/60">Storylets:</span>
                    <div className="font-semibold">
                      {arc.completedCount}/{arc.storyletCount}
                    </div>
                  </div>
                  <div>
                    <span className="text-base-content/60">Play Time:</span>
                    <div className="font-semibold">
                      {Math.round(arc.estimatedPlayTime / 60) || 0}h {arc.estimatedPlayTime % 60}m
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {arc.tags && arc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {arc.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="badge badge-ghost badge-xs">
                        {tag}
                      </span>
                    ))}
                    {arc.tags.length > 3 && (
                      <span className="badge badge-ghost badge-xs">
                        +{arc.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-base-300">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditArcForm(arc)}
                      className="btn btn-ghost btn-sm"
                    >
                      Edit
                    </button>
                    {onVisualEdit && (
                      <button 
                        onClick={() => onVisualEdit(arc.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        Visual
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => handleDeleteArc(arc)}
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

      {/* Create/Edit Arc Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingArc ? 'Edit Arc' : 'Create New Arc'}
      >
        <div className="space-y-4">
          <Input
            label="Arc Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter arc name"
          />

          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the narrative arc"
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              options={[
                { value: 'main', label: 'Main Story' },
                { value: 'side', label: 'Side Quest' },
                { value: 'epilogue', label: 'Epilogue' },
                { value: 'tutorial', label: 'Tutorial' }
              ]}
            />

            <Select
              label="Difficulty"
              value={formData.difficulty}
              onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as ArcFormData['difficulty'] }))}
              options={[
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' }
              ]}
            />
          </div>

          <Input
            type="number"
            label="Estimated Length (minutes)"
            value={formData.estimatedLength.toString()}
            onChange={(e) => setFormData(prev => ({ ...prev, estimatedLength: parseInt(e.target.value) || 10 }))}
            min="1"
          />

          <Input
            label="Tags (comma-separated)"
            value={formData.tags.join(', ')}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
            }))}
            placeholder="mystery, dialogue, action"
          />

          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveArc} 
              className="btn btn-primary"
              disabled={!formData.name.trim()}
            >
              {editingArc ? 'Update Arc' : 'Create Arc'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};