import { type StoryletFormData, type ValidationError, type StoryletValidationResult } from '../types/storylet';

export const validateStoryletForm = (formData: StoryletFormData): StoryletValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Basic field validation
  if (!formData.title?.trim()) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (formData.title.length > 100) {
    warnings.push({ field: 'title', message: 'Title is quite long, consider shortening' });
  }

  if (!formData.description?.trim()) {
    errors.push({ field: 'description', message: 'Description is required' });
  } else if (formData.description.length > 500) {
    warnings.push({ field: 'description', message: 'Description is very long, consider shortening' });
  }

  if (!formData.content?.trim()) {
    errors.push({ field: 'content', message: 'Content is required' });
  } else if (formData.content.length < 50) {
    warnings.push({ field: 'content', message: 'Content seems short, consider adding more detail' });
  }

  // Choice validation
  if (formData.choices.length === 0) {
    errors.push({ field: 'choices', message: 'At least one choice is required' });
  } else {
    formData.choices.forEach((choice, index) => {
      if (!choice.text?.trim()) {
        errors.push({ 
          field: 'choices', 
          message: `Choice ${index + 1} must have text`,
          path: `choices[${index}].text`
        });
      }
    });
  }

  // Trigger validation
  formData.triggers.forEach((trigger, index) => {
    if (!trigger.condition?.trim()) {
      errors.push({
        field: 'triggers',
        message: `Trigger ${index + 1} must have a condition`,
        path: `triggers[${index}].condition`
      });
    }
    
    if (trigger.type === 'resource' && !trigger.value && trigger.value !== 0) {
      errors.push({
        field: 'triggers',
        message: `Trigger ${index + 1} of type 'resource' must have a value`,
        path: `triggers[${index}].value`
      });
    }
  });

  // Effect validation
  formData.effects.forEach((effect, index) => {
    if (!effect.target?.trim()) {
      errors.push({
        field: 'effects',
        message: `Effect ${index + 1} must have a target`,
        path: `effects[${index}].target`
      });
    }
    
    if (!effect.value && effect.value !== 0) {
      warnings.push({
        field: 'effects',
        message: `Effect ${index + 1} has no value specified`,
        path: `effects[${index}].value`
      });
    }
  });

  // Business logic validation
  if (formData.priority < 1 || formData.priority > 10) {
    warnings.push({ field: 'priority', message: 'Priority should be between 1-10' });
  }

  if (formData.estimatedPlayTime < 1) {
    warnings.push({ field: 'estimatedPlayTime', message: 'Estimated play time should be at least 1 minute' });
  }

  // Tag validation
  if (formData.tags.some(tag => tag.length > 20)) {
    warnings.push({ field: 'tags', message: 'Some tags are very long, consider shortening' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateStoryletIntegrity = (storylet: StoryletFormData, allStorylets: StoryletFormData[]): StoryletValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check for duplicate titles
  const duplicateTitle = allStorylets.find(s => 
    s.id !== storylet.id && s.title.toLowerCase() === storylet.title.toLowerCase()
  );
  if (duplicateTitle) {
    warnings.push({ 
      field: 'title', 
      message: `Another storylet with title "${storylet.title}" already exists` 
    });
  }

  // Check prerequisite references
  storylet.prerequisites?.forEach(prereqId => {
    const prereqExists = allStorylets.find(s => s.id === prereqId);
    if (!prereqExists) {
      errors.push({
        field: 'prerequisites',
        message: `Prerequisite storylet "${prereqId}" not found`
      });
    }
  });

  // Check for circular dependencies
  const checkCircularDependency = (current: StoryletFormData, visited: Set<string>): boolean => {
    if (visited.has(current.id!)) return true;
    visited.add(current.id!);
    
    return current.prerequisites?.some(prereqId => {
      const prereq = allStorylets.find(s => s.id === prereqId);
      return prereq && checkCircularDependency(prereq, new Set(visited));
    }) || false;
  };

  if (checkCircularDependency(storylet, new Set())) {
    errors.push({
      field: 'prerequisites',
      message: 'Circular dependency detected in prerequisites'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};