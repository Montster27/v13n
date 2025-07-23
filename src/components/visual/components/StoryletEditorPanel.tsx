import React, { useState, useEffect } from 'react';
import { useNarrativeStore } from '../../../stores/useNarrativeStore';
import type { Storylet, StoryletChoice, StoryletEffect } from '../../../types/storylet';

interface StoryletEditorPanelProps {
  storyletId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const StoryletEditorPanel: React.FC<StoryletEditorPanelProps> = ({
  storyletId,
  isOpen,
  onClose
}) => {
  const { storylets, updateStorylet } = useNarrativeStore();
  
  const [editingStorylet, setEditingStorylet] = useState<Storylet | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    if (isOpen && storyletId) {
      const storylet = storylets.find(s => s.id === storyletId);
      if (storylet) {
        setEditingStorylet({
          ...storylet,
          tags: storylet.tags || [],
          priority: storylet.priority || 1,
          estimatedPlayTime: storylet.estimatedPlayTime || 5
        });
        setUnsavedChanges(false);
      }
    }
  }, [isOpen, storyletId, storylets]);

  const handleSave = async () => {
    if (!editingStorylet) return;
    
    try {
      await updateStorylet(editingStorylet.id!, {
        title: editingStorylet.title,
        description: editingStorylet.description,
        content: editingStorylet.content,
        choices: editingStorylet.choices,
        effects: editingStorylet.effects,
        triggers: editingStorylet.triggers,
        tags: editingStorylet.tags,
        priority: editingStorylet.priority,
        estimatedPlayTime: editingStorylet.estimatedPlayTime
      });
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save storylet:', error);
    }
  };

  const handleClose = () => {
    if (unsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const updateStoryletField = <K extends keyof Storylet>(field: K, value: Storylet[K]) => {
    if (!editingStorylet) return;
    
    setEditingStorylet(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setUnsavedChanges(true);
  };

  const addChoice = () => {
    if (!editingStorylet) return;
    
    const newChoice: StoryletChoice = {
      id: crypto.randomUUID(),
      text: 'New Choice',
      description: '',
      effects: [],
      requirements: [],
      probability: 100,
      unlocked: true
    };
    
    updateStoryletField('choices', [...editingStorylet.choices, newChoice]);
  };

  const updateChoice = (choiceId: string, updates: Partial<StoryletChoice>) => {
    if (!editingStorylet) return;
    
    const updatedChoices = editingStorylet.choices.map((choice: StoryletChoice) =>
      choice.id === choiceId ? { ...choice, ...updates } : choice
    );
    
    updateStoryletField('choices', updatedChoices);
  };

  const removeChoice = (choiceId: string) => {
    if (!editingStorylet) return;
    
    const updatedChoices = editingStorylet.choices.filter((choice: StoryletChoice) => choice.id !== choiceId);
    updateStoryletField('choices', updatedChoices);
  };

  const addEffect = () => {
    if (!editingStorylet) return;
    
    const newEffect: StoryletEffect = {
      id: crypto.randomUUID(),
      type: 'resource',
      target: 'energy',
      value: 1,
      operator: '+',
      description: 'New effect'
    };
    
    updateStoryletField('effects', [...editingStorylet.effects, newEffect]);
  };

  const updateEffect = (effectId: string, updates: Partial<StoryletEffect>) => {
    if (!editingStorylet) return;
    
    const updatedEffects = editingStorylet.effects.map((effect: StoryletEffect) =>
      effect.id === effectId ? { ...effect, ...updates } : effect
    );
    
    updateStoryletField('effects', updatedEffects);
  };

  const removeEffect = (effectId: string) => {
    if (!editingStorylet) return;
    
    const updatedEffects = editingStorylet.effects.filter((effect: StoryletEffect) => effect.id !== effectId);
    updateStoryletField('effects', updatedEffects);
  };

  if (!isOpen || !editingStorylet) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-base-100 shadow-xl z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-base-200 p-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Edit Storylet</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className={`btn btn-sm ${
                unsavedChanges ? 'btn-warning' : 'btn-success'
              }`}
              disabled={!unsavedChanges}
            >
              💾 Save
            </button>
            <button onClick={handleClose} className="btn btn-sm btn-ghost">
              ✖
            </button>
          </div>
        </div>
        {unsavedChanges && (
          <div className="text-warning text-sm mt-1">
            ⚠️ Unsaved changes
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic Info */}
        <div className="space-y-3">
          <div>
            <label className="label">
              <span className="label-text font-medium">Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={editingStorylet.title}
              onChange={(e) => updateStoryletField('title', e.target.value)}
            />
          </div>
          
          <div>
            <label className="label">
              <span className="label-text font-medium">Description</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={editingStorylet.description}
              onChange={(e) => updateStoryletField('description', e.target.value)}
            />
          </div>
          
          <div>
            <label className="label">
              <span className="label-text font-medium">Content</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-32"
              value={editingStorylet.content}
              onChange={(e) => updateStoryletField('content', e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                <span className="label-text font-medium">Priority</span>
              </label>
              <input
                type="number"
                min="1"
                max="10"
                className="input input-bordered w-full"
                value={editingStorylet.priority}
                onChange={(e) => updateStoryletField('priority', parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div>
              <label className="label">
                <span className="label-text font-medium">Play Time (min)</span>
              </label>
              <input
                type="number"
                min="1"
                className="input input-bordered w-full"
                value={editingStorylet.estimatedPlayTime}
                onChange={(e) => updateStoryletField('estimatedPlayTime', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        </div>

        {/* Choices */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">Choices ({editingStorylet.choices.length})</h4>
            <button onClick={addChoice} className="btn btn-xs btn-primary">
              + Add Choice
            </button>
          </div>
          
          <div className="space-y-2">
            {editingStorylet.choices.map((choice: StoryletChoice) => (
              <div key={choice.id} className="border rounded p-2 space-y-2">
                <div className="flex justify-between">
                  <input
                    type="text"
                    className="input input-bordered input-xs flex-1 mr-2"
                    value={choice.text}
                    onChange={(e) => updateChoice(choice.id, { text: e.target.value })}
                    placeholder="Choice text"
                  />
                  <button
                    onClick={() => removeChoice(choice.id)}
                    className="btn btn-xs btn-error"
                  >
                    ✖
                  </button>
                </div>
                <input
                  type="text"
                  className="input input-bordered input-xs w-full"
                  value={choice.description || ''}
                  onChange={(e) => updateChoice(choice.id, { description: e.target.value })}
                  placeholder="Description (optional)"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Effects */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">Effects ({editingStorylet.effects.length})</h4>
            <button onClick={addEffect} className="btn btn-xs btn-secondary">
              + Add Effect
            </button>
          </div>
          
          <div className="space-y-2">
            {editingStorylet.effects.map((effect: StoryletEffect) => (
              <div key={effect.id} className="border rounded p-2 space-y-2">
                <div className="flex gap-2">
                  <select
                    className="select select-bordered select-xs flex-1"
                    value={effect.type}
                    onChange={(e) => updateEffect(effect.id, { type: e.target.value as any })}
                  >
                    <option value="resource">Resource</option>
                    <option value="relationship">Relationship</option>
                    <option value="state">State</option>
                    <option value="unlock">Unlock</option>
                  </select>
                  <input
                    type="text"
                    className="input input-bordered input-xs flex-1"
                    value={effect.target}
                    onChange={(e) => updateEffect(effect.id, { target: e.target.value })}
                    placeholder="Target"
                  />
                  <select
                    className="select select-bordered select-xs w-16"
                    value={effect.operator}
                    onChange={(e) => updateEffect(effect.id, { operator: e.target.value as any })}
                  >
                    <option value="+">+</option>
                    <option value="-">-</option>
                    <option value="=">=</option>
                  </select>
                  <input
                    type="number"
                    className="input input-bordered input-xs w-16"
                    value={effect.value}
                    onChange={(e) => updateEffect(effect.id, { value: parseInt(e.target.value) || 0 })}
                  />
                  <button
                    onClick={() => removeEffect(effect.id)}
                    className="btn btn-xs btn-error"
                  >
                    ✖
                  </button>
                </div>
                <input
                  type="text"
                  className="input input-bordered input-xs w-full"
                  value={effect.description}
                  onChange={(e) => updateEffect(effect.id, { description: e.target.value })}
                  placeholder="Effect description"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="label">
            <span className="label-text font-medium">Tags (comma-separated)</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={editingStorylet.tags?.join(', ') || ''}
            onChange={(e) => updateStoryletField('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
            placeholder="detective, investigation, main-quest"
          />
        </div>
      </div>
    </div>
  );
};
