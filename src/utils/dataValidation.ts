/**
 * Database Validation and Schema Enforcement
 */

import { sanitizeMetadata, sanitizeStoryletContent, sanitizeJsonData } from './sanitization';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedData?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Utility validation functions
 */
function validateRequired(data: any, field: string, type: string = 'string'): string | null {
  if (data[field] === undefined || data[field] === null) {
    return `${field} is required`;
  }

  if (type === 'string' && typeof data[field] !== 'string') {
    return `${field} must be a string`;
  }

  if (type === 'number' && typeof data[field] !== 'number') {
    return `${field} must be a number`;
  }

  if (type === 'array' && !Array.isArray(data[field])) {
    return `${field} must be an array`;
  }

  return null;
}

function validateString(data: any, field: string, minLength: number = 0, maxLength: number = Infinity): string | null {
  const requiredError = validateRequired(data, field, 'string');
  if (requiredError) return requiredError;

  const value = data[field];
  if (value.length < minLength) {
    return `${field} must be at least ${minLength} characters`;
  }

  if (value.length > maxLength) {
    return `${field} must be no more than ${maxLength} characters`;
  }

  return null;
}

function validateEnum(data: any, field: string, allowedValues: string[]): string | null {
  const requiredError = validateRequired(data, field, 'string');
  if (requiredError) return requiredError;

  if (!allowedValues.includes(data[field])) {
    return `${field} must be one of: ${allowedValues.join(', ')}`;
  }

  return null;
}

/**
 * Storylet validator
 */
export function validateStorylet(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!data || typeof data !== 'object') {
    errors.push({ field: 'root', message: 'Data must be an object', code: 'INVALID_TYPE', severity: 'error' });
    return { isValid: false, errors, warnings };
  }

  // Validate required fields
  const titleError = validateString(data, 'title', 1, 200);
  if (titleError) errors.push({ field: 'title', message: titleError, code: 'VALIDATION_ERROR', severity: 'error' });

  const descError = validateString(data, 'description', 1, 500);
  if (descError) errors.push({ field: 'description', message: descError, code: 'VALIDATION_ERROR', severity: 'error' });

  const contentError = validateString(data, 'content', 1, 50000);
  if (contentError) errors.push({ field: 'content', message: contentError, code: 'VALIDATION_ERROR', severity: 'error' });

  const statusError = validateEnum(data, 'status', ['dev', 'stage', 'live']);
  if (statusError) errors.push({ field: 'status', message: statusError, code: 'VALIDATION_ERROR', severity: 'error' });

  // Validate optional fields
  if (data.storyArc !== undefined && typeof data.storyArc !== 'string') {
    errors.push({ field: 'storyArc', message: 'storyArc must be a string', code: 'INVALID_TYPE', severity: 'error' });
  }

  if (data.priority !== undefined && (typeof data.priority !== 'number' || data.priority < 0 || data.priority > 100)) {
    errors.push({ field: 'priority', message: 'priority must be a number between 0 and 100', code: 'INVALID_RANGE', severity: 'error' });
  }

  if (data.estimatedPlayTime !== undefined && (typeof data.estimatedPlayTime !== 'number' || data.estimatedPlayTime < 1)) {
    errors.push({ field: 'estimatedPlayTime', message: 'estimatedPlayTime must be a positive number', code: 'INVALID_RANGE', severity: 'error' });
  }

  // Validate arrays
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push({ field: 'tags', message: 'tags must be an array', code: 'INVALID_TYPE', severity: 'error' });
    } else if (data.tags.some((tag: any) => typeof tag !== 'string')) {
      errors.push({ field: 'tags', message: 'all tags must be strings', code: 'INVALID_TYPE', severity: 'error' });
    }
  }

  if (data.choices !== undefined && !Array.isArray(data.choices)) {
    errors.push({ field: 'choices', message: 'choices must be an array', code: 'INVALID_TYPE', severity: 'error' });
  }

  if (data.effects !== undefined && !Array.isArray(data.effects)) {
    errors.push({ field: 'effects', message: 'effects must be an array', code: 'INVALID_TYPE', severity: 'error' });
  }

  // Add warnings
  if (!data.tags || data.tags.length === 0) {
    warnings.push({ field: 'tags', message: 'Consider adding tags to improve organization' });
  }

  if (!data.choices || data.choices.length === 0) {
    warnings.push({ field: 'choices', message: 'Storylets without choices may be dead ends' });
  }

  // Sanitize data if validation passed
  let sanitizedData;
  if (errors.length === 0) {
    sanitizedData = {
      ...data,
      title: sanitizeMetadata(data.title || ''),
      description: sanitizeMetadata(data.description || ''),
      content: sanitizeStoryletContent(data.content || ''),
      tags: data.tags ? data.tags.map((tag: string) => sanitizeMetadata(tag)) : [],
      choices: data.choices ? sanitizeJsonData(data.choices, 5) : [],
      effects: data.effects ? sanitizeJsonData(data.effects, 5) : [],
      triggers: data.triggers ? sanitizeJsonData(data.triggers, 5) : []
    };
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedData
  };
}

/**
 * Story Arc validator
 */
export function validateArc(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!data || typeof data !== 'object') {
    errors.push({ field: 'root', message: 'Data must be an object', code: 'INVALID_TYPE', severity: 'error' });
    return { isValid: false, errors, warnings };
  }

  // Validate required fields
  const nameError = validateString(data, 'name', 1, 100);
  if (nameError) errors.push({ field: 'name', message: nameError, code: 'VALIDATION_ERROR', severity: 'error' });

  const descError = validateString(data, 'description', 1, 1000);
  if (descError) errors.push({ field: 'description', message: descError, code: 'VALIDATION_ERROR', severity: 'error' });

  // Validate optional fields
  if (data.estimatedLength !== undefined && (typeof data.estimatedLength !== 'number' || data.estimatedLength < 1)) {
    errors.push({ field: 'estimatedLength', message: 'estimatedLength must be a positive number', code: 'INVALID_RANGE', severity: 'error' });
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push({ field: 'tags', message: 'tags must be an array', code: 'INVALID_TYPE', severity: 'error' });
    } else if (data.tags.some((tag: any) => typeof tag !== 'string')) {
      errors.push({ field: 'tags', message: 'all tags must be strings', code: 'INVALID_TYPE', severity: 'error' });
    }
  }

  if (data.prerequisites !== undefined) {
    if (!Array.isArray(data.prerequisites)) {
      errors.push({ field: 'prerequisites', message: 'prerequisites must be an array', code: 'INVALID_TYPE', severity: 'error' });
    } else if (data.prerequisites.some((id: any) => typeof id !== 'string')) {
      errors.push({ field: 'prerequisites', message: 'all prerequisite IDs must be strings', code: 'INVALID_TYPE', severity: 'error' });
    }
  }

  // Sanitize data if validation passed
  let sanitizedData;
  if (errors.length === 0) {
    sanitizedData = {
      id: data.id || crypto.randomUUID(),
      name: sanitizeMetadata(data.name || ''),
      description: sanitizeMetadata(data.description || ''),
      estimatedLength: data.estimatedLength || undefined,
      prerequisites: data.prerequisites || [],
      tags: data.tags ? data.tags.map((tag: string) => sanitizeMetadata(tag)) : [],
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedData
  };
}

/**
 * Clue validator
 */
export function validateClue(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!data || typeof data !== 'object') {
    errors.push({ field: 'root', message: 'Data must be an object', code: 'INVALID_TYPE', severity: 'error' });
    return { isValid: false, errors, warnings };
  }

  // Validate required fields
  const nameError = validateString(data, 'name', 1, 100);
  if (nameError) errors.push({ field: 'name', message: nameError, code: 'VALIDATION_ERROR', severity: 'error' });

  const titleError = validateString(data, 'title', 1, 200);
  if (titleError) errors.push({ field: 'title', message: titleError, code: 'VALIDATION_ERROR', severity: 'error' });

  const descError = validateString(data, 'description', 1, 1000);
  if (descError) errors.push({ field: 'description', message: descError, code: 'VALIDATION_ERROR', severity: 'error' });

  // Validate enums
  const categoryError = validateEnum(data, 'category', ['evidence', 'testimony', 'theory', 'fact', 'lead', 'red_herring']);
  if (categoryError) errors.push({ field: 'category', message: categoryError, code: 'VALIDATION_ERROR', severity: 'error' });

  const typeError = validateEnum(data, 'type', ['physical', 'digital', 'social', 'logical', 'temporal']);
  if (typeError) errors.push({ field: 'type', message: typeError, code: 'VALIDATION_ERROR', severity: 'error' });

  const importanceError = validateEnum(data, 'importance', ['critical', 'major', 'minor', 'trivial']);
  if (importanceError) errors.push({ field: 'importance', message: importanceError, code: 'VALIDATION_ERROR', severity: 'error' });

  // Validate arrays
  if (data.prerequisites !== undefined && !Array.isArray(data.prerequisites)) {
    errors.push({ field: 'prerequisites', message: 'prerequisites must be an array', code: 'INVALID_TYPE', severity: 'error' });
  }

  if (data.evidence !== undefined && !Array.isArray(data.evidence)) {
    errors.push({ field: 'evidence', message: 'evidence must be an array', code: 'INVALID_TYPE', severity: 'error' });
  }

  // Sanitize data if validation passed
  let sanitizedData;
  if (errors.length === 0) {
    sanitizedData = {
      ...data,
      name: sanitizeMetadata(data.name || ''),
      title: sanitizeMetadata(data.title || ''),
      description: sanitizeMetadata(data.description || ''),
      fullDescription: data.fullDescription ? sanitizeStoryletContent(data.fullDescription) : undefined,
      prerequisites: data.prerequisites || [],
      evidence: data.evidence ? sanitizeJsonData(data.evidence, 5) : [],
      connections: data.connections ? sanitizeJsonData(data.connections, 5) : []
    };
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedData
  };
}

/**
 * Database write interceptor
 */
export class DatabaseValidator {
  static async validateBeforeWrite(
    type: 'storylet' | 'arc' | 'clue',
    data: any
  ): Promise<ValidationResult> {
    switch (type) {
      case 'storylet':
        return validateStorylet(data);
      case 'arc':
        return validateArc(data);
      case 'clue':
        return validateClue(data);
      default:
        throw new Error(`Unknown validation type: ${type}`);
    }
  }

  static throwIfInvalid(result: ValidationResult): void {
    if (!result.isValid) {
      const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
  }
}