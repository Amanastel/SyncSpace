-- Initialize database with sample data
USE syncspace;

-- Insert sample users
INSERT INTO users (username, email, hashed_password, full_name, is_active) VALUES
('admin', 'admin@syncspace.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'System Administrator', true),
('john_doe', 'john@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'John Doe', true),
('jane_smith', 'jane@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Jane Smith', true);

-- Insert sample team
INSERT INTO teams (name, description, is_public, created_by) VALUES
('Development Team', 'Main development team for SyncSpace', true, 1);

-- Insert team members
INSERT INTO team_members (user_id, team_id, role) VALUES
(1, 1, 'admin'),
(2, 1, 'member'),
(3, 1, 'member');

-- Insert sample channels
INSERT INTO channels (name, description, is_private, team_id, created_by) VALUES
('general', 'General discussions', false, 1, 1),
('development', 'Development discussions', false, 1, 1),
('random', 'Random conversations', false, 1, 1);

-- Insert channel members
INSERT INTO channel_members (user_id, channel_id) VALUES
(1, 1), (2, 1), (3, 1),
(1, 2), (2, 2),
(1, 3), (2, 3), (3, 3);

-- Insert sample messages
INSERT INTO messages (content, channel_id, sender_id) VALUES
('Welcome to SyncSpace! 🎉', 1, 1),
('Great to be here!', 1, 2),
('Looking forward to collaborating!', 1, 3),
('Let''s start working on the new features', 2, 1),
('I''ll take care of the frontend', 2, 2),
('I''ll handle the backend APIs', 2, 3);
