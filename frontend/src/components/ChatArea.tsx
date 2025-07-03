import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useChat } from '../contexts/ChatContext';
import { useNotification, useOnlineStatus } from '../hooks';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import Notification from './Notification';
import ErrorBoundary from './ErrorBoundary';

const ChatArea: React.FC = () => {
  const { state } = useChat();
  const { showNotification } = useNotification();
  const isOnline = useOnlineStatus();
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info' | 'success';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Show notification helper
  const handleNotification = (message: string, severity: 'error' | 'warning' | 'info' | 'success' = 'info') => {
    setNotification({ open: true, message, severity });
  };

  // Handle notification close
  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  // Show offline warning
  React.useEffect(() => {
    if (!isOnline) {
      handleNotification('You are currently offline. Some features may not work.', 'warning');
    }
  }, [isOnline]);

  // Show welcome message if no channel or DM is selected
  if (!state.currentChannel && !state.currentDMUser) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100%',
          p: 4 
        }}
      >
        <Paper 
          elevation={1} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            maxWidth: 400,
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="h5" gutterBottom color="text.primary">
            Welcome to SyncSpace! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Select a channel from the sidebar to start chatting with your team, 
            or choose a team member to send a direct message.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          bgcolor: 'background.default'
        }}
      >
        <ChatHeader />
        
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <MessageList />
        </Box>
        
        <MessageInput />
        
        <Notification 
          open={notification.open} 
          message={notification.message} 
          severity={notification.severity} 
          onClose={handleNotificationClose} 
        />
      </Box>
    </ErrorBoundary>
  );
};

export default ChatArea;
