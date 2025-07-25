/**
 * Security Configuration and CSP Setup
 */

import { generateCSPHeader } from './sanitization';

/**
 * Configure Content Security Policy
 */
export function setupCSP(): void {
  // Only set CSP in production or if explicitly requested
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_CSP === 'true') {
    const cspHeader = generateCSPHeader();
    
    // Create meta tag for CSP
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = cspHeader;
    
    // Add to head if not already present
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      document.head.appendChild(meta);
    }
    
    console.log('CSP configured:', cspHeader);
  }
}

/**
 * Remove dangerous event handlers from elements
 */
export function sanitizeEventHandlers(element: Element): void {
  // List of dangerous event handler attributes
  const dangerousAttributes = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
    'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
    'onsubmit', 'onreset', 'onchange', 'onselect', 'onresize',
    'onscroll', 'onunload', 'onbeforeunload'
  ];

  dangerousAttributes.forEach(attr => {
    if (element.hasAttribute(attr)) {
      element.removeAttribute(attr);
    }
  });

  // Recursively sanitize child elements
  Array.from(element.children).forEach(child => {
    sanitizeEventHandlers(child);
  });
}

/**
 * Secure random string generation
 */
export function generateSecureId(length: number = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Session security manager
 */
export class SessionSecurity {
  private static instance: SessionSecurity;
  private sessionId: string;
  private lastActivity: number;
  private readonly TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.sessionId = generateSecureId();
    this.lastActivity = Date.now();
    this.setupActivityMonitoring();
  }

  static getInstance(): SessionSecurity {
    if (!this.instance) {
      this.instance = new SessionSecurity();
    }
    return this.instance;
  }

  private setupActivityMonitoring(): void {
    // Monitor user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const updateActivity = () => {
      this.lastActivity = Date.now();
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check session timeout periodically
    setInterval(() => {
      if (Date.now() - this.lastActivity > this.TIMEOUT_MS) {
        this.handleSessionTimeout();
      }
    }, 60000); // Check every minute
  }

  private handleSessionTimeout(): void {
    console.warn('Session timeout detected');
    // Could trigger logout or data save here
    this.renewSession();
  }

  renewSession(): void {
    this.sessionId = generateSecureId();
    this.lastActivity = Date.now();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  isSessionValid(): boolean {
    return Date.now() - this.lastActivity < this.TIMEOUT_MS;
  }
}

/**
 * DOM sanitization helpers
 */
export class DOMSanitizer {
  private static allowedTags = new Set([
    'div', 'span', 'p', 'br', 'strong', 'em', 'b', 'i', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
    'a', 'img'
  ]);

  private static allowedAttributes = new Set([
    'class', 'id', 'href', 'src', 'alt', 'title', 'target'
  ]);

  static sanitizeElement(element: Element): Element {
    // Remove if not in allowed tags
    if (!this.allowedTags.has(element.tagName.toLowerCase())) {
      return document.createTextNode(element.textContent || '').parentElement!;
    }

    // Remove dangerous attributes
    Array.from(element.attributes).forEach(attr => {
      if (!this.allowedAttributes.has(attr.name.toLowerCase())) {
        element.removeAttribute(attr.name);
      }
    });

    // Sanitize href attributes
    if (element.hasAttribute('href')) {
      const href = element.getAttribute('href')!;
      if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('#')) {
        element.removeAttribute('href');
      }
    }

    // Recursively sanitize children
    Array.from(element.children).forEach(child => {
      this.sanitizeElement(child);
    });

    return element;
  }

  static sanitizeHTML(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Sanitize all elements
    Array.from(doc.body.children).forEach(child => {
      this.sanitizeElement(child);
    });

    return doc.body.innerHTML;
  }
}

/**
 * Initialize security measures
 */
export function initializeSecurity(): void {
  // Setup CSP
  setupCSP();
  
  // Initialize session security
  SessionSecurity.getInstance();
  
  // Add global error handler for security issues
  window.addEventListener('error', (event) => {
    if (event.error?.name === 'SecurityError') {
      console.error('Security error detected:', event.error);
      // Could send to monitoring service
    }
  });

  // Monitor for XSS attempts
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('script') && message.includes('blocked')) {
      console.warn('Potential XSS attempt blocked:', message);
    }
    originalConsoleError.apply(console, args);
  };

  console.log('Security measures initialized');
}

/**
 * Secure event listener manager
 */
export class SecureEventManager {
  private listeners = new Map<string, { element: Element; event: string; handler: EventListener }[]>();

  addListener(
    id: string,
    element: Element,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    // Sanitize the element first
    sanitizeEventHandlers(element);
    
    element.addEventListener(event, handler, options);
    
    if (!this.listeners.has(id)) {
      this.listeners.set(id, []);
    }
    
    this.listeners.get(id)!.push({ element, event, handler });
  }

  removeListeners(id: string): void {
    const listeners = this.listeners.get(id);
    if (listeners) {
      listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      this.listeners.delete(id);
    }
  }

  removeAllListeners(): void {
    for (const id of this.listeners.keys()) {
      this.removeListeners(id);
    }
  }

  getActiveListenerCount(): number {
    let count = 0;
    for (const listeners of this.listeners.values()) {
      count += listeners.length;
    }
    return count;
  }
}

/**
 * Global secure event manager instance
 */
export const secureEventManager = new SecureEventManager();