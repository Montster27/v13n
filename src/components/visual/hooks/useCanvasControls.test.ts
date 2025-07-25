/**
 * Tests for useCanvasControls hook
 * Verifies that keyboard events are properly handled and don't interfere with input elements
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCanvasControls } from './useCanvasControls';

// Mock the visual editor store
const mockVisualEditorStore = {
  scale: 1,
  connecting: false,
  selectedNode: 'test-node',
  setScale: vi.fn(),
  cancelConnecting: vi.fn(),
  selectNode: vi.fn(),
  selectConnection: vi.fn(),
  removeNode: vi.fn(),
  getNodeById: vi.fn().mockReturnValue({
    data: { title: 'Test Node' }
  })
};

vi.mock('../../../stores/useVisualEditorStore', () => ({
  useVisualEditorStore: () => mockVisualEditorStore
}));

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(() => true)
});

describe('useCanvasControls', () => {
  let addEventListenerSpy: any;
  let removeEventListenerSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe('Keyboard Event Handling', () => {
    it('should add and remove keydown event listener', () => {
      const { unmount } = renderHook(() => useCanvasControls());

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should not prevent default for input elements on Delete/Backspace', () => {
      renderHook(() => useCanvasControls());

      // Get the registered event handler
      const keydownHandler = addEventListenerSpy.mock.calls[0][1];

      // Mock input element
      const inputEvent = new KeyboardEvent('keydown', { key: 'Delete' });
      Object.defineProperty(inputEvent, 'target', {
        value: { tagName: 'INPUT' },
        writable: false
      });
      const preventDefaultSpy = vi.spyOn(inputEvent, 'preventDefault');

      // Trigger the event
      keydownHandler(inputEvent);

      // Should NOT prevent default for input elements
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(mockVisualEditorStore.removeNode).not.toHaveBeenCalled();
    });

    it('should not prevent default for textarea elements on Delete/Backspace', () => {
      renderHook(() => useCanvasControls());

      const keydownHandler = addEventListenerSpy.mock.calls[0][1];

      // Mock textarea element
      const textareaEvent = new KeyboardEvent('keydown', { key: 'Backspace' });
      Object.defineProperty(textareaEvent, 'target', {
        value: { tagName: 'TEXTAREA' },
        writable: false
      });
      const preventDefaultSpy = vi.spyOn(textareaEvent, 'preventDefault');

      keydownHandler(textareaEvent);

      // Should NOT prevent default for textarea elements
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(mockVisualEditorStore.removeNode).not.toHaveBeenCalled();
    });

    it('should not prevent default for contentEditable elements on Delete/Backspace', () => {
      renderHook(() => useCanvasControls());

      const keydownHandler = addEventListenerSpy.mock.calls[0][1];

      // Mock contentEditable element
      const editableEvent = new KeyboardEvent('keydown', { key: 'Delete' });
      Object.defineProperty(editableEvent, 'target', {
        value: { 
          tagName: 'DIV',
          contentEditable: 'true',
          isContentEditable: true 
        },
        writable: false
      });
      const preventDefaultSpy = vi.spyOn(editableEvent, 'preventDefault');

      keydownHandler(editableEvent);

      // Should NOT prevent default for contentEditable elements
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(mockVisualEditorStore.removeNode).not.toHaveBeenCalled();
    });

    it('should prevent default and handle node deletion for non-input elements', () => {
      renderHook(() => useCanvasControls());

      const keydownHandler = addEventListenerSpy.mock.calls[0][1];

      // Mock non-input element (like canvas or div)
      const canvasEvent = new KeyboardEvent('keydown', { key: 'Delete' });
      Object.defineProperty(canvasEvent, 'target', {
        value: { tagName: 'DIV' },
        writable: false
      });
      const preventDefaultSpy = vi.spyOn(canvasEvent, 'preventDefault');

      keydownHandler(canvasEvent);

      // Should prevent default and trigger node deletion for non-input elements
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(window.confirm).toHaveBeenCalledWith('Delete node "Test Node"?');
      expect(mockVisualEditorStore.removeNode).toHaveBeenCalledWith('test-node');
    });

    it('should handle Escape key to cancel connecting mode', () => {
      mockVisualEditorStore.connecting = true;
      renderHook(() => useCanvasControls());

      const keydownHandler = addEventListenerSpy.mock.calls[0][1];

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(escapeEvent, 'target', {
        value: { tagName: 'DIV' },
        writable: false
      });

      keydownHandler(escapeEvent);

      expect(mockVisualEditorStore.cancelConnecting).toHaveBeenCalled();
    });

    it('should handle Escape key to clear selection when not connecting', () => {
      mockVisualEditorStore.connecting = false;
      renderHook(() => useCanvasControls());

      const keydownHandler = addEventListenerSpy.mock.calls[0][1];

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(escapeEvent, 'target', {
        value: { tagName: 'DIV' },
        writable: false
      });

      keydownHandler(escapeEvent);

      expect(mockVisualEditorStore.selectNode).toHaveBeenCalledWith(undefined);
      expect(mockVisualEditorStore.selectConnection).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Canvas Interaction', () => {
    it('should return necessary handlers', () => {
      const { result } = renderHook(() => useCanvasControls());

      expect(result.current).toHaveProperty('handleCanvasClick');
      expect(result.current).toHaveProperty('handleCanvasMouseMove');
      expect(result.current).toHaveProperty('handleWheel');
      expect(result.current).toHaveProperty('handleDeleteSelected');
      expect(result.current).toHaveProperty('handleKeyPress');
    });

    it('should handle canvas click to clear selection', () => {
      const { result } = renderHook(() => useCanvasControls());

      const mockEvent = {
        target: document.createElement('div')
      } as React.MouseEvent;

      const canvasRef = { current: mockEvent.target as HTMLDivElement };
      const svgRef = { current: null };

      result.current.handleCanvasClick(mockEvent, canvasRef, svgRef);

      expect(mockVisualEditorStore.selectNode).toHaveBeenCalledWith(undefined);
      expect(mockVisualEditorStore.selectConnection).toHaveBeenCalledWith(undefined);
    });

    it('should handle wheel events for zooming', () => {
      const { result } = renderHook(() => useCanvasControls());

      const mockWheelEvent = {
        preventDefault: vi.fn(),
        deltaY: 100
      } as unknown as React.WheelEvent;

      result.current.handleWheel(mockWheelEvent);

      expect(mockWheelEvent.preventDefault).toHaveBeenCalled();
      expect(mockVisualEditorStore.setScale).toHaveBeenCalledWith(0.9); // zoom out
    });
  });
});