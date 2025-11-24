-- Neon Database Schema SQL
-- Run this in Neon SQL Editor to create all required tables

-- Enable UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE,
  name        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id          serial PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- STATEMENTS (one per upload/imported bank statement)
CREATE TABLE IF NOT EXISTS statements (
  id              serial PRIMARY KEY,
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  bank_name       text,
  account_name    text,
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  source_filename text,
  raw_format      text NOT NULL CHECK (raw_format IN ('pdf','csv','xlsx','xls','other')),
  file_id         uuid,  -- will create FK after user_files table
  note            text
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id              serial PRIMARY KEY,
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  statement_id    int REFERENCES statements(id) ON DELETE CASCADE,
  tx_date         date NOT NULL,
  description     text NOT NULL,
  amount          numeric(12,2) NOT NULL,
  balance         numeric(12,2),
  category_id     int REFERENCES categories(id),
  currency        text DEFAULT 'EUR',
  raw_csv_row     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- FILES (raw uploads: pdf, csv, xls, xlsx, others)
CREATE TABLE IF NOT EXISTS user_files (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  statement_id int REFERENCES statements(id) ON DELETE CASCADE,
  file_name    text NOT NULL,
  mime_type    text NOT NULL,
  extension    text,
  size_bytes   bigint NOT NULL,
  data         bytea,          -- raw file content (can switch to external storage later)
  checksum     text,           -- e.g. sha256
  source       text,           -- 'pdf-upload', 'csv-upload', etc.
  uploaded_at  timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key from statements to user_files (now that user_files exists)
ALTER TABLE statements
  ADD CONSTRAINT fk_statements_file_id 
  FOREIGN KEY (file_id) REFERENCES user_files(id);

-- Useful indices
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions (user_id, tx_date);

CREATE INDEX IF NOT EXISTS idx_transactions_user_category
  ON transactions (user_id, category_id);

CREATE INDEX IF NOT EXISTS idx_user_files_user
  ON user_files (user_id, uploaded_at DESC);
