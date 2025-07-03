import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import {
  Send,
  AttachFile,
  EmojiEmotions,
} from '@mui/icons-material';
import { useChat } from '../contexts/ChatContext';

const MessageInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { state, sendMessage, sendDirectMessage, sendTyping } = useChat();
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Focus input when channel/DM changes
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.currentChannel, state.currentDMUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    const messageContent = message.trim();
    setMessage('');
    
    // Stop typing indicator
    handleStopTyping();

    try {
      if (state.currentChannel) {
        await sendMessage(messageContent);
      } else if (state.currentDMUser) {
        await sendDirectMessage(messageContent, state.currentDMUser);
      }
    } catch (error) {
      // Error is handled by the context
      setMessage(messageContent); // Restore message on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTyping = () => {
    if (!isTyping && state.currentChannel) {
      setIsTyping(true);
      sendTyping(state.currentChannel.id, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  };

  const handleStopTyping = () => {
    if (isTyping && state.currentChannel) {
      setIsTyping(false);
      sendTyping(state.currentChannel.id, false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    if (e.target.value.trim()) {
      handleTyping();
    } else {
      handleStopTyping();
    }
  };

  const getPlaceholder = () => {
    if (state.currentChannel) {
      return `Message #${state.currentChannel.name}`;
    } else if (state.currentDMUser) {
      const user = state.currentTeam?.members.find(member => member.id === state.currentDMUser);
      return `Message ${user?.full_name || user?.username || 'user'}`;
    }
    return 'Type a message...';
  };

  const getCurrentTypingUsers = () => {
    if (!state.currentChannel) return [];
    
    const typingUserIds = state.typingUsers.get(state.currentChannel.id);
    if (!typingUserIds || typingUserIds.size === 0) return [];
    
    return Array.from(typingUserIds).map(userId => {
      const user = state.currentTeam?.members.find(member => member.id === userId);
      return user?.full_name || user?.username || 'Someone';
    });
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const typingUsers = getCurrentTypingUsers();

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <Box sx={{ mb: 1 }}>
          {typingUsers.map((username, index) => (
            <Chip
              key={index}
              label={`${username} is typing...`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mr: 1, animation: 'pulse 1.5s infinite' }}
            />
          ))}
        </Box>
      )}

      {/* Message Input */}
      <Paper 
        component="form" 
        onSubmit={handleSubmit}
        sx={{ 
          p: 1, 
          display: 'flex', 
          alignItems: 'center',
          bgcolor: 'background.default',
          border: 1,
          borderColor: 'divider',
          '&:focus-within': {
            borderColor: 'primary.main',
          },
        }}
      >
        <IconButton size="small" sx={{ mr: 1 }}>
          <AttachFile />
        </IconButton>
        
        <TextField
          ref={inputRef}
          fullWidth
          variant="standard"
          placeholder={getPlaceholder()}
          value={message}
          onChange={handleMessageChange}
          onKeyPress={handleKeyPress}
          onBlur={handleStopTyping}
          multiline
          maxRows={4}
          InputProps={{
            disableUnderline: true,
          }}
          sx={{
            '& .MuiInput-root': {
              fontSize: '0.875rem',
            },
          }}
        />
        
        <IconButton size="small" sx={{ mx: 1 }}>
          <EmojiEmotions />
        </IconButton>
        
        <IconButton 
          type="submit" 
          size="small" 
          color="primary"
          disabled={!message.trim()}
          sx={{ 
            bgcolor: message.trim() ? 'primary.main' : 'transparent',
            color: message.trim() ? 'white' : 'action.disabled',
            '&:hover': {
              bgcolor: message.trim() ? 'primary.dark' : 'transparent',
            },
          }}
        >
          <Send />
        </IconButton>
      </Paper>
    </Box>
  );
};

export default MessageInput;
