/*
  # Add Gear Tracking System

  ## Overview
  This migration creates a comprehensive gear tracking system for managing donated equipment
  from sponsors (e.g., RipCurl rashguards) and tracking which participants receive gear items.

  ## New Tables

  ### 1. `gear_types`
  Defines types of gear with sponsor information
  - `id` (uuid, primary key)
  - `name` (text) - Type of gear (e.g., "Rashguard", "Swim Cap")
  - `sponsor_name` (text) - Name of sponsoring organization
  - `description` (text, optional) - Additional details about the gear
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `gear_inventory`
  Tracks individual inventory items with sizes and quantities
  - `id` (uuid, primary key)
  - `gear_type_id` (uuid, foreign key) - Links to gear_types
  - `size` (text) - Size specification (e.g., "S", "M", "L", "XL", "6", "7")
  - `quantity_total` (integer) - Total quantity received from sponsor
  - `quantity_available` (integer) - Current available quantity
  - `notes` (text, optional) - Additional notes about this inventory item
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `gear_assignments`
  Tracks which participants received which gear items
  - `id` (uuid, primary key)
  - `participant_id` (uuid, foreign key) - Links to participants table
  - `gear_inventory_id` (uuid, foreign key) - Links to gear_inventory
  - `assigned_by_user_id` (uuid, foreign key) - User who made the assignment
  - `assigned_date` (timestamptz) - When the gear was assigned
  - `notes` (text, optional) - Notes about the assignment
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable RLS on all three tables
  - Only admin and volunteer roles can view and manage gear data
  - Separate policies for SELECT, INSERT, UPDATE, and DELETE operations

  ## Important Notes
  - Quantity tracking ensures we don't over-assign gear
  - All assignments are audited with timestamp and assigning user
  - Flexible size field accommodates various sizing systems (text sizes, numeric sizes, etc.)
*/

-- Create gear_types table
CREATE TABLE IF NOT EXISTS gear_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sponsor_name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create gear_inventory table
CREATE TABLE IF NOT EXISTS gear_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_type_id uuid NOT NULL REFERENCES gear_types(id) ON DELETE CASCADE,
  size text NOT NULL,
  quantity_total integer NOT NULL DEFAULT 0,
  quantity_available integer NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT quantity_check CHECK (quantity_available >= 0 AND quantity_available <= quantity_total)
);

-- Create gear_assignments table
CREATE TABLE IF NOT EXISTS gear_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  gear_inventory_id uuid NOT NULL REFERENCES gear_inventory(id) ON DELETE CASCADE,
  assigned_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_date timestamptz DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gear_inventory_gear_type ON gear_inventory(gear_type_id);
CREATE INDEX IF NOT EXISTS idx_gear_assignments_participant ON gear_assignments(participant_id);
CREATE INDEX IF NOT EXISTS idx_gear_assignments_inventory ON gear_assignments(gear_inventory_id);
CREATE INDEX IF NOT EXISTS idx_gear_assignments_assigned_by ON gear_assignments(assigned_by_user_id);

-- Enable RLS on all tables
ALTER TABLE gear_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gear_types

CREATE POLICY "Admin and volunteers can view gear types"
  ON gear_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  );

CREATE POLICY "Admins can insert gear types"
  ON gear_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update gear types"
  ON gear_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete gear types"
  ON gear_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for gear_inventory

CREATE POLICY "Admin and volunteers can view gear inventory"
  ON gear_inventory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  );

CREATE POLICY "Admins can insert gear inventory"
  ON gear_inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update gear inventory"
  ON gear_inventory FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete gear inventory"
  ON gear_inventory FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for gear_assignments

CREATE POLICY "Admin and volunteers can view gear assignments"
  ON gear_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  );

CREATE POLICY "Admin and volunteers can insert gear assignments"
  ON gear_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  );

CREATE POLICY "Admin and volunteers can update gear assignments"
  ON gear_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'volunteer')
    )
  );

CREATE POLICY "Admins can delete gear assignments"
  ON gear_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert sample RipCurl rashguard data
INSERT INTO gear_types (name, sponsor_name, description)
VALUES ('Rashguard', 'RipCurl', 'UV protection rashguard for swim lessons')
ON CONFLICT DO NOTHING;

-- Get the gear_type_id for rashguards to insert inventory
DO $$
DECLARE
  rashguard_id uuid;
BEGIN
  SELECT id INTO rashguard_id FROM gear_types WHERE name = 'Rashguard' AND sponsor_name = 'RipCurl' LIMIT 1;
  
  IF rashguard_id IS NOT NULL THEN
    -- Insert sample inventory for different sizes
    INSERT INTO gear_inventory (gear_type_id, size, quantity_total, quantity_available)
    VALUES 
      (rashguard_id, 'XS', 10, 10),
      (rashguard_id, 'S', 15, 15),
      (rashguard_id, 'M', 20, 20),
      (rashguard_id, 'L', 15, 15),
      (rashguard_id, 'XL', 10, 10)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;