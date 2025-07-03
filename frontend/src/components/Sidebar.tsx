import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Collapse,
  Badge,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Tag,
  Lock,
  Add,
  ExpandLess,
  ExpandMore,
  Person,
  Group,
} from '@mui/icons-material';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 280;

const Sidebar: React.FC = () => {
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [directMessagesOpen, setDirectMessagesOpen] = useState(true);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  
  const { state: chatState, selectChannel, selectDirectMessageUser, createChannel } = useChat();
  const { state: authState } = useAuth();

  const handleChannelClick = (channel: any) => {
    selectChannel(channel);
  };

  const handleDirectMessageClick = (user: any) => {
    selectDirectMessageUser(user.id);
  };

  const handleCreateChannel = async () => {
    if (channelName.trim() && chatState.currentTeam) {
      await createChannel(channelName.trim(), channelDescription.trim(), isPrivate, chatState.currentTeam.id);
      setCreateChannelOpen(false);
      setChannelName('');
      setChannelDescription('');
      setIsPrivate(false);
    }
  };

  const handleCloseCreateChannel = () => {
    setCreateChannelOpen(false);
    setChannelName('');
    setChannelDescription('');
    setIsPrivate(false);
  };

  const isUserOnline = (userId: number) => {
    return chatState.onlineUsers.has(userId);
  };

  // Get unique users for direct messages (from team members)
  const getDirectMessageUsers = () => {
    if (!chatState.currentTeam) return [];
    
    return chatState.currentTeam.members.filter(
      member => member.id !== authState.user?.id
    );
  };

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            top: 64, // Account for AppBar height
            height: 'calc(100% - 64px)',
          },
        }}
      >
        <Box sx={{ overflow: 'auto', p: 1 }}>
          {/* Channels Section */}
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setChannelsOpen(!channelsOpen)}>
                <ListItemIcon>
                  {channelsOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography variant="subtitle2" fontWeight="bold">
                      Channels
                    </Typography>
                  } 
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateChannelOpen(true);
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>
            
            <Collapse in={channelsOpen} timeout="auto" unmountOnExit>
              {chatState.channels.map((channel) => (
                <ListItem key={channel.id} disablePadding sx={{ pl: 2 }}>
                  <ListItemButton
                    selected={chatState.currentChannel?.id === channel.id}
                    onClick={() => handleChannelClick(channel)}
                  >
                    <ListItemIcon>
                      {channel.is_private ? <Lock fontSize="small" /> : <Tag fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText 
                      primary={channel.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        noWrap: true,
                      }}
                    />
                    {chatState.typingUsers.has(channel.id) && (
                      <Chip 
                        label="typing..." 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </Collapse>
          </List>

          {/* Direct Messages Section */}
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setDirectMessagesOpen(!directMessagesOpen)}>
                <ListItemIcon>
                  {directMessagesOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography variant="subtitle2" fontWeight="bold">
                      Direct Messages
                    </Typography>
                  } 
                />
              </ListItemButton>
            </ListItem>
            
            <Collapse in={directMessagesOpen} timeout="auto" unmountOnExit>
              {getDirectMessageUsers().map((user) => (
                <ListItem key={user.id} disablePadding sx={{ pl: 2 }}>
                  <ListItemButton
                    selected={chatState.currentDMUser === user.id}
                    onClick={() => handleDirectMessageClick(user)}
                  >
                    <ListItemIcon>
                      <Badge
                        color={isUserOnline(user.id) ? 'success' : 'default'}
                        variant="dot"
                        invisible={!isUserOnline(user.id)}
                      >
                        <Person fontSize="small" />
                      </Badge>
                    </ListItemIcon>
                    <ListItemText 
                      primary={user.full_name || user.username}
                      secondary={isUserOnline(user.id) ? 'Online' : 'Offline'}
                      primaryTypographyProps={{
                        variant: 'body2',
                        noWrap: true,
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        color: isUserOnline(user.id) ? 'success.main' : 'text.disabled',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </Collapse>
          </List>

          {/* Team Members Count */}
          {chatState.currentTeam && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', mt: 'auto' }}>
              <Typography variant="caption" color="text.secondary">
                <Group fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                {chatState.currentTeam.members.length} member(s)
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Create Channel Dialog */}
      <Dialog 
        open={createChannelOpen} 
        onClose={handleCloseCreateChannel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Channel</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Channel Name"
            fullWidth
            variant="outlined"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={channelDescription}
            onChange={(e) => setChannelDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
            }
            label="Private Channel"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateChannel}>Cancel</Button>
          <Button 
            onClick={handleCreateChannel}
            disabled={!channelName.trim()}
            variant="contained"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Sidebar;
