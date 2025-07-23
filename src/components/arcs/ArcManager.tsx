import React, { useState, useMemo } from 'react';
import { Card } from '../common/Card';
import { Input } from '../forms/Input';
import { TextArea } from '../forms/TextArea';
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
  estimatedLength: number;
  prerequisites: string[];
  tags: string[];
}

const initialArcForm: ArcFormData = {
  name: '',
  description: '',
  estimatedLength: 30,
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

  const { 
    arcs, 
    storylets, 
    addStoryArc, 
    updateStoryArc, 
    deleteStoryArc
  } = useNarrativeStore();


  const filteredArcs = useMemo(() => {
    return arcs.filter(arc => {
      const matchesSearch = !searchTerm || 
        arc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (arc.tags && arc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));

      return matchesSearch;
    });
  }, [arcs, searchTerm]);

  // Get storylets for each arc
  const arcStoryletCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    arcs.forEach(arc => {
      counts[arc.id] = storylets.filter(s => s.storyArc === arc.id).length;
    });
    return counts;
  }, [arcs, storylets]);

  const handleOpenModal = (arc?: StoryArc) => {
    if (arc) {
      setEditingArc(arc.id);
      setFormData({
        name: arc.name,
        description: arc.description,
        estimatedLength: arc.estimatedLength || 30,
        prerequisites: arc.prerequisites || [],
        tags: arc.tags || []
      });
    } else {
      setEditingArc(undefined);
      setFormData(initialArcForm);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingArc(undefined);
    setFormData(initialArcForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const arcData = {
      name: formData.name,
      description: formData.description,
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

  const handleDelete = async (arcId: string) => {
    if (window.confirm('Are you sure you want to delete this story arc? This action cannot be undone.')) {
      try {
        await deleteStoryArc(arcId);
      } catch (error) {
        console.error('Failed to delete arc:', error);
      }
    }
  };

  const handleVisualEdit = (arcId: string) => {
    if (onVisualEdit) {
      onVisualEdit(arcId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Story Arcs</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="btn btn-primary"
        >
          + Create Arc
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <Input
          label="Search arcs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
          placeholder="Search by name, description, or tags..."
        />
      </div>

      {/* Arc List */}
      <div className="grid gap-4">
        {filteredArcs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-base-content/70">
              {searchTerm ? 'No arcs match your search criteria.' : 'No story arcs created yet.'}
            </p>
            {!searchTerm && (
              <button 
                onClick={() => handleOpenModal()}
                className="btn btn-primary mt-4"
              >
                Create your first arc
              </button>
            )}
          </Card>
        ) : (
          filteredArcs.map(arc => (
            <Card key={arc.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{arc.name}</h3>
                    <div className="flex gap-2">
                      <span className="badge badge-primary badge-sm">
                        {arcStoryletCounts[arc.id] || 0} storylets
                      </span>
                      {arc.estimatedLength && (
                        <span className="badge badge-secondary badge-sm">
                          ~{arc.estimatedLength}min
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-base-content/80 mb-3">{arc.description}</p>
                  
                  {arc.tags && arc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {arc.tags.map(tag => (
                        <span key={tag} className="badge badge-ghost badge-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {arc.prerequisites && arc.prerequisites.length > 0 && (
                    <div className="text-sm text-base-content/60">
                      <strong>Prerequisites:</strong> {arc.prerequisites.join(', ')}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVisualEdit(arc.id)}
                    className="btn btn-sm btn-secondary"
                    title="Visual Editor"
                  >
                    🎨 Visual
                  </button>
                  <button
                    onClick={() => handleOpenModal(arc)}
                    className="btn btn-sm btn-ghost"
                    title="Edit Arc"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(arc.id)}
                    className="btn btn-sm btn-error btn-ghost"
                    title="Delete Arc"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Arc Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingArc ? 'Edit Story Arc' : 'Create Story Arc'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Arc Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter arc name..."
            required
          />

          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe this story arc..."
            rows={3}
            required
          />

          <Input
            label="Estimated Length (minutes)"
            type="number"
            value={formData.estimatedLength.toString()}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              estimatedLength: parseInt(e.target.value) || 30
            }))}
            min="1"
          />

          <Input
            label="Tags (comma-separated)"
            value={formData.tags.join(', ')}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
            }))}
            placeholder="mystery, investigation, main-story..."
          />

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={handleCloseModal}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn btn-primary"
            >
              {editingArc ? 'Update Arc' : 'Create Arc'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};