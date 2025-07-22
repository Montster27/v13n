import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisualStoryletEditor } from './VisualStoryletEditor';

// Mock the stores
vi.mock('../../stores/useVisualEditorStore', () => ({
  useVisualEditorStore: () => ({
    nodes: [],
    connections: [],
    scale: 1,
    offset: { x: 0, y: 0 },
    mode: 'select',
    connecting: undefined,
    selectedNode: undefined,
    selectedConnection: undefined,
    addNode: vi.fn(),
    removeNode: vi.fn(),
    selectNode: vi.fn(),
    selectConnection: vi.fn(),
    setScale: vi.fn(),
    setOffset: vi.fn(),
    cancelConnecting: vi.fn(),
    clearEditor: vi.fn(),
    autoLayout: vi.fn(),
    getNodeById: vi.fn()
  })
}));

vi.mock('../../stores/useNarrativeStore', () => ({
  useNarrativeStore: () => ({
    storylets: [],
    arcs: [],
    getArc: vi.fn()
  })
}));

describe('VisualStoryletEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders toolbar with node creation buttons', () => {
    render(<VisualStoryletEditor />);
    
    expect(screen.getByText('+ Start')).toBeInTheDocument();
    expect(screen.getByText('+ Storylet')).toBeInTheDocument();
    expect(screen.getByText('+ End')).toBeInTheDocument();
  });

  it('renders toolbar utility buttons', () => {
    render(<VisualStoryletEditor />);
    
    expect(screen.getByText('Auto Layout')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('shows scale information', () => {
    render(<VisualStoryletEditor />);
    
    expect(screen.getByText('Scale:')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows mode information', () => {
    render(<VisualStoryletEditor />);
    
    expect(screen.getByText(/Mode:/)).toBeInTheDocument();
    expect(screen.getByText(/Select/i)).toBeInTheDocument();
  });

  it('shows empty state instructions', () => {
    render(<VisualStoryletEditor />);
    
    expect(screen.getByText('Visual Storylet Editor')).toBeInTheDocument();
    expect(screen.getByText('Start by adding nodes using the toolbar above')).toBeInTheDocument();
  });

  it('shows status info panel', () => {
    render(<VisualStoryletEditor />);
    
    expect(screen.getByText('Nodes: 0')).toBeInTheDocument();
    expect(screen.getByText('Connections: 0')).toBeInTheDocument();
  });

  it('renders save and cancel buttons when callbacks provided', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    
    render(<VisualStoryletEditor onSave={onSave} onCancel={onCancel} />);
    
    expect(screen.getByText('Save Arc')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onSave when save button clicked', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    
    render(<VisualStoryletEditor onSave={onSave} />);
    
    const saveButton = screen.getByText('Save Arc');
    await user.click(saveButton);
    
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    
    render(<VisualStoryletEditor onCancel={onCancel} />);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalledOnce();
  });
});