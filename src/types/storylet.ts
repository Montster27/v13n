// Storylet type definitions following the PLAN.md requirements

export interface StoryletTrigger {
  id: string;
  type: 'resource' | 'relationship' | 'time' | 'clue' | 'storylet_completion' | 'random';
  condition: string;
  value?: number;
  operator?: '>' | '<' | '=' | '>=' | '<=' | '!=';
  description: string;
}

export interface StoryletChoice {
  id: string;
  text: string;
  description?: string;
  requirements?: StoryletTrigger[];
  effects: StoryletEffect[];
  probability?: number;
  unlocked?: boolean;
  nextStoryletId?: string; // Links to the next storylet when this choice is selected
  createNewStorylet?: boolean; // Flag to indicate this choice should create a new storylet
}

export interface StoryletEffect {
  id: string;
  type: 'resource' | 'relationship' | 'clue_discovery' | 'storylet_unlock' | 'arc_progress' | 'time_advance';
  target: string;
  value?: number;
  operator?: '+' | '-' | '=' | '*';
  description: string;
}

export interface StoryletFormData {
  id?: string;
  title: string;
  description: string;
  content: string;
  triggers: StoryletTrigger[];
  choices: StoryletChoice[];
  effects: StoryletEffect[];
  storyArc?: string;
  status: 'dev' | 'stage' | 'live';
  tags: string[];
  priority: number;
  estimatedPlayTime: number;
  prerequisites?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  path?: string;
}

export interface StoryletValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}