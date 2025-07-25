import React, { useCallback } from 'react';
import { useVisualEditorStore } from '../../../stores/useVisualEditorStore';
import { useNarrativeStore } from '../../../stores/useNarrativeStore';
import { Select } from '../../forms/Select';

interface VisualEditorToolbarProps {
  onAddStoryletNode: () => void;
  onDeleteSelected: () => void;
  onSaveConnections: () => void;
  onAutoLayout: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  arcId?: string;
  currentArcId?: string;
  onArcChange: (arcId: string) => void;
}

export const VisualEditorToolbar: React.FC<VisualEditorToolbarProps> = ({
  onAddStoryletNode,
  onDeleteSelected,
  onSaveConnections,
  onAutoLayout,
  onSave,
  onCancel,
  arcId,
  currentArcId,
  onArcChange
}) => {
  const { mode, connecting, selectedNode, scale, nodes } = useVisualEditorStore();
  const { arcs } = useNarrativeStore();
  
  const isConnecting = Boolean(connecting);
  
  const handleZoomIn = useCallback(() => {
    const { setScale } = useVisualEditorStore.getState();
    setScale(scale * 1.2);
  }, [scale]);
  
  const handleZoomOut = useCallback(() => {
    const { setScale } = useVisualEditorStore.getState();
    setScale(scale / 1.2);
  }, [scale]);
  
  const handleResetZoom = useCallback(() => {
    const { setScale } = useVisualEditorStore.getState();
    setScale(1);
  }, []);

  return (
    <div className="bg-base-200 border-b p-4">
      {/* Top row - Title, Arc Selector, and main actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            Visual Story Editor
          </h2>
          
          {/* Arc Selector */}
          <div className="min-w-[200px]">
            <Select
              label=""
              value={currentArcId || 'all'}
              onChange={(e) => onArcChange(e.target.value)}
              options={[
                { value: 'all', label: '📚 All Storylets' },
                ...arcs.map(arc => ({ 
                  value: arc.id, 
                  label: `🎭 ${arc.name}` 
                }))
              ]}
              className="select-sm"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          {onSave && (
            <button onClick={onSave} className="btn btn-primary btn-sm">
              💾 Save
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} className="btn btn-outline btn-sm">
              ❌ Cancel
            </button>
          )}
        </div>
      </div>

      {/* Toolbar buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Node creation tools */}
        <div className="flex gap-2">
          <button
            onClick={onAddStoryletNode}
            className="btn btn-sm btn-primary"
            disabled={isConnecting}
            title="Add New Storylet"
          >
            📄 Add Storylet
          </button>
        </div>

        <div className="divider divider-horizontal" />

        {/* Edit tools */}
        <div className="flex gap-2">
          <button
            onClick={onDeleteSelected}
            className="btn btn-sm btn-error btn-outline"
            disabled={!selectedNode || isConnecting}
            title="Delete Selected Node"
          >
            🗑️ Delete
          </button>
          <button
            onClick={onSaveConnections}
            className="btn btn-sm btn-success btn-outline"
            disabled={isConnecting}
            title="Save Connections to Storylets"
          >
            💾 Save Connections
          </button>
          <button
            onClick={onAutoLayout}
            className="btn btn-sm btn-outline"
            disabled={isConnecting || nodes.length === 0}
            title="Auto-arrange Nodes"
          >
            🎯 Auto Layout
          </button>
        </div>

        <div className="divider divider-horizontal" />

        {/* Zoom controls */}
        <div className="flex gap-2">
          <button
            onClick={handleZoomOut}
            className="btn btn-sm btn-outline"
            title="Zoom Out"
          >
            🔍-
          </button>
          <button
            onClick={handleResetZoom}
            className="btn btn-sm btn-outline"
            title="Reset Zoom"
          >
            1:1
          </button>
          <button
            onClick={handleZoomIn}
            className="btn btn-sm btn-outline"
            title="Zoom In"
          >
            🔍+
          </button>
          <span className="text-sm self-center px-2">
            {Math.round(scale * 100)}%
          </span>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex gap-4 mt-2 text-sm">
        <span className="text-base-content/70">
          Mode: {mode}
        </span>
        <span className="text-base-content/70">
          Nodes: {nodes.length}
        </span>
        {isConnecting && (
          <span className="text-warning font-semibold">
            ⚡ Connecting mode - click target node or press ESC
          </span>
        )}
        {selectedNode && (
          <span className="text-info">
            ✓ Node selected - press Delete to remove
          </span>
        )}
      </div>
    </div>
  );
};
