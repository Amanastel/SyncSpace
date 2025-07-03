import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Custom loading message" />);
    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size={60} />);
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveStyle({ width: '60px', height: '60px' });
  });

  it('renders in backdrop when backdrop prop is true', () => {
    render(<LoadingSpinner backdrop />);
    expect(screen.getByTestId('loading-backdrop')).toBeInTheDocument();
  });

  it('does not render in backdrop by default', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
  });

  it('renders without message when message prop is empty', () => {
    render(<LoadingSpinner message="" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
