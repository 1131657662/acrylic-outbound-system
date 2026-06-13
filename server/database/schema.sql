CREATE DATABASE IF NOT EXISTS acrylic_scan DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE acrylic_scan;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(64) NOT NULL,
  role ENUM('admin', 'operator') NOT NULL DEFAULT 'operator',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sku_import_batches (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  file_name VARCHAR(255) NOT NULL,
  total_count INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  warning_message TEXT NULL,
  operator VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sku_import_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS inventory (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  roll_code VARCHAR(128) NOT NULL UNIQUE,
  model VARCHAR(128) NOT NULL,
  weight DECIMAL(10,3) NOT NULL,
  product_code VARCHAR(16) NOT NULL,
  status ENUM('available', 'shipped') NOT NULL DEFAULT 'available',
  import_batch_id BIGINT UNSIGNED NULL,
  shipped_order_id BIGINT UNSIGNED NULL,
  shipped_at DATETIME NULL,
  import_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_inventory_product_status (product_code, status),
  KEY idx_inventory_import_batch (import_batch_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(64) NOT NULL UNIQUE,
  customer_name VARCHAR(128) NOT NULL,
  vehicle_no VARCHAR(64) NOT NULL,
  total_planned_qty INT NOT NULL DEFAULT 0,
  total_planned_weight DECIMAL(12,3) NOT NULL DEFAULT 0,
  status ENUM('pending', 'scanning', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  sync_status ENUM('local', 'synced') NOT NULL DEFAULT 'synced',
  locked_by_user VARCHAR(64) NULL,
  locked_by_device VARCHAR(128) NULL,
  locked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  KEY idx_orders_vehicle_no (vehicle_no),
  KEY idx_orders_status (status)
);

CREATE TABLE IF NOT EXISTS order_plans (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_code VARCHAR(16) NOT NULL,
  model VARCHAR(128) NOT NULL,
  planned_qty INT NOT NULL,
  planned_weight DECIMAL(12,3) NOT NULL,
  remark VARCHAR(255) NULL,
  CONSTRAINT fk_order_plans_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  client_item_id VARCHAR(64) NOT NULL UNIQUE,
  order_id BIGINT UNSIGNED NOT NULL,
  order_plan_id BIGINT UNSIGNED NOT NULL,
  product_code VARCHAR(16) NOT NULL,
  model VARCHAR(128) NOT NULL,
  roll_code VARCHAR(128) NOT NULL,
  weight DECIMAL(10,3) NOT NULL,
  operator VARCHAR(64) NOT NULL,
  device_id VARCHAR(128) NULL,
  scan_seq INT NOT NULL,
  scanned_at DATETIME NOT NULL,
  status ENUM('active', 'deleted') NOT NULL DEFAULT 'active',
  synced TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_plan FOREIGN KEY (order_plan_id) REFERENCES order_plans(id),
  UNIQUE KEY uk_order_scan_seq (order_id, scan_seq),
  KEY idx_order_items_product (product_code),
  KEY idx_order_items_status (status),
  KEY idx_order_items_order_roll (order_id, roll_code)
);
