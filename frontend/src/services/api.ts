import axios, { AxiosInstance } from 'axios';
import {
  User,
  Team,
  Channel,
  Message,
  DirectMessage,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  CreateTeamRequest,
  CreateChannelRequest,
  SendMessageRequest,
  SendDirectMessageRequest,
  SearchRequest,
  SearchResult,
  UserPresence
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL + '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<User> {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Users
  async getUsers(): Promise<User[]> {
    const response = await this.api.get('/users');
    return response.data;
  }

  async getUser(userId: number): Promise<User> {
    const response = await this.api.get(`/users/${userId}`);
    return response.data;
  }

  async getUserPresence(userId: number): Promise<UserPresence> {
    const response = await this.api.get(`/users/${userId}/presence`);
    return response.data;
  }

  async getOnlineUsers(): Promise<number[]> {
    const response = await this.api.get('/users/online/list');
    return response.data;
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    const response = await this.api.get('/teams');
    return response.data;
  }

  async getTeam(teamId: number): Promise<Team> {
    const response = await this.api.get(`/teams/${teamId}`);
    return response.data;
  }

  async createTeam(teamData: CreateTeamRequest): Promise<Team> {
    const response = await this.api.post('/teams', teamData);
    return response.data;
  }

  async updateTeam(teamId: number, teamData: Partial<CreateTeamRequest>): Promise<Team> {
    const response = await this.api.put(`/teams/${teamId}`, teamData);
    return response.data;
  }

  async getTeamMembers(teamId: number): Promise<User[]> {
    const response = await this.api.get(`/teams/${teamId}/members`);
    return response.data;
  }

  async addTeamMember(teamId: number, userId: number, role: string = 'member'): Promise<void> {
    await this.api.post(`/teams/${teamId}/members/${userId}`, { role });
  }

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    await this.api.delete(`/teams/${teamId}/members/${userId}`);
  }

  // Channels
  async getTeamChannels(teamId: number): Promise<Channel[]> {
    const response = await this.api.get(`/channels/team/${teamId}`);
    return response.data;
  }

  async getChannel(channelId: number): Promise<Channel> {
    const response = await this.api.get(`/channels/${channelId}`);
    return response.data;
  }

  async createChannel(channelData: CreateChannelRequest): Promise<Channel> {
    const response = await this.api.post('/channels', channelData);
    return response.data;
  }

  async updateChannel(channelId: number, channelData: Partial<CreateChannelRequest>): Promise<Channel> {
    const response = await this.api.put(`/channels/${channelId}`, channelData);
    return response.data;
  }

  async joinChannel(channelId: number): Promise<void> {
    await this.api.post(`/channels/${channelId}/join`);
  }

  async leaveChannel(channelId: number): Promise<void> {
    await this.api.post(`/channels/${channelId}/leave`);
  }

  async getChannelMembers(channelId: number): Promise<User[]> {
    const response = await this.api.get(`/channels/${channelId}/members`);
    return response.data;
  }

  async addChannelMember(channelId: number, userId: number): Promise<void> {
    await this.api.post(`/channels/${channelId}/members/${userId}`);
  }

  // Messages
  async sendChannelMessage(message: SendMessageRequest): Promise<Message> {
    const response = await this.api.post('/messages/channel', message);
    return response.data;
  }

  async sendDirectMessage(message: SendDirectMessageRequest): Promise<DirectMessage> {
    const response = await this.api.post('/messages/direct', message);
    return response.data;
  }

  async getChannelMessages(channelId: number, page: number = 1, perPage: number = 50): Promise<Message[]> {
    const response = await this.api.get(`/messages/channel/${channelId}`, {
      params: { page, per_page: perPage }
    });
    return response.data;
  }

  async getDirectMessages(userId: number, page: number = 1, perPage: number = 50): Promise<DirectMessage[]> {
    const response = await this.api.get(`/messages/direct/${userId}`, {
      params: { page, per_page: perPage }
    });
    return response.data;
  }

  async updateMessage(messageId: number, content: string): Promise<Message> {
    const response = await this.api.put(`/messages/${messageId}`, { content });
    return response.data;
  }

  async deleteMessage(messageId: number): Promise<void> {
    await this.api.delete(`/messages/${messageId}`);
  }

  async markDirectMessageRead(messageId: number): Promise<void> {
    await this.api.post(`/messages/direct/${messageId}/mark-read`);
  }

  async searchMessages(searchData: SearchRequest, page: number = 1, perPage: number = 20): Promise<SearchResult> {
    const response = await this.api.post('/messages/search', searchData, {
      params: { page, per_page: perPage }
    });
    return response.data;
  }
}

const apiService = new ApiService();
export default apiService;
