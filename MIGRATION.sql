-- ============================================
-- CHAT ACTIONS MIGRATION - CHẠY FILE NÀY
-- ============================================
-- Lệnh: mysql -u root -p myphone < MIGRATION.sql
-- ============================================

USE myphone;

-- Thêm cột
ALTER TABLE chat_messages ADD COLUMN edited BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMP NULL;
ALTER TABLE chat_messages ADD COLUMN recalled BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE chat_messages ADD COLUMN recalled_at TIMESTAMP NULL;
ALTER TABLE chat_messages ADD COLUMN deleted_for_admin BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE chat_messages ADD COLUMN deleted_for_customer BOOLEAN DEFAULT FALSE NOT NULL;

-- Thêm index
CREATE INDEX idx_recalled ON chat_messages(recalled);
CREATE INDEX idx_deleted_for_admin ON chat_messages(deleted_for_admin);
CREATE INDEX idx_deleted_for_customer ON chat_messages(deleted_for_customer);

-- Cập nhật data cũ
UPDATE chat_messages 
SET recalled = TRUE, recalled_at = created_at 
WHERE message IN ('Tin nhắn đã thu hồi', 'Tin nhắn đã được thu hồi');

-- Kiểm tra
SELECT COUNT(*) as total, SUM(recalled) as recalled FROM chat_messages;
SELECT '✅ Done!' AS status;
