import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card Component', () => {
  it('renders with title and children', () => {
    render(
      <Card title="Test Card">
        <p>Card content</p>
      </Card>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders without title', () => {
    render(
      <Card>
        <p>Card content only</p>
      </Card>
    );

    expect(screen.getByText('Card content only')).toBeInTheDocument();
  });

  it('renders with actions', () => {
    render(
      <Card title="Test Card" actions={<button>Click me</button>}>
        <p>Card content</p>
      </Card>
    );

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});