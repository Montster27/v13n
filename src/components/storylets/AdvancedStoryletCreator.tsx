import React, { useState, useCallback } from 'react';
import { Card } from '../common/Card';
import { Input } from '../forms/Input';
import { TextArea } from '../forms/TextArea';
import { Select } from '../forms/Select';
import { Modal } from '../common/Modal';
import { useNarrativeStore } from '../../stores/useNarrativeStore';
import { useClueStore } from '../../stores/useClueStore';
import { ClueSelectionModal } from '../clues/ClueSelectionModal';
import { type StoryletFormData, type StoryletTrigger, type StoryletChoice, type StoryletEffect, type ValidationError } from '../../types/storylet';
import type { Clue } from '../../types/clue';

interface AdvancedStoryletCreatorProps {
  storyletId?: string;
  onSave?: (storylet: StoryletFormData) => void;
  onCancel?: () => void;
}

const initialFormData: StoryletFormData = {
  title: '',
  description: '',
  content: '',
  triggers: [],
  choices: [],
  effects: [],
  status: 'dev',
  tags: [],
  priority: 1,
  estimatedPlayTime: 5,
  prerequisites: [],
};

export const AdvancedStoryletCreator: React.FC<AdvancedStoryletCreatorProps> = ({
  storyletId,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<StoryletFormData>(initialFormData);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'triggers' | 'choices' | 'effects'>('basic');
  const [isClueModalOpen, setIsClueModalOpen] = useState(false);
  const [selectedChoiceForClue, setSelectedChoiceForClue] = useState<string | null>(null);

  const { addStorylet, updateStorylet, getStorylet, arcs, storylets } = useNarrativeStore();
  const { getClue } = useClueStore();

  // Load existing storylet if editing
  React.useEffect(() => {
    if (storyletId) {
      const existingStorylet = getStorylet(storyletId);
      if (existingStorylet) {
        setFormData({
          ...existingStorylet,
          tags: existingStorylet.tags || [],
          priority: existingStorylet.priority || 1,
          estimatedPlayTime: existingStorylet.estimatedPlayTime || 5,
          prerequisites: existingStorylet.prerequisites || [],
        });
      }
    }
  }, [storyletId, getStorylet]);

  const handleInputChange = useCallback((field: keyof StoryletFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors for this field
    setErrors(prev => prev.filter(error => error.field !== field));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationError[] = [];

    if (!formData.title.trim()) {
      newErrors.push({ field: 'title', message: 'Title is required' });
    }
    if (!formData.description.trim()) {
      newErrors.push({ field: 'description', message: 'Description is required' });
    }
    if (!formData.content.trim()) {
      newErrors.push({ field: 'content', message: 'Content is required' });
    }
    if (formData.choices.length === 0) {
      newErrors.push({ field: 'choices', message: 'At least one choice is required' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [formData]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    try {
      // First, create any new storylets that are needed for choices
      const updatedChoices = await Promise.all(
        formData.choices.map(async (choice) => {
          if (choice.createNewStorylet) {
            // Create a new storylet for this choice
            const newStoryletData = {
              title: `${formData.title} - ${choice.text}`,
              description: `Continuation from choice: ${choice.text}`,
              content: 'This storylet was automatically created. Edit this content to define what happens next.',
              triggers: [],
              choices: [],
              effects: [],
              storyArc: formData.storyArc,
              status: 'dev' as const,
              tags: [...(formData.tags || []), 'auto-created'],
              priority: formData.priority,
              estimatedPlayTime: 5,
              prerequisites: []
            };
            
            const newStoryletId = await addStorylet(newStoryletData);
            // Storylet created successfully
            
            // Update the choice to point to the new storylet
            return {
              ...choice,
              nextStoryletId: newStoryletId,
              createNewStorylet: false
            };
          }
          return choice;
        })
      );

      // Now save the main storylet with updated choices
      const storyletData = {
        ...formData,
        choices: updatedChoices,
        triggers: formData.triggers || [],
        effects: formData.effects || [],
      };

      if (storyletId) {
        // For updates, include the id
        const updateData: StoryletFormData = {
          ...storyletData,
          id: storyletId,
        };
        await updateStorylet(storyletId, updateData);
        if (onSave) {
          onSave(updateData);
        }
      } else {
        // For new storylets, don't include id - let addStorylet generate it
        const newId = await addStorylet(storyletData);
        if (onSave) {
          onSave({ ...storyletData, id: newId });
        }
      }
    } catch (error) {
      console.error('Failed to save storylet:', error);
      // You might want to show an error message to the user here
    }
  }, [formData, storyletId, validateForm, addStorylet, updateStorylet, onSave]);

  const addTrigger = useCallback(() => {
    const newTrigger: StoryletTrigger = {
      id: crypto.randomUUID(),
      type: 'resource',
      condition: '',
      operator: '>',
      value: 0,
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      triggers: [...prev.triggers, newTrigger]
    }));
  }, []);

  const updateTrigger = useCallback((id: string, updates: Partial<StoryletTrigger>) => {
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.map(trigger => 
        trigger.id === id ? { ...trigger, ...updates } : trigger
      )
    }));
  }, []);

  const removeTrigger = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.filter(trigger => trigger.id !== id)
    }));
  }, []);

  const addChoice = useCallback(() => {
    const newChoice: StoryletChoice = {
      id: crypto.randomUUID(),
      text: '',
      description: '',
      effects: [],
      requirements: [],
      probability: 100,
      unlocked: true,
      nextStoryletId: undefined,
      createNewStorylet: false
    };
    setFormData(prev => ({
      ...prev,
      choices: [...prev.choices, newChoice]
    }));
  }, []);

  const updateChoice = useCallback((id: string, updates: Partial<StoryletChoice>) => {
    setFormData(prev => ({
      ...prev,
      choices: prev.choices.map(choice => 
        choice.id === id ? { ...choice, ...updates } : choice
      )
    }));
  }, []);

  const removeChoice = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      choices: prev.choices.filter(choice => choice.id !== id)
    }));
  }, []);

  const handleAddClue = useCallback((choiceId: string) => {
    setSelectedChoiceForClue(choiceId);
    setIsClueModalOpen(true);
  }, []);

  const handleClueSelected = useCallback((clue: Clue) => {
    if (!selectedChoiceForClue) return;
    
    // Update the choice to reference the clue
    updateChoice(selectedChoiceForClue, { 
      clueId: clue.id,
      nextStoryletId: undefined, // Clear storylet link when adding clue
      createNewStorylet: false
    });
    
    // Close modal and reset state
    setIsClueModalOpen(false);
    setSelectedChoiceForClue(null);
  }, [selectedChoiceForClue, updateChoice]);

  const addEffect = useCallback(() => {
    const newEffect: StoryletEffect = {
      id: crypto.randomUUID(),
      type: 'resource',
      target: '',
      operator: '+',
      value: 1,
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      effects: [...prev.effects, newEffect]
    }));
  }, []);

  const updateEffect = useCallback((id: string, updates: Partial<StoryletEffect>) => {
    setFormData(prev => ({
      ...prev,
      effects: prev.effects.map(effect => 
        effect.id === id ? { ...effect, ...updates } : effect
      )
    }));
  }, []);

  const removeEffect = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      effects: prev.effects.filter(effect => effect.id !== id)
    }));
  }, []);

  const renderBasicTab = () => (
    <div className="space-y-4">
      <Input
        label="Title"
        value={formData.title}
        onChange={(e) => handleInputChange('title', e.target.value)}
        error={errors.find(e => e.field === 'title')?.message}
        placeholder="Enter storylet title"
      />
      
      <TextArea
        label="Description"
        value={formData.description}
        onChange={(e) => handleInputChange('description', e.target.value)}
        error={errors.find(e => e.field === 'description')?.message}
        placeholder="Brief description of the storylet"
        rows={3}
      />
      
      <TextArea
        label="Content"
        value={formData.content}
        onChange={(e) => handleInputChange('content', e.target.value)}
        error={errors.find(e => e.field === 'content')?.message}
        placeholder="The main narrative content that players will see"
        rows={6}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
          options={[
            { value: 'dev', label: 'Development' },
            { value: 'stage', label: 'Staging' },
            { value: 'live', label: 'Live' }
          ]}
        />

        <Select
          label="Story Arc"
          value={formData.storyArc || ''}
          onChange={(e) => handleInputChange('storyArc', e.target.value)}
          options={[
            { value: '', label: 'No Arc' },
            ...arcs.map(arc => ({ value: arc.id, label: arc.name }))
          ]}
        />

        <Input
          type="number"
          label="Priority"
          value={formData.priority.toString()}
          onChange={(e) => handleInputChange('priority', parseInt(e.target.value) || 1)}
          min="1"
          max="10"
        />

        <Input
          type="number"
          label="Estimated Play Time (minutes)"
          value={formData.estimatedPlayTime.toString()}
          onChange={(e) => handleInputChange('estimatedPlayTime', parseInt(e.target.value) || 5)}
          min="1"
        />
      </div>

      <Input
        label="Tags (comma-separated)"
        value={formData.tags.join(', ')}
        onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
        placeholder="action, dialogue, mystery"
      />
    </div>
  );

  const renderTriggersTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Triggers</h3>
        <button onClick={addTrigger} className="btn btn-primary btn-sm">
          Add Trigger
        </button>
      </div>
      
      {formData.triggers.length === 0 ? (
        <p className="text-base-content/70 text-center py-8">No triggers defined. Add a trigger to specify when this storylet becomes available.</p>
      ) : (
        <div className="space-y-3">
          {formData.triggers.map((trigger) => (
            <Card key={trigger.id} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select
                  label="Type"
                  value={trigger.type}
                  onChange={(e) => updateTrigger(trigger.id, { type: e.target.value as StoryletTrigger['type'] })}
                  options={[
                    { value: 'resource', label: 'Resource' },
                    { value: 'relationship', label: 'Relationship' },
                    { value: 'time', label: 'Time' },
                    { value: 'clue', label: 'Clue' },
                    { value: 'storylet_completion', label: 'Storylet Completion' },
                    { value: 'random', label: 'Random' }
                  ]}
                />
                
                <Input
                  label="Condition"
                  value={trigger.condition}
                  onChange={(e) => updateTrigger(trigger.id, { condition: e.target.value })}
                  placeholder="energy, time, relationship_id"
                />
                
                <Select
                  label="Operator"
                  value={trigger.operator || '>'}
                  onChange={(e) => updateTrigger(trigger.id, { operator: e.target.value as StoryletTrigger['operator'] })}
                  options={[
                    { value: '>', label: 'Greater than' },
                    { value: '<', label: 'Less than' },
                    { value: '=', label: 'Equal to' },
                    { value: '>=', label: 'Greater or equal' },
                    { value: '<=', label: 'Less or equal' },
                    { value: '!=', label: 'Not equal' }
                  ]}
                />
                
                <Input
                  type="number"
                  label="Value"
                  value={trigger.value?.toString() || '0'}
                  onChange={(e) => updateTrigger(trigger.id, { value: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div className="mt-3 flex justify-between items-end">
                <Input
                  label="Description"
                  value={trigger.description}
                  onChange={(e) => updateTrigger(trigger.id, { description: e.target.value })}
                  placeholder="Describe when this trigger activates"
                  className="flex-1 mr-2"
                />
                <button 
                  onClick={() => removeTrigger(trigger.id)}
                  className="btn btn-error btn-sm"
                >
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderChoicesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Choices</h3>
        <button onClick={addChoice} className="btn btn-primary btn-sm">
          Add Choice
        </button>
      </div>
      
      {errors.find(e => e.field === 'choices') && (
        <div className="alert alert-error">
          <span>{errors.find(e => e.field === 'choices')?.message}</span>
        </div>
      )}
      
      {formData.choices.length === 0 ? (
        <p className="text-base-content/70 text-center py-8">No choices defined. Add at least one choice for player interaction.</p>
      ) : (
        <div className="space-y-4">
          {formData.choices.map((choice) => (
            <Card key={choice.id} className="p-4">
              <div className="space-y-3">
                <Input
                  label="Choice Text"
                  value={choice.text}
                  onChange={(e) => updateChoice(choice.id, { text: e.target.value })}
                  placeholder="What the player sees as an option"
                />
                
                <TextArea
                  label="Description (Optional)"
                  value={choice.description || ''}
                  onChange={(e) => updateChoice(choice.id, { description: e.target.value })}
                  placeholder="Additional details about this choice"
                  rows={2}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    type="number"
                    label="Probability %"
                    value={choice.probability?.toString() || '100'}
                    onChange={(e) => updateChoice(choice.id, { probability: parseInt(e.target.value) || 100 })}
                    min="1"
                    max="100"
                  />
                  
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">Unlocked by default</span>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={choice.unlocked || false}
                        onChange={(e) => updateChoice(choice.id, { unlocked: e.target.checked })}
                      />
                    </label>
                  </div>
                </div>
                
                {/* Next Storylet Linking */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-base-content/80">Next Storylet</h4>
                  <p className="text-xs text-base-content/60">Choose what happens when the player selects this choice</p>
                  
                  <Select
                    label="Next Storylet"
                    value={choice.clueId ? `CLUE_${choice.clueId}` : (choice.nextStoryletId || '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'ADD_CLUE') {
                        handleAddClue(choice.id);
                      } else if (value === 'CREATE_NEW') {
                        updateChoice(choice.id, { nextStoryletId: undefined, createNewStorylet: true, clueId: undefined });
                      } else if (value === '') {
                        updateChoice(choice.id, { nextStoryletId: undefined, createNewStorylet: false, clueId: undefined });
                      } else {
                        updateChoice(choice.id, { nextStoryletId: value, createNewStorylet: false, clueId: undefined });
                      }
                    }}
                    options={[
                      { value: '', label: 'No next storylet (ends here)' },
                      { value: 'CREATE_NEW', label: '+ Create New Storylet' },
                      { value: 'ADD_CLUE', label: '🔍 Add a Clue' },
                      ...storylets
                        .filter(s => s.storyArc === formData.storyArc && s.id !== storyletId)
                        .map(s => ({ value: s.id!, label: s.title }))
                    ]}
                  />
                  
                  {choice.createNewStorylet && (
                    <div className="alert alert-info">
                      <span className="text-sm">
                        📝 A new storylet will be created when you save this storylet. 
                        You can then edit the new storylet to define its content.
                      </span>
                    </div>
                  )}
                  
                  {choice.nextStoryletId && !choice.clueId && (
                    <div className="alert alert-success">
                      <span className="text-sm">
                        🔗 This choice will lead to: <strong>{storylets.find(s => s.id === choice.nextStoryletId)?.title || 'Unknown Storylet'}</strong>
                      </span>
                    </div>
                  )}
                  
                  {choice.clueId && (
                    <div className="alert alert-info">
                      <span className="text-sm">
                        🔍 This choice provides access to clue: <strong>{getClue(choice.clueId)?.title || 'Unknown Clue'}</strong>
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <button 
                    onClick={() => removeChoice(choice.id)}
                    className="btn btn-error btn-sm"
                  >
                    Remove Choice
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderEffectsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Effects</h3>
        <button onClick={addEffect} className="btn btn-primary btn-sm">
          Add Effect
        </button>
      </div>
      
      {formData.effects.length === 0 ? (
        <p className="text-base-content/70 text-center py-8">No effects defined. Add effects to specify what happens when this storylet is completed.</p>
      ) : (
        <div className="space-y-3">
          {formData.effects.map((effect) => (
            <Card key={effect.id} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select
                  label="Type"
                  value={effect.type}
                  onChange={(e) => updateEffect(effect.id, { type: e.target.value as StoryletEffect['type'] })}
                  options={[
                    { value: 'resource', label: 'Resource' },
                    { value: 'relationship', label: 'Relationship' },
                    { value: 'clue_discovery', label: 'Clue Discovery' },
                    { value: 'storylet_unlock', label: 'Storylet Unlock' },
                    { value: 'arc_progress', label: 'Arc Progress' },
                    { value: 'time_advance', label: 'Time Advance' }
                  ]}
                />
                
                <Input
                  label="Target"
                  value={effect.target}
                  onChange={(e) => updateEffect(effect.id, { target: e.target.value })}
                  placeholder="energy, character_id, clue_id"
                />
                
                <Select
                  label="Operator"
                  value={effect.operator || '+'}
                  onChange={(e) => updateEffect(effect.id, { operator: e.target.value as StoryletEffect['operator'] })}
                  options={[
                    { value: '+', label: 'Add' },
                    { value: '-', label: 'Subtract' },
                    { value: '=', label: 'Set to' },
                    { value: '*', label: 'Multiply by' }
                  ]}
                />
                
                <Input
                  type="number"
                  label="Value"
                  value={effect.value?.toString() || '1'}
                  onChange={(e) => updateEffect(effect.id, { value: parseInt(e.target.value) || 1 })}
                />
              </div>
              
              <div className="mt-3 flex justify-between items-end">
                <Input
                  label="Description"
                  value={effect.description}
                  onChange={(e) => updateEffect(effect.id, { description: e.target.value })}
                  placeholder="Describe what this effect does"
                  className="flex-1 mr-2"
                />
                <button 
                  onClick={() => removeEffect(effect.id)}
                  className="btn btn-error btn-sm"
                >
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <Card title={storyletId ? "Edit Storylet" : "Create New Storylet"}>
        {/* Tab Navigation */}
        <div className="tabs tabs-bordered mb-6">
          <button
            className={`tab tab-bordered ${activeTab === 'basic' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </button>
          <button
            className={`tab tab-bordered ${activeTab === 'triggers' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('triggers')}
          >
            Triggers ({formData.triggers.length})
          </button>
          <button
            className={`tab tab-bordered ${activeTab === 'choices' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('choices')}
          >
            Choices ({formData.choices.length})
          </button>
          <button
            className={`tab tab-bordered ${activeTab === 'effects' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('effects')}
          >
            Effects ({formData.effects.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'basic' && renderBasicTab()}
          {activeTab === 'triggers' && renderTriggersTab()}
          {activeTab === 'choices' && renderChoicesTab()}
          {activeTab === 'effects' && renderEffectsTab()}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
          <button onClick={handleSave} className="btn btn-primary">
            {storyletId ? 'Update Storylet' : 'Create Storylet'}
          </button>
          <button 
            onClick={() => setIsPreviewOpen(true)} 
            className="btn btn-secondary"
          >
            Preview
          </button>
          {onCancel && (
            <button onClick={onCancel} className="btn btn-ghost">
              Cancel
            </button>
          )}
        </div>
      </Card>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Storylet Preview"
      >
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{formData.title || 'Untitled Storylet'}</h3>
            <p className="text-sm opacity-70">{formData.description || 'No description'}</p>
          </div>
          
          <div className="bg-base-200 p-4 rounded">
            <p>{formData.content || 'No content provided'}</p>
          </div>
          
          {formData.choices.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Choices:</h4>
              <div className="space-y-2">
                {formData.choices.map((choice, index) => (
                  <div key={choice.id} className="btn btn-outline btn-sm justify-start">
                    {index + 1}. {choice.text || 'Unnamed choice'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Clue Selection Modal */}
      <ClueSelectionModal
        isOpen={isClueModalOpen}
        onClose={() => {
          setIsClueModalOpen(false);
          setSelectedChoiceForClue(null);
        }}
        onSelectClue={handleClueSelected}
        arcId={formData.storyArc}
        title="Select a Clue for This Choice"
      />
    </div>
  );
};