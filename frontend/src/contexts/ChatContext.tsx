import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Team, Channel, Message, DirectMessage, ChatMessageData, TypingData, UserStatusData } from '../types';
import apiService from '../services/api';
import wsService from '../services/websocket';
import { useAuth } from './AuthContext';

interface ChatState {
  teams: Team[];
  currentTeam: Team | null;
  channels: Channel[];
  currentChannel: Channel | null;
  messages: Message[];
  directMessages: DirectMessage[];
  currentDMUser: number | null;
  onlineUsers: Set<number>;
  typingUsers: Map<number, Set<number>>; // channelId -> Set of userIds
  isLoading: boolean;
  error: string | null;
}

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_TEAMS'; payload: Team[] }
  | { type: 'SET_CURRENT_TEAM'; payload: Team | null }
  | { type: 'SET_CHANNELS'; payload: Channel[] }
  | { type: 'SET_CURRENT_CHANNEL'; payload: Channel | null }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: Message }
  | { type: 'DELETE_MESSAGE'; payload: number }
  | { type: 'SET_DIRECT_MESSAGES'; payload: DirectMessage[] }
  | { type: 'ADD_DIRECT_MESSAGE'; payload: DirectMessage }
  | { type: 'SET_CURRENT_DM_USER'; payload: number | null }
  | { type: 'SET_ONLINE_USERS'; payload: number[] }
  | { type: 'UPDATE_USER_STATUS'; payload: { userId: number; status: string } }
  | { type: 'SET_TYPING'; payload: { channelId: number; userId: number; typing: boolean } }
  | { type: 'CLEAR_ERROR' };

const initialState: ChatState = {
  teams: [],
  currentTeam: null,
  channels: [],
  currentChannel: null,
  messages: [],
  directMessages: [],
  currentDMUser: null,
  onlineUsers: new Set(),
  typingUsers: new Map(),
  isLoading: false,
  error: null,
};

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_TEAMS':
      return { ...state, teams: action.payload };
    case 'SET_CURRENT_TEAM':
      return { ...state, currentTeam: action.payload };
    case 'SET_CHANNELS':
      return { ...state, channels: action.payload };
    case 'SET_CURRENT_CHANNEL':
      return { ...state, currentChannel: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [action.payload, ...state.messages] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? action.payload : msg
        ),
      };
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.payload),
      };
    case 'SET_DIRECT_MESSAGES':
      return { ...state, directMessages: action.payload };
    case 'ADD_DIRECT_MESSAGE':
      return { ...state, directMessages: [action.payload, ...state.directMessages] };
    case 'SET_CURRENT_DM_USER':
      return { ...state, currentDMUser: action.payload };
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: new Set(action.payload) };
    case 'UPDATE_USER_STATUS':
      const newOnlineUsers = new Set(state.onlineUsers);
      if (action.payload.status === 'online') {
        newOnlineUsers.add(action.payload.userId);
      } else {
        newOnlineUsers.delete(action.payload.userId);
      }
      return { ...state, onlineUsers: newOnlineUsers };
    case 'SET_TYPING': {
      const newTypingUsers = new Map(state.typingUsers);
      const channelTyping = newTypingUsers.get(action.payload.channelId) || new Set();
      
      if (action.payload.typing) {
        channelTyping.add(action.payload.userId);
      } else {
        channelTyping.delete(action.payload.userId);
      }
      
      if (channelTyping.size > 0) {
        newTypingUsers.set(action.payload.channelId, channelTyping);
      } else {
        newTypingUsers.delete(action.payload.channelId);
      }
      
      return { ...state, typingUsers: newTypingUsers };
    }
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

interface ChatContextType {
  state: ChatState;
  loadTeams: () => Promise<void>;
  selectTeam: (team: Team) => Promise<void>;
  loadChannels: (teamId: number) => Promise<void>;
  selectChannel: (channel: Channel) => Promise<void>;
  loadMessages: (channelId: number) => Promise<void>;
  sendMessage: (content: string, channelId?: number) => Promise<void>;
  sendDirectMessage: (content: string, receiverId: number) => Promise<void>;
  loadDirectMessages: (userId: number) => Promise<void>;
  selectDirectMessageUser: (userId: number) => Promise<void>;
  editMessage: (messageId: number, content: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  joinChannel: (channelId: number) => Promise<void>;
  leaveChannel: (channelId: number) => Promise<void>;
  createChannel: (name: string, description: string, isPrivate: boolean, teamId: number) => Promise<void>;
  sendTyping: (channelId: number, typing: boolean) => void;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { state: authState } = useAuth();

  useEffect(() => {
    if (authState.isAuthenticated) {
      setupWebSocketListeners();
      loadInitialData();
    }

    return () => {
      cleanupWebSocketListeners();
    };
  }, [authState.isAuthenticated]);

  const setupWebSocketListeners = () => {
    wsService.onMessage((data: ChatMessageData) => {
      const message: Message = {
        id: data.message_id,
        content: data.content,
        sender: data.sender,
        channel_id: data.channel_id,
        sender_id: data.sender.id,
        message_type: data.message_type,
        created_at: data.created_at,
        is_edited: false,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    });

    wsService.onDirectMessage((data: ChatMessageData) => {
      const directMessage: DirectMessage = {
        id: data.message_id,
        content: data.content,
        sender: data.sender,
        receiver: data.sender, // This should be updated based on your backend
        sender_id: data.sender.id,
        receiver_id: data.receiver_id || 0,
        message_type: data.message_type,
        created_at: data.created_at,
        is_read: false,
        is_edited: false,
      };
      dispatch({ type: 'ADD_DIRECT_MESSAGE', payload: directMessage });
    });

    wsService.onTyping((data: TypingData) => {
      if (data.channel_id) {
        dispatch({
          type: 'SET_TYPING',
          payload: {
            channelId: data.channel_id,
            userId: data.user_id,
            typing: data.typing,
          },
        });
      }
    });

    wsService.onUserStatus((data: UserStatusData) => {
      dispatch({
        type: 'UPDATE_USER_STATUS',
        payload: {
          userId: data.user_id,
          status: data.status,
        },
      });
    });
  };

  const cleanupWebSocketListeners = () => {
    wsService.offMessage();
    wsService.offDirectMessage();
    wsService.offTyping();
    wsService.offUserStatus();
  };

  const loadInitialData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await loadTeams();
      const onlineUsers = await apiService.getOnlineUsers();
      dispatch({ type: 'SET_ONLINE_USERS', payload: onlineUsers });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load initial data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadTeams = async () => {
    try {
      const teams = await apiService.getTeams();
      dispatch({ type: 'SET_TEAMS', payload: teams });
      
      // Auto-select first team if available
      if (teams.length > 0 && !state.currentTeam) {
        await selectTeam(teams[0]);
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load teams' });
    }
  };

  const selectTeam = async (team: Team) => {
    try {
      dispatch({ type: 'SET_CURRENT_TEAM', payload: team });
      await loadChannels(team.id);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to select team' });
    }
  };

  const loadChannels = async (teamId: number) => {
    try {
      const channels = await apiService.getTeamChannels(teamId);
      dispatch({ type: 'SET_CHANNELS', payload: channels });
      
      // Auto-select first channel if available
      if (channels.length > 0 && !state.currentChannel) {
        await selectChannel(channels[0]);
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load channels' });
    }
  };

  const selectChannel = async (channel: Channel) => {
    try {
      // Leave previous channel
      if (state.currentChannel) {
        wsService.leaveChannel(state.currentChannel.id);
      }
      
      dispatch({ type: 'SET_CURRENT_CHANNEL', payload: channel });
      dispatch({ type: 'SET_CURRENT_DM_USER', payload: null });
      
      // Join new channel
      wsService.joinChannel(channel.id);
      
      await loadMessages(channel.id);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to select channel' });
    }
  };

  const loadMessages = async (channelId: number) => {
    try {
      const messages = await apiService.getChannelMessages(channelId);
      dispatch({ type: 'SET_MESSAGES', payload: messages.reverse() });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load messages' });
    }
  };

  const sendMessage = async (content: string, channelId?: number) => {
    try {
      const targetChannelId = channelId || state.currentChannel?.id;
      if (!targetChannelId) return;

      await apiService.sendChannelMessage({
        content,
        channel_id: targetChannelId,
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
    }
  };

  const sendDirectMessage = async (content: string, receiverId: number) => {
    try {
      await apiService.sendDirectMessage({
        content,
        receiver_id: receiverId,
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send direct message' });
    }
  };

  const loadDirectMessages = async (userId: number) => {
    try {
      const messages = await apiService.getDirectMessages(userId);
      dispatch({ type: 'SET_DIRECT_MESSAGES', payload: messages.reverse() });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load direct messages' });
    }
  };

  const selectDirectMessageUser = async (userId: number) => {
    try {
      dispatch({ type: 'SET_CURRENT_DM_USER', payload: userId });
      dispatch({ type: 'SET_CURRENT_CHANNEL', payload: null });
      
      // Leave current channel if any
      if (state.currentChannel) {
        wsService.leaveChannel(state.currentChannel.id);
      }
      
      await loadDirectMessages(userId);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to select direct message user' });
    }
  };

  const editMessage = async (messageId: number, content: string) => {
    try {
      const updatedMessage = await apiService.updateMessage(messageId, content);
      dispatch({ type: 'UPDATE_MESSAGE', payload: updatedMessage });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to edit message' });
    }
  };

  const deleteMessage = async (messageId: number) => {
    try {
      await apiService.deleteMessage(messageId);
      dispatch({ type: 'DELETE_MESSAGE', payload: messageId });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete message' });
    }
  };

  const joinChannel = async (channelId: number) => {
    try {
      await apiService.joinChannel(channelId);
      if (state.currentTeam) {
        await loadChannels(state.currentTeam.id);
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to join channel' });
    }
  };

  const leaveChannel = async (channelId: number) => {
    try {
      await apiService.leaveChannel(channelId);
      if (state.currentTeam) {
        await loadChannels(state.currentTeam.id);
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to leave channel' });
    }
  };

  const createChannel = async (name: string, description: string, isPrivate: boolean, teamId: number) => {
    try {
      await apiService.createChannel({
        name,
        description,
        is_private: isPrivate,
        team_id: teamId,
      });
      await loadChannels(teamId);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create channel' });
    }
  };

  const sendTyping = (channelId: number, typing: boolean) => {
    wsService.sendTyping(channelId, typing);
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: ChatContextType = {
    state,
    loadTeams,
    selectTeam,
    loadChannels,
    selectChannel,
    loadMessages,
    sendMessage,
    sendDirectMessage,
    loadDirectMessages,
    selectDirectMessageUser,
    editMessage,
    deleteMessage,
    joinChannel,
    leaveChannel,
    createChannel,
    sendTyping,
    clearError,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
