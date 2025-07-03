import React, { useEffect, useRef } from 'react';
import {
  Box,
  List,
  ListItem,
  Avatar,
  Typography,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  Reply,
} from '@mui/icons-material';
import { format, isToday, isYesterday } from 'date-fns';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { Message, DirectMessage } from '../types';

const MessageList: React.FC = () => {
  const { state, editMessage, deleteMessage } = useChat();
  const { state: authState } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = React.useState<Message | DirectMessage | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.directMessages]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, message: Message | DirectMessage) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessage(null);
  };

  const handleEdit = () => {
    if (selectedMessage) {
      // Implement edit functionality
      const newContent = prompt('Edit message:', selectedMessage.content);
      if (newContent && newContent.trim() !== selectedMessage.content) {
        editMessage(selectedMessage.id, newContent.trim());
      }
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedMessage && window.confirm('Are you sure you want to delete this message?')) {
      deleteMessage(selectedMessage.id);
    }
    handleMenuClose();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const getMessages = () => {
    if (state.currentChannel) {
      return state.messages;
    } else if (state.currentDMUser) {
      return state.directMessages;
    }
    return [];
  };

  const isOwnMessage = (message: Message | DirectMessage) => {
    return message.sender_id === authState.user?.id;
  };

  const canEditOrDelete = (message: Message | DirectMessage) => {
    return isOwnMessage(message);
  };

  const messages = getMessages();

  if (messages.length === 0) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          p: 3 
        }}
      >
        <Typography variant="body1" color="text.secondary">
          {state.currentChannel 
            ? `No messages in #${state.currentChannel.name} yet. Start the conversation!`
            : 'No messages yet. Send the first message!'
          }
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, overflow: 'hidden' }}>
      <List sx={{ p: 1, height: '100%', overflow: 'auto' }}>
        {messages.map((message, index) => {
          const showAvatar = index === 0 || 
            messages[index - 1].sender_id !== message.sender_id ||
            (new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime()) > 300000; // 5 minutes

          return (
            <ListItem
              key={message.id}
              sx={{
                alignItems: 'flex-start',
                py: showAvatar ? 1 : 0.5,
                px: 2,
                '&:hover': {
                  bgcolor: 'action.hover',
                  '& .message-actions': {
                    opacity: 1,
                  },
                },
              }}
            >
              <Box sx={{ display: 'flex', width: '100%' }}>
                {/* Avatar */}
                <Box sx={{ mr: 2, width: 40 }}>
                  {showAvatar && (
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {message.sender.full_name?.[0] || message.sender.username[0]}
                    </Avatar>
                  )}
                </Box>

                {/* Message Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {showAvatar && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {message.sender.full_name || message.sender.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatMessageTime(message.created_at)}
                      </Typography>
                      {message.is_edited && (
                        <Chip label="edited" size="small" variant="outlined" />
                      )}
                    </Box>
                  )}
                  
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      bgcolor: isOwnMessage(message) ? 'primary.50' : 'background.paper',
                      borderColor: isOwnMessage(message) ? 'primary.200' : 'divider',
                      maxWidth: '80%',
                      wordBreak: 'break-word',
                    }}
                  >
                    <Typography variant="body2">
                      {message.content}
                    </Typography>
                    
                    {!showAvatar && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {formatMessageTime(message.created_at)}
                        {message.is_edited && ' (edited)'}
                      </Typography>
                    )}
                  </Paper>
                </Box>

                {/* Message Actions */}
                {canEditOrDelete(message) && (
                  <Box className="message-actions" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, message)}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </ListItem>
          );
        })}
        <div ref={messagesEndRef} />
      </List>

      {/* Message Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEdit}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleMenuClose()}>
          <Reply sx={{ mr: 1 }} fontSize="small" />
          Reply
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default MessageList;
