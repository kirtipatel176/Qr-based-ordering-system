-- Insert sample restaurant
INSERT INTO restaurants (id, name, description, logo_url) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Delicious Bites Restaurant', 'A modern restaurant serving fresh and delicious food with QR-based ordering', '/placeholder.svg?height=100&width=100')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tables
INSERT INTO tables (restaurant_id, table_number, qr_code) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'T001', 'table-t001-qr'),
('550e8400-e29b-41d4-a716-446655440000', 'T002', 'table-t002-qr'),
('550e8400-e29b-41d4-a716-446655440000', 'T003', 'table-t003-qr'),
('550e8400-e29b-41d4-a716-446655440000', 'T004', 'table-t004-qr'),
('550e8400-e29b-41d4-a716-446655440000', 'T005', 'table-t005-qr')
ON CONFLICT (restaurant_id, table_number) DO NOTHING;

-- Insert menu categories
INSERT INTO menu_categories (restaurant_id, name, description, sort_order) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Starters', 'Appetizers and small plates to start your meal', 1),
('550e8400-e29b-41d4-a716-446655440000', 'Main Course', 'Hearty main dishes and entrees', 2),
('550e8400-e29b-41d4-a716-446655440000', 'Beverages', 'Drinks and refreshments', 3),
('550e8400-e29b-41d4-a716-446655440000', 'Desserts', 'Sweet treats to end your meal', 4)
ON CONFLICT DO NOTHING;

-- Insert menu items
INSERT INTO menu_items (restaurant_id, category_id, name, description, price, image_url, is_vegetarian, is_vegan, is_gluten_free, spice_level, customization_options, sort_order) VALUES 
-- Starters
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM menu_categories WHERE name = 'Starters' AND restaurant_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1), 'Caesar Salad', 'Fresh romaine lettuce with parmesan cheese, croutons, and caesar dressing', 12.99, '/placeholder.svg?height=200&width=200', true, false, false, 0, '[{"name": "Extra Cheese", "price": 2.00}, {"name": "No Croutons", "price": 0}]', 1),
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM menu_categories WHERE name = 'Starters' AND restaurant_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1), 'Buffalo Wings', 'Spicy chicken wings served with blue cheese dip and celery sticks', 15.99, '/placeholder.svg?height=200&width=200', false, false, true, 3, '[{"name": "Extra Spicy", "price": 0}, {"name": "Mild Sauce", "price": 0}]', 2),
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM menu_categories WHERE name = 'Starters' AND restaurant_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1), 'Hummus Platter', 'Fresh hummus with vegetables and warm pita bread', 10.99, '/placeholder.svg?height=200&width=200', true, true, true, 0, '[{"name": "Extra Pita", "price": 1.50}]', 3),

-- Main Course
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM menu_categories WHERE name = 'Main Course' AND restaurant_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1), 'Grilled Salmon', 'Fresh Atlantic salmon grilled to perfection with seasonal vegetables', 24.99, '/placeholder.svg?height=200&width=200', false, false, true, 0, '[{"name": "Extra Vegetables", "price": 3.00}, {"name": "Lemon Butter Sauce", "price": 2.00}]', 1),
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM menu_categories WHERE name = 'Main Course' AND restaurant_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1), 'Chicken Tikka Masala', 'Tender chicken pieces in creamy tomato curry sauce served with basmati rice', 19.99, '/placeholder.svg?height=200&width=200', false, false, false, 2, '[{"name": "Extra Spicy", "price": 0}, {"name": "Mild", "price": 0}, {"name": "Extra Rice", "price": 2.50}]', 2),
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM menu_categories WHERE name = 'Main Course' AND restaurant_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1), 'Vegetable Pasta', 'Fresh pasta with seasonal vegetables in garlic olive oil sauce', 16.99, '/placeholder.svg?height=200&width=200', true, true, false, 0, '[{"name": "Extra Vegetables", "price": 2.00}, {"name": "Parmesan Cheese", "price": 1.50}]', 3),

-- Beverages
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM menu_categories WHERE name = 'Beverages' AND restaurant_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1), 'Fresh Orange Juice', 'Freshly squeezed orange juice', 5.99, '/placeholder.svg?height=200&width=200', true, true, true, 0, '[{"name": "Extra Pulp", "price": 0}, {"name": "No Pulp", "price": 0}]', 1),
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM menu_categories WHERE name = 'Beverages' AND restaurant_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1), 'Craft Beer', 'Local craft beer selection', 7.99, '/placeholder.svg?height=200&width=200', true, true, true, 0, '[]', 2),
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM menu_categories WHERE name = 'Beverages' AND restaurant_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1), 'Iced Coffee', 'Cold brew coffee served over ice', 4.99, '/placeholder.svg?height=200&width=200', true, true, true, 0, '[{"name": "Extra Shot", "price": 1.00}, {"name": "Oat Milk", "price": 0.50}]', 3),

-- Desserts
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM menu_categories WHERE name = 'Desserts' AND restaurant_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1), 'Chocolate Cake', 'Rich chocolate cake served with vanilla ice cream', 8.99, '/placeholder.svg?height=200&width=200', true, false, false, 0, '[{"name": "Extra Ice Cream", "price": 2.00}]', 1),
('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM menu_categories WHERE name = 'Desserts' AND restaurant_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1), 'Fruit Sorbet', 'Fresh fruit sorbet - dairy free and refreshing', 6.99, '/placeholder.svg?height=200&width=200', true, true, true, 0, '[{"name": "Mixed Flavors", "price": 1.00}]', 2)
ON CONFLICT DO NOTHING;

-- Insert admin user (password: admin123)
INSERT INTO admin_users (restaurant_id, email, password_hash, name, role) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'admin@deliciousbites.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Restaurant Admin', 'admin')
ON CONFLICT (email) DO NOTHING;
