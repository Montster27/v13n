/**
 * Debug component to test visual editor functionality in isolation
 */

import React, { useEffect } from 'react';
import { VisualStoryletEditor } from './VisualStoryletEditor';
import { useVisualEditorStore } from '../../stores/useVisualEditorStore';
import { useNarrativeStore } from '../../stores/useNarrativeStore';

export const VisualEditorDebug: React.FC = () => {
  const { nodes, connections, clearEditor } = useVisualEditorStore();
  const { storylets, arcs } = useNarrativeStore();

  useEffect(() => {
    console.log('=== Visual Editor Debug Info ===');
    console.log('Storylets:', storylets.length, storylets);
    console.log('Arcs:', arcs.length, arcs);
    console.log('Visual nodes:', nodes.length, nodes);
    console.log('Visual connections:', connections.length, connections);
    console.log('================================');
  }, [storylets, arcs, nodes, connections]);

  const handleCreateTestData = () => {
    console.log('Creating test storylets...');
    // This would create test data for debugging
  };

  const handleClearEditor = () => {
    console.log('Clearing visual editor...');
    clearEditor();
  };

  return (
    <div className="p-4">
      <div className="mb-4 bg-base-200 p-4 rounded">
        <h3 className="text-lg font-bold mb-2">Visual Editor Debug</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <strong>Storylets:</strong> {storylets.length}
          </div>
          <div>
            <strong>Arcs:</strong> {arcs.length}
          </div>
          <div>
            <strong>Visual Nodes:</strong> {nodes.length}
          </div>
          <div>
            <strong>Connections:</strong> {connections.length}
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={handleCreateTestData} className="btn btn-sm btn-primary">
            Create Test Data
          </button>
          <button onClick={handleClearEditor} className="btn btn-sm btn-warning">
            Clear Editor
          </button>
        </div>
      </div>

      <div className="border border-base-300 rounded">
        <VisualStoryletEditor />
      </div>
    </div>
  );
};