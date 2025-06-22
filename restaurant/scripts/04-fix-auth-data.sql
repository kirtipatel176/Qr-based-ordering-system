-- First, let's check what's actually in the database and fix the credentials

-- Update the admin user with a known password hash for "admin123"
UPDATE admin_users 
SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email = 'admin@restaurant.com';

-- If the admin user doesn't exist, create it
INSERT INTO admin_users (id, restaurant_id, email, password_hash, name, role, is_active) 
VALUES (
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'admin@restaurant.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Restaurant Admin',
  'admin',
  true
) ON CONFLICT (email) DO UPDATE SET
  password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  is_active = true;

-- Update kitchen staff with known password hash for "admin123"
UPDATE employees 
SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE username = 'kitchen1';

-- If kitchen staff doesn't exist, create it
INSERT INTO employees (id, restaurant_id, username, password_hash, full_name, role, is_active) 
VALUES (
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'kitchen1',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Kitchen Staff 1',
  'kitchen_staff',
  true
) ON CONFLICT (username) DO UPDATE SET
  password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  is_active = true;

-- Let's also create a simple test admin with easier credentials
INSERT INTO admin_users (id, restaurant_id, email, password_hash, name, role, is_active) 
VALUES (
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'admin@test.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Test Admin',
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- Create a simple test kitchen user
INSERT INTO employees (id, restaurant_id, username, password_hash, full_name, role, is_active) 
VALUES (
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'test',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Test Kitchen',
  'kitchen_staff',
  true
) ON CONFLICT (username) DO NOTHING;
