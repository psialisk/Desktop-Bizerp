BEGIN;
ALTER TABLE desktop_registrations ADD COLUMN IF NOT EXISTS platform varchar(12) NOT NULL DEFAULT 'desktop';
ALTER TABLE desktop_registrations DROP CONSTRAINT IF EXISTS desktop_registrations_platform_valid;
ALTER TABLE desktop_registrations ADD CONSTRAINT desktop_registrations_platform_valid CHECK(platform IN ('desktop','android'));
ALTER TABLE desktop_registrations ALTER COLUMN local_trial_key DROP NOT NULL;
ALTER TABLE desktop_registrations DROP CONSTRAINT IF EXISTS desktop_registration_trial_platform;
ALTER TABLE desktop_registrations ADD CONSTRAINT desktop_registration_trial_platform CHECK((platform='desktop' AND local_trial_key IS NOT NULL) OR (platform='android' AND local_trial_key IS NULL));
COMMIT;

BEGIN;
-- Preserve historical allocations. Old readings cannot be safely regenerated because
-- their charges did not retain a source-reading reference.
ALTER TABLE utility_readings ADD COLUMN allocation_period varchar(7);
UPDATE utility_readings SET allocation_period='legacy';
ALTER TABLE utility_charges ADD COLUMN reading_id uuid REFERENCES utility_readings(id);
CREATE INDEX utility_charge_reading_idx ON utility_charges(reading_id);
CREATE TABLE property_utility_invoice_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 request_key uuid,
 statement_key text,
 fingerprint text NOT NULL,
 document_id uuid REFERENCES documents(id),
 invoice_ids uuid[] NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,request_key), UNIQUE(tenant_id,statement_key)
);
COMMIT;

BEGIN;
-- Additive restaurant controls. Existing orders retain their original prices and no recipe is inferred.
ALTER TABLE food_menu_items ADD COLUMN modifiers jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(modifiers)='array'), ADD COLUMN recipe jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(recipe)='array');
ALTER TABLE food_order_lines ADD COLUMN modifiers jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(modifiers)='array'), ADD COLUMN course varchar(20) NOT NULL DEFAULT 'main' CHECK(course IN ('starter','main','dessert','drink')), ADD COLUMN recipe_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(recipe_snapshot)='array');
CREATE TABLE food_ingredient_uses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),order_id uuid,product_id uuid NOT NULL,location_id uuid NOT NULL,movement_id uuid NOT NULL UNIQUE REFERENCES retail_stock_movements(id),quantity numeric(15,3) NOT NULL CHECK(quantity>0),cost_cents bigint CHECK(cost_cents>=0),disposition varchar(25) NOT NULL CHECK(disposition IN ('prepared','cancelled_waste','additional_waste')),note varchar(1000) NOT NULL,actor_id text NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,order_id) REFERENCES food_orders(tenant_id,id),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),FOREIGN KEY(tenant_id,location_id) REFERENCES erp_stock_locations(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX food_once_recipe_consumption ON food_ingredient_uses(tenant_id,order_id,product_id,location_id) WHERE order_id IS NOT NULL;
COMMIT;

BEGIN;
-- Existing operational-only tickets retain their policy. New tickets opt into paid release in the service.
ALTER TABLE specialist_laundry_tickets ADD COLUMN IF NOT EXISTS unit_price_cents bigint CHECK(unit_price_cents BETWEEN 0 AND 999999999999);
ALTER TABLE specialist_laundry_tickets ADD COLUMN IF NOT EXISTS minimum_cents bigint NOT NULL DEFAULT 0 CHECK(minimum_cents BETWEEN 0 AND 999999999999);
ALTER TABLE specialist_laundry_tickets ADD COLUMN IF NOT EXISTS rush_cents bigint NOT NULL DEFAULT 0 CHECK(rush_cents BETWEEN 0 AND 999999999999);
ALTER TABLE specialist_laundry_tickets ADD COLUMN IF NOT EXISTS agreed_total_cents bigint CHECK(agreed_total_cents BETWEEN 1 AND 999999999999);
ALTER TABLE specialist_laundry_tickets ADD COLUMN IF NOT EXISTS paid_release boolean NOT NULL DEFAULT false;
ALTER TABLE specialist_salon_visits ADD COLUMN IF NOT EXISTS agreed_total_cents bigint CHECK(agreed_total_cents BETWEEN 1 AND 999999999999);
ALTER TABLE specialist_salon_visits ADD COLUMN IF NOT EXISTS rebooked_from_id uuid;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='salon_rebook_tenant_fk') THEN ALTER TABLE specialist_salon_visits ADD CONSTRAINT salon_rebook_tenant_fk FOREIGN KEY(tenant_id,rebooked_from_id) REFERENCES specialist_salon_visits(tenant_id,id); END IF; END $$;
COMMIT;

BEGIN;
CREATE TABLE trade_scope_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), job_id uuid NOT NULL,
 revision integer NOT NULL CHECK(revision>0), job_snapshot jsonb NOT NULL, reason text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved')),
 total_cents bigint NOT NULL DEFAULT 0 CHECK(total_cents BETWEEN 0 AND 999999999999),
 customer_evidence text, approved_by uuid, approved_at timestamptz, qc_note text, qc_by uuid, qc_at timestamptz,
 released_note text, released_by uuid, released_at timestamptz, warranty_job_id uuid,
 created_by uuid NOT NULL, request_key uuid NOT NULL, fingerprint text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,job_id,revision), UNIQUE(tenant_id,request_key),
 FOREIGN KEY(tenant_id,job_id) REFERENCES trade_jobs(tenant_id,id),
 FOREIGN KEY(tenant_id,warranty_job_id) REFERENCES trade_jobs(tenant_id,id),
 FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),
 FOREIGN KEY(tenant_id,approved_by) REFERENCES users(tenant_id,id),
 FOREIGN KEY(tenant_id,qc_by) REFERENCES users(tenant_id,id),
 FOREIGN KEY(tenant_id,released_by) REFERENCES users(tenant_id,id)
);
CREATE TABLE trade_scope_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, scope_id uuid NOT NULL,
 description text NOT NULL, kind text NOT NULL CHECK(kind IN ('labor','part','service')),
 quantity numeric(15,3) NOT NULL CHECK(quantity>0), unit_price_cents bigint NOT NULL CHECK(unit_price_cents>=0), amount_cents bigint NOT NULL CHECK(amount_cents>=0),
 decision text NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending','approved','declined')),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,scope_id,id), FOREIGN KEY(tenant_id,scope_id) REFERENCES trade_scope_revisions(tenant_id,id)
);
CREATE TABLE trade_work_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, scope_id uuid NOT NULL, line_id uuid NOT NULL,
 minutes integer NOT NULL CHECK(minutes BETWEEN 0 AND 1440), note text NOT NULL, created_by uuid NOT NULL,
 request_key uuid NOT NULL, fingerprint text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,request_key), FOREIGN KEY(tenant_id,scope_id) REFERENCES trade_scope_revisions(tenant_id,id),
 FOREIGN KEY(tenant_id,scope_id,line_id) REFERENCES trade_scope_lines(tenant_id,scope_id,id),
 FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id)
);
-- A job has one approval authority; a legacy quote cannot be added after line-scope adoption.
CREATE OR REPLACE FUNCTION trade_scope_quote_authority() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status IN ('draft','sent','accepted') AND EXISTS(SELECT 1 FROM trade_scope_revisions WHERE tenant_id=NEW.tenant_id AND job_id=NEW.job_id) THEN
  RAISE EXCEPTION 'Job uses revisioned line authorization; do not add a separate quote';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trade_scope_quote_authority BEFORE INSERT OR UPDATE ON trade_quotes FOR EACH ROW EXECUTE FUNCTION trade_scope_quote_authority();
COMMIT;


BEGIN;
-- Existing consumed/output movements and journals are preserved. No inferred prices.
ALTER TABLE manufacturing_bom_lines ALTER COLUMN quantity TYPE numeric(18,3);
ALTER TABLE manufacturing_bom_lines DROP CONSTRAINT manufacturing_bom_lines_quantity_check;
ALTER TABLE manufacturing_bom_lines ADD CHECK(quantity BETWEEN 0.001 AND 1000000);
ALTER TABLE manufacturing_orders ALTER COLUMN quantity TYPE numeric(18,3);
ALTER TABLE manufacturing_orders DROP CONSTRAINT manufacturing_orders_quantity_check;
ALTER TABLE manufacturing_orders ADD CHECK(quantity BETWEEN 0.001 AND 1000000);
ALTER TABLE manufacturing_order_lines ALTER COLUMN quantity TYPE numeric(18,3);
ALTER TABLE manufacturing_order_lines DROP CONSTRAINT manufacturing_order_lines_quantity_check;
ALTER TABLE manufacturing_order_lines ADD CHECK(quantity BETWEEN 0.001 AND 1000000000);
ALTER TABLE manufacturing_orders ADD COLUMN good_quantity numeric(18,3) NOT NULL DEFAULT 0,
 ADD COLUMN scrap_quantity numeric(18,3) NOT NULL DEFAULT 0,
 ADD COLUMN material_cost_cents bigint,
 ADD COLUMN allocated_cost_cents bigint NOT NULL DEFAULT 0,
 ADD COLUMN valued boolean NOT NULL DEFAULT false,
 ADD CHECK(good_quantity>=0 AND scrap_quantity>=0 AND good_quantity+scrap_quantity<=quantity),
 ADD CHECK(material_cost_cents IS NULL OR material_cost_cents BETWEEN 0 AND 999999999999),
 ADD CHECK(allocated_cost_cents>=0 AND allocated_cost_cents<=coalesce(material_cost_cents,0));
UPDATE manufacturing_orders o SET valued=c.valued,material_cost_cents=CASE WHEN c.valued THEN c.cost END
 FROM (SELECT l.tenant_id,l.order_id,bool_or(m.cost_cents IS NOT NULL) AS valued,sum(abs(coalesce(m.cost_cents,0))) AS cost
 FROM manufacturing_stock_links l JOIN retail_stock_movements m ON m.tenant_id=l.tenant_id AND m.id=l.movement_id
 WHERE l.kind='consumed' GROUP BY l.tenant_id,l.order_id) c WHERE c.tenant_id=o.tenant_id AND c.order_id=o.id;
UPDATE manufacturing_orders SET good_quantity=quantity,allocated_cost_cents=coalesce(material_cost_cents,0) WHERE status='completed';
-- Multiple partial output movements, but each component can still be consumed only once.
ALTER TABLE manufacturing_stock_links DROP CONSTRAINT manufacturing_stock_links_order_id_product_id_kind_key;
CREATE UNIQUE INDEX manufacturing_once_consumed ON manufacturing_stock_links(order_id,product_id) WHERE kind='consumed';
CREATE TABLE manufacturing_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,order_id uuid NOT NULL,
 request_key uuid NOT NULL,fingerprint text NOT NULL,
 good_quantity numeric(18,3) NOT NULL CHECK(good_quantity>=0),scrap_quantity numeric(18,3) NOT NULL CHECK(scrap_quantity>=0),
 good_cost_cents bigint CHECK(good_cost_cents BETWEEN 0 AND 999999999999),scrap_cost_cents bigint CHECK(scrap_cost_cents BETWEEN 0 AND 999999999999),
 output_movement_id uuid,lot_id uuid,actor_id text NOT NULL,note varchar(500) NOT NULL CHECK(length(trim(note))>0),created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(good_quantity+scrap_quantity>0),
 FOREIGN KEY(tenant_id,order_id) REFERENCES manufacturing_orders(tenant_id,id),
 FOREIGN KEY(tenant_id,output_movement_id) REFERENCES retail_stock_movements(tenant_id,id),
 FOREIGN KEY(tenant_id,lot_id) REFERENCES retail_lots(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE INDEX manufacturing_batches_order ON manufacturing_batches(tenant_id,order_id,created_at);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS android_local_policies (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id), device_limit integer NOT NULL DEFAULT 1 CHECK(device_limit BETWEEN 1 AND 30), offline_days integer NOT NULL DEFAULT 7 CHECK(offline_days BETWEEN 1 AND 30)
);
CREATE TABLE IF NOT EXISTS android_local_enrollment_keys (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),owner_id uuid NOT NULL REFERENCES users(id),email varchar(190) NOT NULL,
 key_digest char(64) NOT NULL UNIQUE,key_prefix varchar(16) NOT NULL,key_suffix varchar(8) NOT NULL,
 expires_at timestamptz NOT NULL,used_at timestamptz,revoked_at timestamptz,issued_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS android_local_installations (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),owner_id uuid NOT NULL REFERENCES users(id),email varchar(190) NOT NULL,
 enrollment_key_id uuid NOT NULL UNIQUE REFERENCES android_local_enrollment_keys(id),installation_id uuid NOT NULL UNIQUE,request_id uuid NOT NULL UNIQUE,
 public_key text NOT NULL,public_fingerprint char(64) NOT NULL UNIQUE,credential_version integer NOT NULL,
 status varchar(12) NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','active','revoked')),revision integer NOT NULL DEFAULT 1,
 signed_grant text NOT NULL,grant_expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),activated_at timestamptz,last_seen_at timestamptz,revoked_at timestamptz,revoke_reason varchar(500)
);
CREATE INDEX IF NOT EXISTS android_local_tenant_status ON android_local_installations(tenant_id,status);
COMMIT;

BEGIN;
ALTER TABLE android_local_policies ADD COLUMN IF NOT EXISTS key_type varchar(12) NOT NULL DEFAULT 'temporary';
ALTER TABLE android_local_policies ALTER COLUMN offline_days DROP NOT NULL;
ALTER TABLE android_local_enrollment_keys ADD COLUMN IF NOT EXISTS key_type varchar(12) NOT NULL DEFAULT 'temporary';
ALTER TABLE android_local_enrollment_keys ADD COLUMN IF NOT EXISTS offline_days integer DEFAULT 7;
ALTER TABLE android_local_installations ADD COLUMN IF NOT EXISTS key_type varchar(12) NOT NULL DEFAULT 'temporary';
ALTER TABLE android_local_installations ADD COLUMN IF NOT EXISTS offline_days integer DEFAULT 7;
ALTER TABLE android_local_installations ALTER COLUMN grant_expires_at DROP NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='android_local_policy_type_days') THEN
  UPDATE android_local_enrollment_keys k SET offline_days=p.offline_days FROM android_local_policies p WHERE p.tenant_id=k.tenant_id;
  UPDATE android_local_installations i SET offline_days=k.offline_days FROM android_local_enrollment_keys k WHERE k.id=i.enrollment_key_id;
  ALTER TABLE android_local_policies ADD CONSTRAINT android_local_policy_type_days CHECK((key_type='permanent' AND offline_days IS NULL) OR (key_type='temporary' AND offline_days IS NOT NULL AND offline_days BETWEEN 1 AND 30));
  ALTER TABLE android_local_enrollment_keys ADD CONSTRAINT android_local_key_type_days CHECK((key_type='permanent' AND offline_days IS NULL) OR (key_type='temporary' AND offline_days IS NOT NULL AND offline_days BETWEEN 1 AND 30));
  ALTER TABLE android_local_installations ADD CONSTRAINT android_local_install_type_days CHECK((key_type='permanent' AND offline_days IS NULL AND grant_expires_at IS NULL) OR (key_type='temporary' AND offline_days IS NOT NULL AND offline_days BETWEEN 1 AND 30 AND grant_expires_at IS NOT NULL));
 END IF;
END $$;
COMMIT;

BEGIN;
-- Additive Pharmacy specialization. Existing Retail products/tenants remain unchanged.
CREATE TABLE IF NOT EXISTS retail_medicines (
 tenant_id uuid NOT NULL,product_id uuid NOT NULL,generic_name varchar(150) NOT NULL CHECK(length(trim(generic_name))>0),
 strength varchar(100) NOT NULL CHECK(length(trim(strength))>0),dosage_form varchar(80) NOT NULL CHECK(length(trim(dosage_form))>0),
 classification varchar(20) NOT NULL CHECK(classification IN ('otc','rx','pharmacist-only','controlled')),
 created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,product_id),
 FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id));
CREATE TABLE IF NOT EXISTS retail_pharmacists (
 tenant_id uuid NOT NULL REFERENCES tenants(id),user_id uuid NOT NULL REFERENCES users(id),license_number varchar(100) NOT NULL CHECK(length(trim(license_number))>0),
 valid_through date NOT NULL,evidence_reference varchar(250) NOT NULL CHECK(length(trim(evidence_reference))>0),active boolean NOT NULL DEFAULT true,
 verified_by uuid NOT NULL REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,user_id));
CREATE TABLE IF NOT EXISTS retail_prescriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),contact_id uuid NOT NULL,
 reference varchar(100) NOT NULL CHECK(length(trim(reference))>0),prescriber varchar(150) NOT NULL CHECK(length(trim(prescriber))>0),
 prescriber_license varchar(100) NOT NULL CHECK(length(trim(prescriber_license))>0),written_on date NOT NULL,
 directions varchar(2000) NOT NULL CHECK(length(trim(directions))>0),status varchar(20) NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected','cancelled')),
 valid_through date,review_note varchar(1000),reviewed_by uuid REFERENCES users(id),created_by uuid NOT NULL REFERENCES users(id),
 request_key uuid NOT NULL,fingerprint text NOT NULL,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,contact_id,reference,written_on));
CREATE TABLE IF NOT EXISTS retail_prescription_lines (
 tenant_id uuid NOT NULL,prescription_id uuid NOT NULL,product_id uuid NOT NULL,quantity numeric(18,3) NOT NULL CHECK(quantity>0 AND quantity<=1000000),
 PRIMARY KEY(tenant_id,prescription_id,product_id),FOREIGN KEY(tenant_id,prescription_id) REFERENCES retail_prescriptions(tenant_id,id),
 FOREIGN KEY(tenant_id,product_id) REFERENCES retail_medicines(tenant_id,product_id));
CREATE TABLE IF NOT EXISTS retail_prescription_dispenses (
 tenant_id uuid NOT NULL,prescription_id uuid NOT NULL,product_id uuid NOT NULL,movement_id uuid NOT NULL,quantity numeric(18,3) NOT NULL CHECK(quantity>0),
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,movement_id),
 FOREIGN KEY(tenant_id,prescription_id,product_id) REFERENCES retail_prescription_lines(tenant_id,prescription_id,product_id),
 FOREIGN KEY(tenant_id,movement_id) REFERENCES retail_stock_movements(tenant_id,id) DEFERRABLE INITIALLY DEFERRED);
CREATE TABLE IF NOT EXISTS retail_pharmacy_quarantine (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id),location_id uuid NOT NULL,FOREIGN KEY(tenant_id,location_id) REFERENCES erp_stock_locations(tenant_id,id));
CREATE OR REPLACE FUNCTION erp_pharmacy_catalog_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='retail_medicines' THEN
  IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Medicine classification is immutable; archive the product rather than rewriting dispensing history';END IF;
  PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM retail_products WHERE tenant_id=NEW.tenant_id AND id=NEW.product_id AND tracking='lot') THEN RAISE EXCEPTION 'Enable lot tracking before adding a medicine profile';END IF;
  IF EXISTS(SELECT 1 FROM retail_lots WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id AND expires_on IS NULL) THEN RAISE EXCEPTION 'Every medicine lot requires an expiry date';END IF;
 ELSIF TG_TABLE_NAME='retail_lots' THEN
  IF NEW.expires_on IS NULL AND EXISTS(SELECT 1 FROM retail_medicines WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id) THEN RAISE EXCEPTION 'Medicine lot expiry is required';END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM retail_medicines WHERE tenant_id=NEW.tenant_id AND product_id=NEW.id) THEN
   IF NEW.tracking<>'lot' THEN RAISE EXCEPTION 'Medicine lot tracking cannot be removed';END IF;
   IF NEW.unit<>OLD.unit THEN RAISE EXCEPTION 'Medicine base unit cannot change after classification';END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS pharmacy_medicine_catalog ON retail_medicines;
CREATE TRIGGER pharmacy_medicine_catalog BEFORE INSERT OR UPDATE ON retail_medicines FOR EACH ROW EXECUTE FUNCTION erp_pharmacy_catalog_guard();
DROP TRIGGER IF EXISTS pharmacy_lot_expiry ON retail_lots;
CREATE TRIGGER pharmacy_lot_expiry BEFORE INSERT OR UPDATE ON retail_lots FOR EACH ROW EXECUTE FUNCTION erp_pharmacy_catalog_guard();
DROP TRIGGER IF EXISTS pharmacy_product_tracking ON retail_products;
CREATE TRIGGER pharmacy_product_tracking BEFORE UPDATE OF tracking,unit ON retail_products FOR EACH ROW EXECUTE FUNCTION erp_pharmacy_catalog_guard();

CREATE OR REPLACE FUNCTION erp_pharmacy_stock_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE med record; sale record; rx record; authorized numeric; used numeric; pharmacist uuid; quarantine_id uuid;
BEGIN
 SELECT * INTO med FROM retail_medicines WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id;
 IF NOT FOUND THEN RETURN NEW;END IF;
 -- Serializes authorization consumption with every supported inventory/posting route.
 PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;
 SELECT location_id INTO quarantine_id FROM retail_pharmacy_quarantine WHERE tenant_id=NEW.tenant_id;
 IF NEW.quantity>0 AND NEW.source_type='return' THEN
  IF quarantine_id IS NULL THEN
   INSERT INTO erp_stock_locations(tenant_id,code,name) VALUES(NEW.tenant_id,'PHARMACY-QUARANTINE','Pharmacy quarantine - not for sale') ON CONFLICT(tenant_id,code) DO UPDATE SET name=excluded.name RETURNING id INTO quarantine_id;
   INSERT INTO retail_pharmacy_quarantine VALUES(NEW.tenant_id,quarantine_id);
  END IF;
  NEW.location_id:=quarantine_id;
 END IF;
 IF NEW.quantity<0 AND NEW.location_id=quarantine_id AND NEW.source_type IN ('sale','transfer','job_issue','production_issue') THEN RAISE EXCEPTION 'Quarantined medicine cannot be sold or transferred; reviewed disposal is required';END IF;
 IF NEW.quantity<0 AND NEW.source_type='sale' THEN
  IF NOT EXISTS(SELECT 1 FROM tenant_foundations WHERE tenant_id=NEW.tenant_id AND 'retail-pharmacy'=ANY(blocks)) THEN RAISE EXCEPTION 'Retail Pharmacy foundation is required to dispense medicines';END IF;
  IF med.classification='controlled' THEN RAISE EXCEPTION 'Controlled-drug dispensing is not supported';END IF;
  SELECT o.* INTO sale FROM retail_fulfillments f JOIN retail_orders o ON o.tenant_id=f.tenant_id AND o.id=f.order_id WHERE f.tenant_id=NEW.tenant_id AND f.id=NEW.source_id;
  IF med.classification='pharmacist-only' THEN
   pharmacist:=nullif(sale.pos_snapshot->>'pharmacistId','')::uuid;
  ELSIF med.classification='rx' THEN
   SELECT * INTO rx FROM retail_prescriptions WHERE tenant_id=NEW.tenant_id AND id=nullif(sale.pos_snapshot->>'prescriptionId','')::uuid FOR UPDATE;
   IF rx.id IS NULL OR rx.status<>'approved' OR rx.contact_id<>sale.contact_id OR rx.valid_through IS NULL OR rx.valid_through<(now() AT TIME ZONE 'Asia/Manila')::date THEN RAISE EXCEPTION 'Approved, current prescription for this patient is required';END IF;
   pharmacist:=rx.reviewed_by;
   SELECT quantity INTO authorized FROM retail_prescription_lines WHERE tenant_id=NEW.tenant_id AND prescription_id=rx.id AND product_id=NEW.product_id;
   SELECT coalesce(sum(quantity),0) INTO used FROM retail_prescription_dispenses WHERE tenant_id=NEW.tenant_id AND prescription_id=rx.id AND product_id=NEW.product_id;
   IF authorized IS NULL OR used+abs(NEW.quantity)>authorized THEN RAISE EXCEPTION 'Dispensing exceeds the remaining prescribed quantity';END IF;
  END IF;
  IF med.classification IN ('rx','pharmacist-only') AND NOT EXISTS(SELECT 1 FROM retail_pharmacists p JOIN users u ON u.id=p.user_id AND u.tenant_id=p.tenant_id WHERE p.tenant_id=NEW.tenant_id AND p.user_id=pharmacist AND p.active AND p.valid_through>=(now() AT TIME ZONE 'Asia/Manila')::date AND u.status='active') THEN RAISE EXCEPTION 'An active authorized pharmacist must review dispensing';END IF;
  -- Pharmacist-only OTC requires the authorized pharmacist to be the posting actor.
  IF med.classification='pharmacist-only' AND pharmacist::text<>NEW.actor_id THEN RAISE EXCEPTION 'The authorized pharmacist must complete this OTC sale';END IF;
  IF med.classification='rx' THEN INSERT INTO retail_prescription_dispenses(tenant_id,prescription_id,product_id,movement_id,quantity) VALUES(NEW.tenant_id,rx.id,NEW.product_id,NEW.id,abs(NEW.quantity));END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aaa_pharmacy_stock_guard ON retail_stock_movements;
CREATE TRIGGER aaa_pharmacy_stock_guard BEFORE INSERT ON retail_stock_movements FOR EACH ROW EXECUTE FUNCTION erp_pharmacy_stock_guard();

-- Reuse the existing durable owner inbox; no patient or prescription details enter notifications.
CREATE OR REPLACE FUNCTION refresh_pharmacy_expiry_alerts(t uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE lot_row record;u record;payload jsonb;stage text;enabled boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('operation-alerts:'||t::text));
 SELECT 'retail-pharmacy'=ANY(blocks) INTO enabled FROM tenant_foundations WHERE tenant_id=t;
 UPDATE notifications n SET resolved_at=now() WHERE n.tenant_id=t AND n.operation->>'alert'='pharmacy-expiry' AND n.resolved_at IS NULL AND
  (NOT coalesce(enabled,false) OR NOT EXISTS(SELECT 1 FROM retail_lots l JOIN retail_medicines m ON m.tenant_id=l.tenant_id AND m.product_id=l.product_id JOIN retail_lot_allocations a ON a.tenant_id=l.tenant_id AND a.lot_id=l.id WHERE l.tenant_id=t AND l.id::text=n.operation->>'sourceId' AND (l.expires_on<=(now() AT TIME ZONE 'Asia/Manila')::date+90 OR l.status='blocked') GROUP BY l.id HAVING sum(a.quantity)>0));
 IF NOT coalesce(enabled,false) THEN RETURN;END IF;
 FOR lot_row IN SELECT l.id,l.code,l.expires_on,l.status,p.sku,p.name,sum(a.quantity) AS quantity,l.expires_on-(now() AT TIME ZONE 'Asia/Manila')::date AS remaining FROM retail_lots l JOIN retail_medicines m ON m.tenant_id=l.tenant_id AND m.product_id=l.product_id JOIN retail_products p ON p.tenant_id=l.tenant_id AND p.id=l.product_id JOIN retail_lot_allocations a ON a.tenant_id=l.tenant_id AND a.lot_id=l.id WHERE l.tenant_id=t AND (l.expires_on<=(now() AT TIME ZONE 'Asia/Manila')::date+90 OR l.status='blocked') GROUP BY l.id,p.sku,p.name HAVING sum(a.quantity)>0 LOOP
  stage:=CASE WHEN lot_row.status='blocked' THEN 'blocked' WHEN lot_row.remaining<0 THEN 'expired' WHEN lot_row.remaining<=30 THEN 'due-30' WHEN lot_row.remaining<=60 THEN 'due-60' ELSE 'due-90' END;
  payload:=jsonb_build_object('module','retail-pharmacy','block','retail-pharmacy','sourceTable','retail_lots','sourceId',lot_row.id,'reference',lot_row.code,'label','Medicine lot expiry / hold','alert','pharmacy-expiry','status',stage,'priority',CASE WHEN stage IN ('expired','blocked') THEN 'critical' ELSE 'action' END,'industryPriority',1,'route','/dashboard/pharmacy','quantity',lot_row.quantity,'dueAt',lot_row.expires_on);
  FOR u IN SELECT id FROM users WHERE tenant_id=t AND role='owner' AND status='active' LOOP
   IF NOT EXISTS(SELECT 1 FROM notifications n WHERE n.tenant_id=t AND n.recipient_id=u.id AND n.operation->>'alert'='pharmacy-expiry' AND n.operation->>'sourceId'=lot_row.id::text AND n.resolved_at IS NULL) THEN
    INSERT INTO notifications(id,tenant_id,recipient_type,recipient_id,title,body,is_read,operation,action_required) VALUES(gen_random_uuid(),t,'staff',u.id,'Medicine lot requires attention',lot_row.sku||' / lot '||lot_row.code||' / expiry '||lot_row.expires_on||' / '||lot_row.quantity||' units',false,payload,true);
   ELSE UPDATE notifications n SET operation=payload,is_read=CASE WHEN n.operation->>'status' IS DISTINCT FROM stage THEN false ELSE n.is_read END,body=lot_row.sku||' / lot '||lot_row.code||' / expiry '||lot_row.expires_on||' / '||lot_row.quantity||' units' WHERE n.tenant_id=t AND n.recipient_id=u.id AND n.operation->>'alert'='pharmacy-expiry' AND n.operation->>'sourceId'=lot_row.id::text AND n.resolved_at IS NULL;END IF;
  END LOOP;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION refresh_operation_alerts(t uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE f text[];p record;u record;event text;payload jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('operation-alerts:'||t::text));
 SELECT blocks INTO f FROM tenant_foundations WHERE tenant_id::text=t::text;
 UPDATE notifications SET resolved_at=now() WHERE tenant_id::text=t::text AND action_required AND resolved_at IS NULL AND operation IS NOT NULL AND NOT (operation->>'block')=ANY(COALESCE(f,ARRAY[]::text[]));
 IF 'inventory'=ANY(COALESCE(f,ARRAY[]::text[])) THEN
  FOR p IN SELECT pr.id,pr.name,pr.sku,pr.unit,pr.reorder_level,COALESCE(sum(m.quantity),0) AS quantity FROM retail_products pr LEFT JOIN retail_stock_movements m ON m.product_id=pr.id AND m.tenant_id=pr.tenant_id WHERE pr.tenant_id::text=t::text AND pr.status='active' GROUP BY pr.id LOOP
   IF p.quantity<=0 OR p.reorder_level>0 AND p.quantity<=p.reorder_level THEN
    payload:=jsonb_build_object('module','inventory','block','inventory','sourceTable','retail_products','sourceId',p.id,'reference',p.sku,'label','Low stock','alert','low-stock','status','low-stock','priority',CASE WHEN p.quantity<=0 THEN 'critical' ELSE 'action' END,'industryPriority',1,'route','/dashboard/inventory-operations','quantity',p.quantity,'unit',p.unit);
    FOR u IN SELECT id FROM users WHERE tenant_id::text=t::text AND role='owner' AND status='active' LOOP
     IF NOT EXISTS(SELECT 1 FROM notifications WHERE tenant_id::text=t::text AND recipient_id::text=u.id::text AND operation->>'alert'='low-stock' AND operation->>'sourceId'=p.id::text AND resolved_at IS NULL) THEN
      INSERT INTO notifications(id,tenant_id,recipient_type,recipient_id,title,body,is_read,operation,action_required) VALUES(gen_random_uuid(),t,'staff',u.id,'Stock needs replenishment',p.sku||' Â· '||p.quantity||' '||p.unit||' remaining',false,payload,true);
     ELSE UPDATE notifications SET is_read=CASE WHEN operation->>'priority' IS DISTINCT FROM payload->>'priority' THEN false ELSE is_read END,operation=payload,body=p.sku||' Â· '||p.quantity||' '||p.unit||' remaining' WHERE tenant_id::text=t::text AND recipient_id::text=u.id::text AND operation->>'alert'='low-stock' AND operation->>'sourceId'=p.id::text AND resolved_at IS NULL;END IF;
    END LOOP;
   ELSE UPDATE notifications SET resolved_at=now() WHERE tenant_id::text=t::text AND operation->>'alert'='low-stock' AND operation->>'sourceId'=p.id::text AND resolved_at IS NULL;END IF;
  END LOOP;
 END IF;
 UPDATE notifications SET resolved_at=now() WHERE tenant_id::text=t::text AND operation->>'alert'='low-stock' AND resolved_at IS NULL AND NOT EXISTS(SELECT 1 FROM retail_products WHERE tenant_id::text=t::text AND id::text=operation->>'sourceId' AND status='active');
 PERFORM refresh_operation_due_alerts(t);
 PERFORM refresh_pharmacy_expiry_alerts(t);
END $$;

COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS operations_tasks (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),title varchar(150) NOT NULL,
 category text NOT NULL CHECK(category IN ('follow-up','stock-count','pickup','supplier-arrival','delivery-promise','container-return','cleaning','equipment-service','recall-follow-up')),
 due_on date,note varchar(1000) NOT NULL DEFAULT '',priority text NOT NULL CHECK(priority IN ('normal','high')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','done','cancelled')),version integer NOT NULL DEFAULT 1,
 created_by uuid NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS operations_tasks_calendar ON operations_tasks(tenant_id,due_on,status);
CREATE TABLE IF NOT EXISTS operations_task_commands (
 tenant_id uuid NOT NULL REFERENCES tenants(id),request_key uuid NOT NULL,fingerprint text NOT NULL,result jsonb NOT NULL,
 PRIMARY KEY(tenant_id,request_key)
);
COMMIT;

-- 087 persisted calendar reconciliation
BEGIN;
CREATE TABLE IF NOT EXISTS operations_calendar_events (
 tenant_id uuid NOT NULL,recipient_id uuid NOT NULL,event_key varchar(100) NOT NULL,
 event_date date NOT NULL,event jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,recipient_id,event_key),
 FOREIGN KEY(tenant_id,recipient_id) REFERENCES users(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS operations_calendar_events_month ON operations_calendar_events(tenant_id,recipient_id,event_date);
COMMIT;
