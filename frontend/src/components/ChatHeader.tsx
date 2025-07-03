import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Lock,
  Tag,
  MoreVert,
  Info,
  Settings,
  PersonAdd,
} from '@mui/icons-material';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';

const ChatHeader: React.FC = () => {
  const { state } = useChat();
  const { state: authState } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getCurrentUser = () => {
    if (state.currentDMUser && state.currentTeam) {
      return state.currentTeam.members.find(member => member.id === state.currentDMUser);
    }
    return null;
  };

  const isUserOnline = (userId: number) => {
    return state.onlineUsers.has(userId);
  };

  const getTypingUsers = () => {
    if (!state.currentChannel) return [];
    
    const typingUserIds = state.typingUsers.get(state.currentChannel.id);
    if (!typingUserIds || typingUserIds.size === 0) return [];
    
    return Array.from(typingUserIds)
      .filter(userId => userId !== authState.user?.id)
      .map(userId => {
        const user = state.currentTeam?.members.find(member => member.id === userId);
        return user?.full_name || user?.username || 'Someone';
      });
  };

  const renderTitle = () => {
    if (state.currentChannel) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {state.currentChannel.is_private ? (
            <Lock fontSize="small" />
          ) : (
            <Tag fontSize="small" />
          )}
          <Typography variant="h6" component="h1">
            {state.currentChannel.name}
          </Typography>
          {state.currentChannel.is_private && (
            <Chip label="Private" size="small" color="secondary" />
          )}
        </Box>
      );
    }

    if (state.currentDMUser) {
      const user = getCurrentUser();
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="h1">
            {user?.full_name || user?.username || 'Direct Message'}
          </Typography>
          {user && (
            <Chip 
              label={isUserOnline(user.id) ? 'Online' : 'Offline'}
              size="small"
              color={isUserOnline(user.id) ? 'success' : 'default'}
              variant="outlined"
            />
          )}
        </Box>
      );
    }

    return null;
  };

  const renderSubtitle = () => {
    if (state.currentChannel) {
      const typingUsers = getTypingUsers();
      
      if (typingUsers.length > 0) {
        const typingText = typingUsers.length === 1 
          ? `${typingUsers[0]} is typing...`
          : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`;
        
        return (
          <Typography variant="body2" color="primary" sx={{ fontStyle: 'italic' }}>
            {typingText}
          </Typography>
        );
      }

      if (state.currentChannel.description) {
        return (
          <Typography variant="body2" color="text.secondary">
            {state.currentChannel.description}
          </Typography>
        );
      }

      return (
        <Typography variant="body2" color="text.secondary">
          {state.currentChannel.members.length} member{state.currentChannel.members.length !== 1 ? 's' : ''}
        </Typography>
      );
    }

    return null;
  };

  return (
    <Box
      sx={{
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 72,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {renderTitle()}
        {renderSubtitle()}
      </Box>

      <IconButton
        onClick={handleMenuOpen}
        size="small"
        sx={{ ml: 1 }}
      >
        <MoreVert />
      </IconButton>

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
        <MenuItem onClick={handleMenuClose}>
          <Info sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        {state.currentChannel && !state.currentChannel.is_private && (
          <MenuItem onClick={handleMenuClose}>
            <PersonAdd sx={{ mr: 1 }} fontSize="small" />
            Add People
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose}>
          <Settings sx={{ mr: 1 }} fontSize="small" />
          Settings
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ChatHeader;
