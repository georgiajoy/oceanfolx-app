-- Seed data for levels and skills
-- Insert levels first
INSERT INTO levels (name_en, name_id, description_en, description_id, order_number) VALUES
('Level 1', 'Tingkat 1', 'Basic swimming and water safety skills', 'Keterampilan dasar berenang dan keselamatan air', 1),
('Level 2', 'Tingkat 2', 'Intermediate swimming and surfing skills', 'Keterampilan berenang dan selancar menengah', 2),
('Level 3', 'Tingkat 3', 'Advanced surfing and ocean safety skills', 'Keterampilan selancar dan keselamatan laut lanjutan', 3);

-- Insert skills for Level 1
INSERT INTO skills (level_id, name_en, name_id, description_en, description_id, order_number, video_url) VALUES
((SELECT id FROM levels WHERE order_number = 1), 'Water Entry', 'Masuk Air', 'Safe entry into the water', 'Masuk air dengan aman', 1, 'https://example.com/water-entry'),
((SELECT id FROM levels WHERE order_number = 1), 'Floating', 'Mengapung', 'Basic floating techniques', 'Teknik mengapung dasar', 2, 'https://example.com/floating'),
((SELECT id FROM levels WHERE order_number = 1), 'Basic Strokes', 'Gaya Dasar', 'Basic swimming strokes', 'Gaya berenang dasar', 3, 'https://example.com/basic-strokes'),
((SELECT id FROM levels WHERE order_number = 1), 'Water Safety', 'Keselamatan Air', 'Basic water safety rules', 'Aturan keselamatan air dasar', 4, 'https://example.com/water-safety');

-- Insert skills for Level 2
INSERT INTO skills (level_id, name_en, name_id, description_en, description_id, order_number, video_url) VALUES
((SELECT id FROM levels WHERE order_number = 2), 'Wave Riding', 'Menunggang Gelombang', 'Basic wave riding techniques', 'Teknik menunggang gelombang dasar', 1, 'https://example.com/wave-riding'),
((SELECT id FROM levels WHERE order_number = 2), 'Paddle Technique', 'Teknik Mendayung', 'Proper paddling form', 'Bentuk mendayung yang benar', 2, 'https://example.com/paddle-technique'),
((SELECT id FROM levels WHERE order_number = 2), 'Pop Up', 'Bangun Berdiri', 'Standing up on the board', 'Berdiri di atas papan', 3, 'https://example.com/pop-up'),
((SELECT id FROM levels WHERE order_number = 2), 'Ocean Awareness', 'Kesadaran Laut', 'Understanding ocean conditions', 'Memahami kondisi laut', 4, 'https://example.com/ocean-awareness');

-- Insert skills for Level 3
INSERT INTO skills (level_id, name_en, name_id, description_en, description_id, order_number, video_url) VALUES
((SELECT id FROM levels WHERE order_number = 3), 'Advanced Turns', 'Belokan Lanjutan', 'Advanced turning techniques', 'Teknik belokan lanjutan', 1, 'https://example.com/advanced-turns'),
((SELECT id FROM levels WHERE order_number = 3), 'Wave Selection', 'Pemilihan Gelombang', 'Choosing the right waves', 'Memilih gelombang yang tepat', 2, 'https://example.com/wave-selection'),
((SELECT id FROM levels WHERE order_number = 3), 'Rescue Techniques', 'Teknik Penyelamatan', 'Water rescue skills', 'Keterampilan penyelamatan air', 3, 'https://example.com/rescue-techniques'),
((SELECT id FROM levels WHERE order_number = 3), 'Competition Skills', 'Keterampilan Kompetisi', 'Advanced competitive surfing', 'Selancar kompetitif lanjutan', 4, 'https://example.com/competition-skills');