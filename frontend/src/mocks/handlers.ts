import { rest } from 'msw';

export const handlers = [
  // Auth endpoints
  rest.post('/api/auth/login', async () => {
    return new Response(
      JSON.stringify({
        access_token: 'mock_token',
        token_type: 'bearer',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          full_name: 'Test User',
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }),

  // Teams endpoints
  rest.get('/api/teams', async () => {
    return new Response(
      JSON.stringify([
        {
          id: 1,
          name: 'Test Team',
          description: 'A test team',
          created_at: new Date().toISOString(),
          members: [
            {
              id: 1,
              username: 'testuser',
              email: 'test@example.com',
              full_name: 'Test User',
            },
          ],
        },
      ]),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }),

  // Channels endpoints
  rest.get('/api/channels/team/:teamId', async ({ params }) => {
    // Using type assertion since we know the parameter exists
    const teamId = String(params.teamId);
    return new Response(
      JSON.stringify([
        {
          id: 1,
          name: 'general',
          description: 'General channel',
          team_id: Number(teamId),
          is_private: false,
          created_at: new Date().toISOString(),
        },
      ]),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }),

  // Messages endpoints
  rest.get('/api/messages/channel/:channelId', async ({ params }) => {
    // Using type assertion since we know the parameter exists
    const channelId = String(params.channelId);
    return new Response(
      JSON.stringify({
        items: [
          {
            id: 1,
            content: 'Test message',
            channel_id: Number(channelId),
            user_id: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user: {
              id: 1,
              username: 'testuser',
              full_name: 'Test User',
            },
          },
        ],
        total: 1,
        page: 1,
        size: 50,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }),

  // User presence
  rest.get('/api/users/presence', async () => {
    return new Response(
      JSON.stringify({
        1: 'online',
        2: 'offline',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }),
];
