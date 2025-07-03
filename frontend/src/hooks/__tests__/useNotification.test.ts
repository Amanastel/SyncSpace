import { renderHook, act } from '@testing-library/react';
import { useNotification } from '../hooks/useNotification';

interface NotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
}

describe('useNotification', () => {
  const originalNotification = window.Notification;

  beforeEach(() => {
    // Mock Notification API
    const mockNotification = function(title: string, options?: NotificationOptions) {
      return { title, ...options };
    } as any;
    
    mockNotification.permission = 'default';
    mockNotification.requestPermission = jest.fn().mockResolvedValue('granted');
    
    window.Notification = mockNotification;
  });

  afterEach(() => {
    window.Notification = originalNotification;
  });

  it('returns isSupported=false when Notification is not available', () => {
    delete (window as any).Notification;
    const { result } = renderHook(() => useNotification());
    expect(result.current.isSupported).toBe(false);
  });

  it('returns current permission status', () => {
    const mockNotification = function(title: string, options?: NotificationOptions) {
      return { title, ...options };
    } as any;
    mockNotification.permission = 'granted';
    window.Notification = mockNotification;
    
    const { result } = renderHook(() => useNotification());
    expect(result.current.permission).toBe('granted');
  });

  it('can request permission', async () => {
    const { result } = renderHook(() => useNotification());
    
    let permissionResult;
    await act(async () => {
      permissionResult = await result.current.requestPermission();
    });

    expect(permissionResult).toBe(true);
    expect(window.Notification.requestPermission).toHaveBeenCalled();
  });

  it('can show notification when permission is granted', () => {
    const mockNotification = function(title: string, options?: NotificationOptions) {
      return { title, ...options };
    } as any;
    mockNotification.permission = 'granted';
    window.Notification = mockNotification;
    
    const { result } = renderHook(() => useNotification());

    const options = {
      title: 'Test Notification',
      body: 'This is a test notification',
      icon: '/test-icon.png',
    };

    result.current.showNotification(options);

    expect(window.Notification).toHaveBeenCalledWith(
      'Test Notification',
      expect.objectContaining({
        body: 'This is a test notification',
        icon: '/test-icon.png',
      })
    );
  });

  it('does not show notification when permission is denied', () => {
    const mockNotification = function(title: string, options?: NotificationOptions) {
      return { title, ...options };
    } as any;
    mockNotification.permission = 'denied';
    window.Notification = mockNotification;
    
    const { result } = renderHook(() => useNotification());

    const options = {
      title: 'Test Notification',
    };

    result.current.showNotification(options);

    expect(window.Notification).not.toHaveBeenCalled();
  });
});
