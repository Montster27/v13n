/**
 * Input Sanitization and XSS Protection Utilities
 */

// HTML entities for escaping
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
  '=': '&#x3D;'
};

/**
 * Escape HTML characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return String(text);
  }
  
  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize user input for safe storage and display
 */
export function sanitizeInput(input: string, options: SanitizeOptions = {}): string {
  if (typeof input !== 'string') {
    input = String(input);
  }

  const {
    maxLength = 10000,
    allowNewlines = true,
    allowBasicFormatting = false,
    stripScripts = true,
    normalizeWhitespace = true
  } = options;

  let sanitized = input;

  // Remove or escape dangerous scripts
  if (stripScripts) {
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    sanitized = sanitized.replace(/data:text\/html/gi, '');
  }

  // Handle basic formatting if allowed
  if (allowBasicFormatting) {
    // Allow safe HTML tags (whitelist approach)
    const allowedTags = ['b', 'i', 'em', 'strong', 'u', 'br', 'p'];
    const tagRegex = /<\/?(\w+)[^>]*>/g;
    
    sanitized = sanitized.replace(tagRegex, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        return match;
      }
      return escapeHtml(match);
    });
  } else {
    // Escape all HTML
    sanitized = escapeHtml(sanitized);
  }

  // Handle newlines
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  }

  // Normalize whitespace
  if (normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
  }

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }

  return sanitized;
}

export interface SanitizeOptions {
  maxLength?: number;
  allowNewlines?: boolean;
  allowBasicFormatting?: boolean;
  stripScripts?: boolean;
  normalizeWhitespace?: boolean;
}

/**
 * Sanitize storylet content with narrative-specific rules
 */
export function sanitizeStoryletContent(content: string): string {
  return sanitizeInput(content, {
    maxLength: 50000,
    allowNewlines: true,
    allowBasicFormatting: true,
    stripScripts: true,
    normalizeWhitespace: false
  });
}

/**
 * Sanitize user metadata (titles, descriptions, etc.)
 */
export function sanitizeMetadata(text: string): string {
  return sanitizeInput(text, {
    maxLength: 1000,
    allowNewlines: false,
    allowBasicFormatting: false,
    stripScripts: true,
    normalizeWhitespace: true
  });
}

/**
 * Sanitize search queries
 */
export function sanitizeSearchQuery(query: string): string {
  return sanitizeInput(query, {
    maxLength: 200,
    allowNewlines: false,
    allowBasicFormatting: false,
    stripScripts: true,
    normalizeWhitespace: true
  });
}

/**
 * Validate and sanitize JSON data
 */
export function sanitizeJsonData(data: any, maxDepth: number = 10): any {
  if (maxDepth <= 0) {
    return null;
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeInput(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeJsonData(item, maxDepth - 1));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const sanitizedKey = sanitizeInput(key, { maxLength: 100 });
      sanitized[sanitizedKey] = sanitizeJsonData(value, maxDepth - 1);
    }
    return sanitized;
  }

  return String(data);
}

/**
 * Content Security Policy helpers
 */
export const CSP_DIRECTIVES = {
  DEFAULT_SRC: "'self'",
  SCRIPT_SRC: "'self' 'unsafe-inline'", // Vite needs unsafe-inline in dev
  STYLE_SRC: "'self' 'unsafe-inline'",
  IMG_SRC: "'self' data: blob:",
  FONT_SRC: "'self'",
  CONNECT_SRC: "'self'",
  MEDIA_SRC: "'self'",
  OBJECT_SRC: "'none'",
  BASE_URI: "'self'",
  FORM_ACTION: "'self'",
  FRAME_ANCESTORS: "'none'"
};

/**
 * Generate CSP header value
 */
export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, value]) => `${directive.toLowerCase().replace(/_/g, '-')} ${value}`)
    .join('; ');
}

/**
 * Validate file upload safety
 */
export function validateFileUpload(file: File): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('File size exceeds 10MB limit');
  }

  // Check file type
  const allowedTypes = [
    'application/json',
    'text/plain',
    'text/json'
  ];

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  // Check file name
  const fileName = sanitizeInput(file.name, { maxLength: 255 });
  if (fileName !== file.name) {
    errors.push('File name contains invalid characters');
  }

  // Check for dangerous extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  if (dangerousExtensions.includes(extension)) {
    errors.push('File extension is not allowed');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts = new Map<string, number[]>();
  private maxAttempts: number;
  private windowMs: number;
  
  constructor(
    maxAttempts: number = 10,
    windowMs: number = 60000 // 1 minute
  ) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get and clean old attempts
    const userAttempts = this.attempts.get(identifier) || [];
    const recentAttempts = userAttempts.filter(time => time > windowStart);
    
    // Update attempts
    this.attempts.set(identifier, recentAttempts);
    
    // Check if under limit
    return recentAttempts.length < this.maxAttempts;
  }

  recordAttempt(identifier: string): void {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || [];
    userAttempts.push(now);
    this.attempts.set(identifier, userAttempts);
  }

  reset(identifier?: string): void {
    if (identifier) {
      this.attempts.delete(identifier);
    } else {
      this.attempts.clear();
    }
  }
}

/**
 * Global rate limiter instances
 */
const importRateLimiterInstance = new RateLimiter(5, 300000); // 5 imports per 5 minutes
const exportRateLimiterInstance = new RateLimiter(20, 60000); // 20 exports per minute

export const importRateLimiter = importRateLimiterInstance;
export const exportRateLimiter = exportRateLimiterInstance;