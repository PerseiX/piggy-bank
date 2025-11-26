import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button component', () => {
  it('should render with default variant and size', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-slot', 'button');
  });

  it('should render different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    let button = screen.getByRole('button');
    expect(button.className).toContain('bg-primary');

    rerender(<Button variant="destructive">Destructive</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('bg-destructive');

    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('border');

    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('bg-secondary');

    rerender(<Button variant="ghost">Ghost</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('hover:bg-accent');

    rerender(<Button variant="link">Link</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('underline-offset-4');
  });

  it('should render different sizes', () => {
    const { rerender } = render(<Button size="default">Default</Button>);
    let button = screen.getByRole('button');
    expect(button.className).toContain('h-9');

    rerender(<Button size="sm">Small</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('h-8');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('h-10');

    rerender(<Button size="icon">Icon</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('size-9');
  });

  it('should handle onClick events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    
    expect(button).toBeDisabled();
    expect(button.className).toContain('disabled:opacity-50');
    
    // Try to click disabled button
    await user.click(button);
    
    // onClick should not be called
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: /custom/i });
    
    expect(button.className).toContain('custom-class');
  });

  it('should support asChild prop with Slot component', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    
    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveAttribute('data-slot', 'button');
  });

  it('should render with children content', () => {
    render(
      <Button>
        <span>Icon</span>
        Text
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('IconText');
  });

  it('should forward other props', () => {
    render(
      <Button type="submit" aria-label="Submit form" data-testid="submit-btn">
        Submit
      </Button>
    );
    
    const button = screen.getByTestId('submit-btn');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('aria-label', 'Submit form');
  });
});

