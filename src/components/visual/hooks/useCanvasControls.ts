import { useCallback, useEffect } from 'react';
import { useVisualEditorStore } from '../../../stores/useVisualEditorStore';

/**
 * Custom hook for handling canvas interactions and controls
 */
export const useCanvasControls = () => {
  const {
    scale,
    connecting,
    selectedNode,
    setScale,
    cancelConnecting,
    selectNode,
    selectConnection,
    removeNode,
    getNodeById
  } = useVisualEditorStore();

  const handleCanvasClick = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLDivElement | null>, svgRef: React.RefObject<SVGSVGElement | null>) => {
    if (e.target === canvasRef.current || e.target === svgRef.current) {
      if (connecting) {
        cancelConnecting();
      } else {
        selectNode(undefined);
        selectConnection(undefined);
      }
    }
  }, [connecting, cancelConnecting, selectNode, selectConnection]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLDivElement | null>, setMousePosition: (pos: { x: number; y: number }) => void) => {
    if (connecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const { offset } = useVisualEditorStore.getState();
      const x = (e.clientX - rect.left) / scale - offset.x;
      const y = (e.clientY - rect.top) / scale - offset.y;
      setMousePosition({ x, y });
    }
  }, [connecting, scale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(scale * delta);
  }, [scale, setScale]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNode) {
      const node = getNodeById(selectedNode);
      if (node && window.confirm(`Delete node "${node.data.title}"?`)) {
        removeNode(selectedNode);
      }
    }
  }, [selectedNode, removeNode, getNodeById]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDeleteSelected();
    } else if (e.key === 'Escape') {
      if (connecting) {
        cancelConnecting();
      } else {
        selectNode(undefined);
        selectConnection(undefined);
      }
    }
  }, [handleDeleteSelected, connecting, cancelConnecting, selectNode, selectConnection]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return {
    handleCanvasClick,
    handleCanvasMouseMove,
    handleWheel,
    handleDeleteSelected,
    handleKeyPress
  };
};
