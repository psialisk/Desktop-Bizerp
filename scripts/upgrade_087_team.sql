-- Additive Desktop upgrade from calendar schema; preserves all existing business rows.

-- 088_new_tenant_starter_team.sql
-- Additive only: no account or employee backfill.
ALTER TYPE employees_status_enum ADD VALUE IF NOT EXISTS 'draft';
BEGIN;
CREATE TABLE IF NOT EXISTS tenant_starter_teams (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id), request_id uuid NOT NULL UNIQUE,
 request_fingerprint varchar(64) NOT NULL,
 prefix varchar(80) NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tenant_starter_accounts (
 user_id uuid PRIMARY KEY REFERENCES users(id), tenant_id uuid NOT NULL REFERENCES tenant_starter_teams(tenant_id),
 employee_id uuid UNIQUE REFERENCES employees(id), position varchar(100) NOT NULL,
 assigned boolean NOT NULL DEFAULT false, must_change_password boolean NOT NULL DEFAULT true,
 assigned_by uuid REFERENCES users(id), assigned_at timestamptz,
 CHECK(position<>'Owner' OR (employee_id IS NULL AND assigned AND NOT must_change_password))
);
CREATE INDEX IF NOT EXISTS tenant_starter_accounts_tenant ON tenant_starter_accounts(tenant_id);
COMMIT;


-- 089_desktop_local_activation.sql
-- Separate Desktop allowance/key/installation scope; no existing device or tenant backfill.
BEGIN;
CREATE TABLE IF NOT EXISTS desktop_local_policies (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id), device_limit integer NOT NULL DEFAULT 1 CHECK(device_limit BETWEEN 1 AND 30), offline_days integer NOT NULL DEFAULT 7 CHECK(offline_days BETWEEN 1 AND 30)
);
CREATE TABLE IF NOT EXISTS desktop_local_enrollment_keys (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),owner_id uuid NOT NULL REFERENCES users(id),email varchar(190) NOT NULL,
 key_digest char(64) NOT NULL UNIQUE,key_prefix varchar(16) NOT NULL,key_suffix varchar(8) NOT NULL,
 expires_at timestamptz NOT NULL,used_at timestamptz,revoked_at timestamptz,issued_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS desktop_local_installations (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),owner_id uuid NOT NULL REFERENCES users(id),email varchar(190) NOT NULL,
 enrollment_key_id uuid NOT NULL UNIQUE REFERENCES desktop_local_enrollment_keys(id),installation_id uuid NOT NULL UNIQUE,request_id uuid NOT NULL UNIQUE,
 public_key text NOT NULL,public_fingerprint char(64) NOT NULL UNIQUE,credential_version integer NOT NULL,
 status varchar(12) NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','active','revoked')),revision integer NOT NULL DEFAULT 1,
 signed_grant text NOT NULL,grant_expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),activated_at timestamptz,last_seen_at timestamptz,revoked_at timestamptz,revoke_reason varchar(500)
);
CREATE INDEX IF NOT EXISTS desktop_local_tenant_status ON desktop_local_installations(tenant_id,status);
COMMIT;

BEGIN;
ALTER TABLE desktop_local_policies ADD COLUMN IF NOT EXISTS key_type varchar(12) NOT NULL DEFAULT 'temporary';
ALTER TABLE desktop_local_policies ALTER COLUMN offline_days DROP NOT NULL;
ALTER TABLE desktop_local_enrollment_keys ADD COLUMN IF NOT EXISTS key_type varchar(12) NOT NULL DEFAULT 'temporary';
ALTER TABLE desktop_local_enrollment_keys ADD COLUMN IF NOT EXISTS offline_days integer DEFAULT 7;
ALTER TABLE desktop_local_installations ADD COLUMN IF NOT EXISTS key_type varchar(12) NOT NULL DEFAULT 'temporary';
ALTER TABLE desktop_local_installations ADD COLUMN IF NOT EXISTS offline_days integer DEFAULT 7;
ALTER TABLE desktop_local_installations ALTER COLUMN grant_expires_at DROP NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='desktop_local_policy_type_days') THEN
  UPDATE desktop_local_enrollment_keys k SET offline_days=p.offline_days FROM desktop_local_policies p WHERE p.tenant_id=k.tenant_id;
  UPDATE desktop_local_installations i SET offline_days=k.offline_days FROM desktop_local_enrollment_keys k WHERE k.id=i.enrollment_key_id;
  ALTER TABLE desktop_local_policies ADD CONSTRAINT desktop_local_policy_type_days CHECK((key_type='permanent' AND offline_days IS NULL) OR (key_type='temporary' AND offline_days IS NOT NULL AND offline_days BETWEEN 1 AND 30));
  ALTER TABLE desktop_local_enrollment_keys ADD CONSTRAINT desktop_local_key_type_days CHECK((key_type='permanent' AND offline_days IS NULL) OR (key_type='temporary' AND offline_days IS NOT NULL AND offline_days BETWEEN 1 AND 30));
  ALTER TABLE desktop_local_installations ADD CONSTRAINT desktop_local_install_type_days CHECK((key_type='permanent' AND offline_days IS NULL AND grant_expires_at IS NULL) OR (key_type='temporary' AND offline_days IS NOT NULL AND offline_days BETWEEN 1 AND 30 AND grant_expires_at IS NOT NULL));
 END IF;
END $$;
COMMIT;


-- 090_retail_product_families.sql
-- Metadata schema only: existing products, prices, stock and receipt values are unchanged.
BEGIN;
DROP INDEX IF EXISTS retail_family_variant;
CREATE UNIQUE INDEX retail_family_variant ON retail_products(tenant_id,family_id,lower(name),lower(coalesce(brand,'')),coalesce(variant_size,''),coalesce(variant_color,''),coalesce(material,'')) WHERE family_id IS NOT NULL;
ALTER TABLE retail_order_lines ALTER COLUMN product_name TYPE varchar(400);
ALTER TABLE retail_quote_lines ALTER COLUMN product_name TYPE varchar(400);
COMMIT;


-- 091_team_shifts.sql
BEGIN;
ALTER TABLE erp_shift_assignments ADD COLUMN IF NOT EXISTS shift_type varchar(20) NOT NULL DEFAULT 'legacy';
-- Scheduling identities are independent of compensation and attendance links.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='erp_shift_assignments'::regclass AND contype='f' AND confrelid='erp_employee_links'::regclass LOOP
 EXECUTE format('ALTER TABLE erp_shift_assignments DROP CONSTRAINT %I',c.conname); END LOOP;
END $$;
CREATE OR REPLACE FUNCTION enforce_team_shift_employee() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM employees WHERE tenant_id::text=NEW.tenant_id::text AND id::text=NEW.employee_id) THEN RAISE EXCEPTION 'Employee must belong to shift tenant'; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS team_shift_employee_scope ON erp_shift_assignments;
CREATE TRIGGER team_shift_employee_scope BEFORE INSERT OR UPDATE OF tenant_id,employee_id ON erp_shift_assignments FOR EACH ROW EXECUTE FUNCTION enforce_team_shift_employee();
CREATE TABLE IF NOT EXISTS team_shift_requests(tenant_id uuid NOT NULL REFERENCES tenants(id),request_key uuid NOT NULL,fingerprint text NOT NULL,created_by text NOT NULL,shift_ids jsonb NOT NULL,PRIMARY KEY(tenant_id,request_key));
CREATE TABLE IF NOT EXISTS team_employee_links(tenant_id uuid NOT NULL REFERENCES tenants(id),user_id text NOT NULL,employee_id text NOT NULL,PRIMARY KEY(tenant_id,user_id),UNIQUE(tenant_id,employee_id));
CREATE INDEX IF NOT EXISTS team_shift_window ON erp_shift_assignments(tenant_id,work_date,employee_id);
COMMIT;
