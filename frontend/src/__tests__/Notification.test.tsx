import { render, screen, fireEvent } from '@testing-library/react';
import Notification from '../components/Notification';

describe('Notification', () => {
  const defaultProps = {
    open: true,
    message: 'Test notification',
    onClose: jest.fn(),
    severity: 'info' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the notification message when open', () => {
    render(<Notification {...defaultProps} />);
    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Notification {...defaultProps} open={false} />);
    expect(screen.queryByText('Test notification')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<Notification {...defaultProps} />);
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('renders with different severities', () => {
    const severities = ['success', 'error', 'warning', 'info'] as const;
    
    severities.forEach(severity => {
      const { rerender } = render(
        <Notification {...defaultProps} severity={severity} message={`${severity} message`} />
      );
      
      expect(screen.getByText(`${severity} message`)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass(`MuiAlert-standard${severity.charAt(0).toUpperCase() + severity.slice(1)}`);
      
      rerender(<></>);
    });
  });

  it('closes automatically after autoHideDuration', () => {
    jest.useFakeTimers();
    
    render(
      <Notification
        {...defaultProps}
        autoHideDuration={1000}
      />
    );

    expect(screen.getByText('Test notification')).toBeInTheDocument();
    
    jest.advanceTimersByTime(1000);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
    
    jest.useRealTimers();
  });
});
