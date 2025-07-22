import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvancedStoryletCreator } from './AdvancedStoryletCreator';

// Mock the stores
vi.mock('../../stores/useNarrativeStore', () => ({
  useNarrativeStore: () => ({
    addStorylet: vi.fn(),
    updateStorylet: vi.fn(),
    getStorylet: vi.fn(),
    arcs: [
      { id: 'arc1', name: 'Test Arc 1' },
      { id: 'arc2', name: 'Test Arc 2' }
    ],
    storylets: [
      { id: 'storylet1', title: 'Test Storylet 1', storyArc: 'arc1' },
      { id: 'storylet2', title: 'Test Storylet 2', storyArc: 'arc2' }
    ]
  })
}));

describe('AdvancedStoryletCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with all required tabs', () => {
    render(<AdvancedStoryletCreator />);
    
    expect(screen.getByText('Create New Storylet')).toBeInTheDocument();
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText(/Triggers/)).toBeInTheDocument();
    expect(screen.getByText(/Choices/)).toBeInTheDocument();
    expect(screen.getByText(/Effects/)).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    render(<AdvancedStoryletCreator />);
    
    // Try to save without filling required fields
    const saveButton = screen.getByText('Create Storylet');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByText('Content is required')).toBeInTheDocument();
    });
  });

  it('allows switching between tabs', async () => {
    const user = userEvent.setup();
    render(<AdvancedStoryletCreator />);
    
    // Switch to Triggers tab
    const triggersTab = screen.getByText(/Triggers/);
    await user.click(triggersTab);
    
    expect(screen.getByText('No triggers defined. Add a trigger to specify when this storylet becomes available.')).toBeInTheDocument();
    
    // Switch to Choices tab
    const choicesTab = screen.getByText(/Choices/);
    await user.click(choicesTab);
    
    expect(screen.getByText('No choices defined. Add at least one choice for player interaction.')).toBeInTheDocument();
  });

  it('allows adding and removing triggers', async () => {
    const user = userEvent.setup();
    render(<AdvancedStoryletCreator />);
    
    // Switch to triggers tab
    const triggersTab = screen.getByText(/Triggers/);
    await user.click(triggersTab);
    
    // Add a trigger
    const addTriggerButton = screen.getByText('Add Trigger');
    await user.click(addTriggerButton);
    
    // Should show trigger form
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Condition')).toBeInTheDocument();
    
    // Remove the trigger
    const removeButton = screen.getByText('Remove');
    await user.click(removeButton);
    
    // Should be back to no triggers
    expect(screen.getByText('No triggers defined. Add a trigger to specify when this storylet becomes available.')).toBeInTheDocument();
  });

  it('allows adding and removing choices', async () => {
    const user = userEvent.setup();
    render(<AdvancedStoryletCreator />);
    
    // Switch to choices tab
    const choicesTab = screen.getByText(/Choices/);
    await user.click(choicesTab);
    
    // Add a choice
    const addChoiceButton = screen.getByText('Add Choice');
    await user.click(addChoiceButton);
    
    // Should show choice form
    expect(screen.getByLabelText('Choice Text')).toBeInTheDocument();
    expect(screen.getByLabelText('Probability %')).toBeInTheDocument();
    
    // Remove the choice
    const removeButton = screen.getByText('Remove Choice');
    await user.click(removeButton);
    
    // Should be back to no choices
    expect(screen.getByText('No choices defined. Add at least one choice for player interaction.')).toBeInTheDocument();
  });

  it('fills form fields correctly', async () => {
    const user = userEvent.setup();
    render(<AdvancedStoryletCreator />);
    
    // Fill basic info
    const titleInput = screen.getByLabelText('Title');
    const descriptionInput = screen.getByLabelText('Description');
    const contentInput = screen.getByLabelText('Content');
    
    await user.type(titleInput, 'Test Storylet');
    await user.type(descriptionInput, 'A test storylet description');
    await user.type(contentInput, 'This is the main content of the test storylet');
    
    expect(titleInput).toHaveValue('Test Storylet');
    expect(descriptionInput).toHaveValue('A test storylet description');
    expect(contentInput).toHaveValue('This is the main content of the test storylet');
  });

  it('shows preview modal when preview button is clicked', async () => {
    const user = userEvent.setup();
    render(<AdvancedStoryletCreator />);
    
    // Fill some basic data
    const titleInput = screen.getByLabelText('Title');
    await user.type(titleInput, 'Preview Test');
    
    // Click preview
    const previewButton = screen.getByText('Preview');
    await user.click(previewButton);
    
    // Should show modal
    expect(screen.getByText('Storylet Preview')).toBeInTheDocument();
    expect(screen.getByText('Preview Test')).toBeInTheDocument();
  });
});