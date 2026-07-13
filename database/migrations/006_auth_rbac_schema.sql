-- =============================================
-- AUTHENTICATION & RBAC SCHEMA MIGRATION
-- Version: 006
-- Date: 2026-07-08
-- =============================================

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (role_name, description)
VALUES
    ('Admin', 'Full system access - can manage users, billing, and inventory'),
    ('Billing', 'Access to billing and POS modules only'),
    ('Stock', 'Access to inventory and stock management only')
ON CONFLICT (role_name) DO NOTHING;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    role_id INT REFERENCES roles(role_id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Insert super admin with BCrypt hashed password
-- Password: pharmacyadmin123
-- BCrypt hash with salt rounds = 10
INSERT INTO users (username, password_hash, full_name, role_id, is_active)
VALUES (
    'pharmacy_admin',
    '$2a$10$rZ5P7EQxE0YmQ4xJ5Y7mV.4oP3LvKz1nZN8yX7GQx5K8FmN3Zm8Jq',
    'System Administrator',
    (SELECT role_id FROM roles WHERE role_name = 'Admin'),
    true
)
ON CONFLICT (username) DO NOTHING;

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

-- Add comments
COMMENT ON TABLE roles IS 'User roles for RBAC system';
COMMENT ON TABLE users IS 'System users with authentication credentials';
COMMENT ON TABLE audit_logs IS 'Audit trail for user actions and system events';

-- Grant necessary permissions (adjust as needed for your database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON roles, users, audit_logs TO neondb_owner;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO neondb_owner;

-- Display confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Authentication & RBAC schema created successfully';
    RAISE NOTICE '✅ Super admin created: username=pharmacy_admin, password=pharmacyadmin123';
    RAISE NOTICE '⚠️  IMPORTANT: Change default password after first login!';
END $$;
