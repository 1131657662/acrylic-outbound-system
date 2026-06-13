USE acrylic_scan;

-- Default password: Admin@123456
INSERT INTO users (username, password, name, role)
VALUES (
  'admin',
  '$2a$10$uyU8B8DXgc/lnMmOjlWfte2Hxv66etCKllleWH/oRK.ddljVBgL96',
  'System Admin',
  'admin'
)
ON DUPLICATE KEY UPDATE username = username;
