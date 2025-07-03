import io from 'socket.io-client';
import { WebSocketMessage, ChatMessageData, TypingData, UserStatusData } from '../types';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

class WebSocketService {
  private socket: ReturnType<typeof io> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(WS_URL, {
          query: { token },
          transports: ['websocket'],
          autoConnect: false,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('disconnect', (reason: string) => {
          console.log('WebSocket disconnected:', reason);
          this.handleReconnect();
        });

        this.socket.on('connect_error', (error: Error) => {
          console.error('WebSocket connection error:', error);
          this.handleReconnect();
          reject(error);
        });

        this.socket.connect();
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        if (this.socket) {
          this.socket.connect();
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  // Send messages
  sendMessage(message: WebSocketMessage) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('message', message);
    }
  }

  joinChannel(channelId: number) {
    this.sendMessage({
      type: 'join_channel',
      data: { channel_id: channelId }
    });
  }

  leaveChannel(channelId: number) {
    this.sendMessage({
      type: 'leave_channel',
      data: { channel_id: channelId }
    });
  }

  sendTyping(channelId: number, typing: boolean) {
    this.sendMessage({
      type: 'typing',
      data: { channel_id: channelId, typing }
    });
  }

  ping() {
    this.sendMessage({
      type: 'ping',
      data: {}
    });
  }

  // Event listeners
  onMessage(callback: (data: ChatMessageData) => void) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  onDirectMessage(callback: (data: ChatMessageData) => void) {
    if (this.socket) {
      this.socket.on('new_direct_message', callback);
    }
  }

  onTyping(callback: (data: TypingData) => void) {
    if (this.socket) {
      this.socket.on('typing', callback);
    }
  }

  onUserStatus(callback: (data: UserStatusData) => void) {
    if (this.socket) {
      this.socket.on('user_status', callback);
    }
  }

  onPong(callback: () => void) {
    if (this.socket) {
      this.socket.on('pong', callback);
    }
  }

  // Remove event listeners
  offMessage() {
    if (this.socket) {
      this.socket.off('new_message');
    }
  }

  offDirectMessage() {
    if (this.socket) {
      this.socket.off('new_direct_message');
    }
  }

  offTyping() {
    if (this.socket) {
      this.socket.off('typing');
    }
  }

  offUserStatus() {
    if (this.socket) {
      this.socket.off('user_status');
    }
  }

  offPong() {
    if (this.socket) {
      this.socket.off('pong');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

const wsService = new WebSocketService();
export default wsService;
