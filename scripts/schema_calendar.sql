-- Business ERP: PostgreSQL fresh-database baseline (2026-10-14).

-- Generated from backend entities plus reviewed non-ORM tables and constraints.

-- Run only on an empty public schema. Do not run historical migrations 001Ã¢â‚¬â€œ040 afterward.

BEGIN;

SET LOCAL search_path = public, pg_catalog;

SELECT pg_advisory_xact_lock(739142025);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S'))
    OR EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname='public' AND t.typtype='e') THEN
    RAISE EXCEPTION 'Business ERP baseline requires an empty public schema';
  END IF;
END $$;

CREATE TYPE "amenities_status_enum" AS ENUM('active', 'inactive');

CREATE TABLE "amenities" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "property_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "description" text, "hourly_rate" numeric(10,2) NOT NULL DEFAULT '0', "capacity" integer, "opening_time" TIME, "closing_time" TIME, "status" "amenities_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c0777308847b3556086f2fb233e" PRIMARY KEY ("id"));

CREATE INDEX "IDX_94bbec3ac6f6e2688ea162de85" ON "amenities" ("tenant_id") ;

CREATE TYPE "amenity_bookings_status_enum" AS ENUM('pending', 'confirmed', 'completed', 'cancelled');

CREATE TABLE "amenity_bookings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "amenity_id" uuid NOT NULL, "renter_id" uuid NOT NULL, "booking_date" date NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "guest_count" integer NOT NULL DEFAULT '1', "amount" numeric(10,2) NOT NULL DEFAULT '0', "status" "amenity_bookings_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8819f404d50ffbf14a3146cdc39" PRIMARY KEY ("id"));

CREATE INDEX "IDX_ece3ab4b253e6a4cce72039bea" ON "amenity_bookings" ("tenant_id") ;

CREATE INDEX "IDX_e3b9fd73f0a98beed196c6aa2a" ON "amenity_bookings" ("amenity_id") ;

CREATE TABLE "announcements" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "property_id" uuid NOT NULL, "title" character varying(150) NOT NULL, "content" text NOT NULL, "publish_at" TIMESTAMP NOT NULL, "expires_at" TIMESTAMP, "created_by" character(36), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b3ad760876ff2e19d58e05dc8b0" PRIMARY KEY ("id"));

CREATE INDEX "IDX_98a574ea395ac0d8c01e562e65" ON "announcements" ("tenant_id") ;

CREATE INDEX "IDX_5cb9090183d16426e2a030bf18" ON "announcements" ("property_id") ;

CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid, "user_id" uuid, "action" character varying(100) NOT NULL, "entity_type" character varying(100) NOT NULL, "entity_id" uuid, "old_values" json, "new_values" json, "ip_address" character varying(45), "user_agent" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"));

CREATE INDEX "IDX_6f18d459490bb48923b1f40bdb" ON "audit_logs" ("tenant_id") ;

CREATE INDEX "IDX_ea9ba3dfb39050f831ee3be40d" ON "audit_logs" ("entity_type") ;

CREATE TYPE "beds_status_enum" AS ENUM('vacant', 'occupied', 'reserved', 'maintenance');

CREATE TABLE "beds" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "unit_id" uuid NOT NULL, "bed_number" character varying(50) NOT NULL, "image_1_url" character varying(500), "image_2_url" character varying(500), "monthly_rate" numeric(10,2) NOT NULL DEFAULT '0', "status" "beds_status_enum" NOT NULL DEFAULT 'vacant', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2212ae7113d85a70dc65983e742" PRIMARY KEY ("id"));

CREATE INDEX "IDX_63b70b2b7f36ddc0724b35dfed" ON "beds" ("tenant_id") ;

CREATE INDEX "IDX_ea9cdc62082d510d8469ac3af9" ON "beds" ("unit_id") ;

CREATE TABLE "billing_accounts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "renter_id" uuid NOT NULL, "property_id" uuid NOT NULL, "unit_id" uuid, "account_number" character varying(30) NOT NULL, "current_balance" numeric(10,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f693b4dfaa4ad064b3821cb6d79" PRIMARY KEY ("id"));

CREATE INDEX "IDX_9c21602fd4e27ce7c5bdba562a" ON "billing_accounts" ("tenant_id") ;

CREATE INDEX "IDX_ab8a02849430bbd8a07fab074b" ON "billing_accounts" ("renter_id") ;

CREATE TABLE "chart_of_accounts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "code" character varying(20) NOT NULL, "name" character varying(120) NOT NULL, "account_type" character varying(20) NOT NULL, "is_system" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_467c08a2efc78393c647da32bac" PRIMARY KEY ("id"));

CREATE INDEX "IDX_dc82c9b1ae99234c8b1e3be2a6" ON "chart_of_accounts" ("tenant_id") ;

CREATE UNIQUE INDEX "uq_chart_accounts_tenant_code" ON "chart_of_accounts" ("tenant_id", "code") ;

CREATE TYPE "contracts_status_enum" AS ENUM('active', 'ended', 'terminated');

CREATE TABLE "contracts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "renter_id" uuid NOT NULL, "lease_id" uuid, "unit_id" uuid, "start_date" date NOT NULL, "end_date" date, "rent_amount" numeric(10,2) NOT NULL, "deposit_amount" numeric(10,2) NOT NULL DEFAULT '0', "advance_amount" numeric(10,2) NOT NULL DEFAULT '0', "status" "contracts_status_enum" NOT NULL DEFAULT 'active', "document_url" character varying(500), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY ("id"));

CREATE INDEX "IDX_99f99bdfee2d227b320d4d7c70" ON "contracts" ("tenant_id") ;

CREATE INDEX "IDX_5e08771635341f26ba31ee6a87" ON "contracts" ("renter_id") ;

CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "property_id" uuid, "lease_id" uuid, "renter_id" uuid, "type" character varying(50), "file_name" character varying(255) NOT NULL, "file_url" character varying(500) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"));

CREATE INDEX "IDX_5109a94ccfd3f39bf4a7a1e1fa" ON "documents" ("tenant_id") ;

CREATE TYPE "employee_schedules_day_of_week_enum" AS ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');

CREATE TABLE "employee_schedules" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "day_of_week" "employee_schedules_day_of_week_enum" NOT NULL, "start_time" character varying(20) NOT NULL, "end_time" character varying(20) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a82f7aa2134e860b889d1cf78b3" PRIMARY KEY ("id"));

CREATE INDEX "IDX_b74a9aded5df74e4a66ca608bd" ON "employee_schedules" ("tenant_id") ;

CREATE INDEX "IDX_e02e3472a9443d6fd21e7b3932" ON "employee_schedules" ("employee_id") ;

CREATE TYPE "employees_status_enum" AS ENUM('active', 'on_leave', 'terminated');

CREATE TABLE "employees" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "full_name" character varying(150) NOT NULL, "position" character varying(100), "status" "employees_status_enum" NOT NULL DEFAULT 'active', "employment_date" date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"));

CREATE INDEX "IDX_588d18aeef0504067e40c68278" ON "employees" ("tenant_id") ;

CREATE TABLE "erp_contacts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "display_name" character varying(150) NOT NULL, "kind" character varying(20) NOT NULL DEFAULT 'person', "roles" text array NOT NULL, "email" character varying(190), "phone" character varying(30), "address" character varying(255), "status" character varying(20) NOT NULL DEFAULT 'active', "version" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d2028d631d48b040400e9299e1d" PRIMARY KEY ("id"));

CREATE INDEX "IDX_905597f0cbbf5a698882bfae97" ON "erp_contacts" ("tenant_id", "display_name") ;

CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "property_id" uuid NOT NULL, "vendor_id" uuid, "category" character varying(100), "description" character varying(255), "amount" numeric(10,2) NOT NULL, "transaction_date" date NOT NULL, "reference_number" character varying(50), "source_maintenance_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY ("id"));

CREATE INDEX "IDX_e86e6bebe054a040132d2aeb5b" ON "expenses" ("tenant_id") ;

CREATE INDEX "IDX_d45651fdfe08150a636a034319" ON "expenses" ("property_id") ;

CREATE INDEX "IDX_5c364db665e3fc050892231567" ON "expenses" ("transaction_date") ;

CREATE UNIQUE INDEX "uq_expenses_maintenance_source" ON "expenses" ("source_maintenance_id") ;

CREATE TYPE "gate_passes_status_enum" AS ENUM('active', 'used', 'expired', 'revoked');

CREATE TABLE "gate_passes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "property_id" uuid NOT NULL, "renter_id" uuid, "visitor_id" uuid, "type" character varying(50) NOT NULL, "code" character varying(20) NOT NULL, "valid_from" TIMESTAMP NOT NULL, "valid_until" TIMESTAMP NOT NULL, "status" "gate_passes_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_79b23816ff12bcbf579124b45ca" PRIMARY KEY ("id"));

CREATE INDEX "IDX_f8acc988e217ca2231b5d3ffb0" ON "gate_passes" ("tenant_id") ;

CREATE TYPE "invoice_items_type_enum" AS ENUM('rent', 'utility', 'hoa_due', 'cam', 'penalty', 'parking', 'amenity', 'other');

CREATE TABLE "invoice_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "invoice_id" uuid NOT NULL, "type" "invoice_items_type_enum" NOT NULL, "description" character varying(255) NOT NULL, "quantity" numeric(10,2) NOT NULL DEFAULT '1', "unit_price" numeric(10,2) NOT NULL, "amount" numeric(10,2) NOT NULL, "taxable" boolean NOT NULL DEFAULT '0', CONSTRAINT "PK_53b99f9e0e2945e69de1a12b75a" PRIMARY KEY ("id"));

CREATE INDEX "IDX_dc991d555664682cfe892eea2c" ON "invoice_items" ("invoice_id") ;

CREATE TYPE "invoices_status_enum" AS ENUM('draft', 'unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled');

CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "invoice_number" character varying(30), "tenant_id" uuid NOT NULL, "billing_account_id" uuid, "lease_id" uuid, "renter_id" uuid NOT NULL, "billing_period" character varying(50) NOT NULL, "issue_date" date, "due_date" date, "amount" numeric(10,2) NOT NULL, "request_key" uuid, "request_fingerprint" text, "subtotal" numeric(10,2) NOT NULL DEFAULT '0', "tax_amount" numeric(10,2) NOT NULL DEFAULT '0', "discount_amount" numeric(10,2) NOT NULL DEFAULT '0', "penalty_amount" numeric(10,2) NOT NULL DEFAULT '0', "total_amount" numeric(10,2) NOT NULL DEFAULT '0', "amount_paid" numeric(10,2) NOT NULL DEFAULT '0', "balance" numeric(10,2) NOT NULL DEFAULT '0', "status" "invoices_status_enum" NOT NULL DEFAULT 'unpaid', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"));

CREATE INDEX "IDX_440f531f452dcc4389d201b9d4" ON "invoices" ("tenant_id") ;

CREATE INDEX "IDX_8b333697b0bc29422bac081ff1" ON "invoices" ("renter_id") ;

CREATE TABLE "journal_entries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "entry_number" character varying(40) NOT NULL, "entry_date" date NOT NULL, "description" character varying(255) NOT NULL, "source_type" character varying(40) NOT NULL, "source_id" uuid NOT NULL, "source_expense_id" uuid, "reversal_of_entry_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a70368e64230434457c8d007ab3" PRIMARY KEY ("id"));

CREATE INDEX "IDX_58fffc97d300e8164ccd16fc06" ON "journal_entries" ("tenant_id") ;

CREATE INDEX "IDX_8f41645c13f44b5244b8f01b97" ON "journal_entries" ("entry_date") ;

CREATE INDEX "IDX_fb831f5876ad7c9a3f8505d28a" ON "journal_entries" ("source_expense_id") ;

CREATE UNIQUE INDEX "uq_journal_entries_source" ON "journal_entries" ("tenant_id", "source_type", "source_id") ;

CREATE TABLE "journal_entry_lines" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "entry_id" uuid NOT NULL, "account_id" uuid NOT NULL, "renter_id" uuid, "invoice_id" uuid, "line_number" integer NOT NULL, "description" character varying(255), "debit" numeric(12,2) NOT NULL DEFAULT '0', "credit" numeric(12,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_b2f60e3664cd9803a829fb61aa4" PRIMARY KEY ("id"));

CREATE INDEX "IDX_547246161e8893f22adace614b" ON "journal_entry_lines" ("tenant_id") ;

CREATE INDEX "IDX_da1a24b21015a5b635f67b5f49" ON "journal_entry_lines" ("entry_id") ;

CREATE INDEX "IDX_bb29664b7e826a12438a96905c" ON "journal_entry_lines" ("renter_id") ;

CREATE INDEX "idx_journal_lines_tenant_account" ON "journal_entry_lines" ("tenant_id", "account_id") ;

CREATE UNIQUE INDEX "uq_journal_lines_entry_line" ON "journal_entry_lines" ("entry_id", "line_number") ;

CREATE TYPE "leads_stage_enum" AS ENUM('new', 'contacted', 'touring', 'converted', 'lost');

CREATE TABLE "leads" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "full_name" character varying(150) NOT NULL, "contact_info" character varying(190), "source" character varying(100), "stage" "leads_stage_enum" NOT NULL DEFAULT 'new', "notes" text, "follow_up_at" date, "renter_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cd102ed7a9a4ca7d4d8bfeba406" PRIMARY KEY ("id"));

CREATE INDEX "IDX_2440046dd05066e882bb68a780" ON "leads" ("tenant_id") ;

CREATE TABLE "lease_occupants" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "lease_id" uuid NOT NULL, "renter_id" uuid NOT NULL, "is_primary" boolean NOT NULL DEFAULT '0', CONSTRAINT "PK_c7edc1fdaa61ec33b61b9578c1a" PRIMARY KEY ("id"));

CREATE TYPE "leases_status_enum" AS ENUM('draft', 'active', 'expired', 'terminated', 'renewed');

CREATE TABLE "leases" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "unit_id" uuid NOT NULL, "bed_id" uuid, "start_date" date NOT NULL, "end_date" date, "payment_schedule_through" date, "monthly_rent" numeric(10,2) NOT NULL, "billing_timing" text NOT NULL DEFAULT 'arrears', "first_month_policy" text NOT NULL DEFAULT 'none', "security_deposit" numeric(10,2) NOT NULL DEFAULT '0', "advance_rent" numeric(10,2) NOT NULL DEFAULT '0', "billing_day" integer NOT NULL DEFAULT '1', "grace_period_days" integer NOT NULL DEFAULT '0', "status" "leases_status_enum" NOT NULL DEFAULT 'draft', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2668e338ab2d27079170ea55ea2" PRIMARY KEY ("id"));

CREATE INDEX "IDX_b4787e839c9c76e31d5a06aa3c" ON "leases" ("tenant_id") ;

CREATE INDEX "IDX_74490d0e8132cb49ede07d898c" ON "leases" ("unit_id") ;

CREATE TABLE "maintenance_attachments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "maintenance_request_id" uuid NOT NULL, "file_name" character varying(255) NOT NULL, "file_url" character varying(500) NOT NULL, "file_type" character varying(50), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_909f919f7b948ee0dab2dbfa25c" PRIMARY KEY ("id"));

CREATE INDEX "IDX_73e8d2d9a9f5a3576751f09bed" ON "maintenance_attachments" ("maintenance_request_id") ;

CREATE TYPE "maintenance_requests_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent');

CREATE TYPE "maintenance_requests_status_enum" AS ENUM('open', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled');

CREATE TABLE "maintenance_requests" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "property_id" uuid NOT NULL, "unit_id" uuid, "renter_id" uuid, "category" character varying(100), "title" character varying(150) NOT NULL, "description" text, "priority" "maintenance_requests_priority_enum" NOT NULL DEFAULT 'medium', "status" "maintenance_requests_status_enum" NOT NULL DEFAULT 'open', "reported_at" TIMESTAMP NOT NULL, "completed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c1521eb67c471accae8c531f9fe" PRIMARY KEY ("id"));

CREATE INDEX "IDX_42bdf962a8e2790aaed8379757" ON "maintenance_requests" ("tenant_id") ;

CREATE INDEX "IDX_0330e7473e867931548e20dc4a" ON "maintenance_requests" ("status") ;

CREATE TABLE "maintenance_status_history" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "maintenance_request_id" uuid NOT NULL, "status" character varying(30) NOT NULL, "changed_at" TIMESTAMP NOT NULL DEFAULT now(), "changed_by" character(36), CONSTRAINT "PK_bbc3ddabc0aa6edd8b519208ab2" PRIMARY KEY ("id"));

CREATE INDEX "IDX_4e3e72e80168d604ecded54a38" ON "maintenance_status_history" ("maintenance_request_id") ;

CREATE TYPE "marketing_campaigns_status_enum" AS ENUM('active', 'ended');

CREATE TABLE "marketing_campaigns" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "channel" character varying(100), "budget" numeric(10,2) NOT NULL DEFAULT '0', "status" "marketing_campaigns_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2601ceb29654c2a8adfddf2abbf" PRIMARY KEY ("id"));

CREATE INDEX "IDX_3e858a6fc0e4543a3baf7a1e1f" ON "marketing_campaigns" ("tenant_id") ;

CREATE TYPE "messages_sender_type_enum" AS ENUM('staff', 'renter');

CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "renter_id" uuid NOT NULL, "sender_type" "messages_sender_type_enum" NOT NULL, "sender_id" uuid NOT NULL, "body" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"));

CREATE INDEX "IDX_558150f45586066db2415eb28c" ON "messages" ("tenant_id") ;

CREATE INDEX "IDX_25564b2e57c0b895ae36d4fbe6" ON "messages" ("renter_id") ;

CREATE TYPE "notifications_recipient_type_enum" AS ENUM('staff', 'renter');

CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "recipient_type" "notifications_recipient_type_enum" NOT NULL, "recipient_id" uuid NOT NULL, "title" character varying(150) NOT NULL, "body" text, "dedupe_key" character varying(190), "is_read" boolean NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"));

CREATE INDEX "IDX_d93ddd7e1b890535ecafbb334e" ON "notifications" ("tenant_id") ;

CREATE INDEX "IDX_5332a4daa46fd3f4e6625dd275" ON "notifications" ("recipient_id") ;

CREATE UNIQUE INDEX "uq_notifications_tenant_dedupe" ON "notifications" ("tenant_id", "dedupe_key") ;

CREATE TABLE "payment_attachments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "payment_id" uuid NOT NULL, "file_url" character varying(500) NOT NULL, "file_type" character varying(50), "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f442fa837f254165ee18ead673d" PRIMARY KEY ("id"));

CREATE INDEX "IDX_57883f3e337841af14e1c836cc" ON "payment_attachments" ("payment_id") ;

CREATE TABLE "payment_transactions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "payment_id" uuid NOT NULL, "external_reference" character varying(100), "gateway_response" json, "status" character varying(50), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d32b3c6b0d2c1d22604cbcc8c49" PRIMARY KEY ("id"));

CREATE INDEX "IDX_1f4dd90aece142a3a591cf4334" ON "payment_transactions" ("payment_id") ;

CREATE TYPE "payments_payment_method_enum" AS ENUM('cash', 'gcash', 'maya', 'bank_transfer', 'card', 'other');

CREATE TYPE "payments_status_enum" AS ENUM('pending', 'completed', 'failed', 'refunded');

CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "invoice_id" uuid, "renter_id" uuid NOT NULL, "reference_number" character varying(50) NOT NULL, "amount" numeric(10,2) NOT NULL, "request_key" uuid, "payment_method" "payments_payment_method_enum" NOT NULL DEFAULT 'cash', "gateway" character varying(50), "paid_at" TIMESTAMP NOT NULL, "status" "payments_status_enum" NOT NULL DEFAULT 'pending', "purpose" character varying(30) NOT NULL DEFAULT 'invoice', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"));

CREATE INDEX "IDX_9109b53fca5cef7720aca72974" ON "payments" ("tenant_id") ;

CREATE INDEX "IDX_57c097a5a14e798e36ce0392a6" ON "payments" ("renter_id") ;

CREATE TYPE "properties_status_enum" AS ENUM('active', 'inactive');

CREATE TABLE "properties" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "address" character varying(255), "image_1_url" character varying(500), "image_2_url" character varying(500), "total_rooms" integer NOT NULL DEFAULT '0', "status" "properties_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2d83bfa0b9fcd45dee1785af44d" PRIMARY KEY ("id"));

CREATE INDEX "IDX_6bcd5c3d46689610c9bbf14e0e" ON "properties" ("tenant_id") ;

CREATE TABLE "receipts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "payment_id" uuid NOT NULL, "receipt_number" character varying(30) NOT NULL, "issued_at" TIMESTAMP NOT NULL DEFAULT now(), "file_url" character varying(500), CONSTRAINT "PK_5e8182d7c29e023da6e1ff33bfe" PRIMARY KEY ("id"));

CREATE TYPE "renters_status_enum" AS ENUM('active', 'moved_out', 'pending', 'for_move_in');

CREATE TABLE "renters" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_code" character varying(30), "tenant_id" uuid NOT NULL, "property_id" uuid, "unit_id" uuid, "full_name" character varying(150) NOT NULL, "email" character varying(190), "phone" character varying(30), "profile_picture_url" character varying(500), "birth_date" date, "gender" character varying(20), "emergency_contact_name" character varying(150), "emergency_contact_phone" character varying(30), "password_hash" character varying(255), "status" "renters_status_enum" NOT NULL DEFAULT 'pending', "move_in_date" date, "move_out_date" date, "payment_due_date" date, "portal_invited_at" TIMESTAMP, "credential_version" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6227c974d2f3c7ce77f208147ca" PRIMARY KEY ("id"));

CREATE INDEX "IDX_168b451b14cb55812dc4da1231" ON "renters" ("tenant_id") ;

CREATE INDEX "IDX_2f536846d156b168a07c9600f2" ON "renters" ("property_id") ;

CREATE INDEX "IDX_29b52f0386adc1615be1c637bc" ON "renters" ("unit_id") ;

CREATE UNIQUE INDEX "IDX_2a9f1808afebc05886ccebb87d" ON "renters" ("tenant_id", "email") ;

CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid, "name" character varying(50) NOT NULL, "description" character varying(255), "permissions" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"));

CREATE INDEX "IDX_e59a01f4fe46ebbece575d9a0f" ON "roles" ("tenant_id") ;

CREATE TYPE "rooms_status_enum" AS ENUM('vacant', 'occupied', 'maintenance');

CREATE TABLE "rooms" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "property_id" uuid NOT NULL, "room_number" character varying(50) NOT NULL, "capacity" integer NOT NULL DEFAULT '1', "rate" numeric(10,2) NOT NULL DEFAULT '0', "status" "rooms_status_enum" NOT NULL DEFAULT 'vacant', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id"));

CREATE INDEX "IDX_34fa57c19c5802bc1fa4d57fe1" ON "rooms" ("tenant_id") ;

CREATE INDEX "IDX_f3a3e21cdec3d9f8069edf6f52" ON "rooms" ("property_id") ;

CREATE UNIQUE INDEX "IDX_856e24445b9e0b7e35bf1e6390" ON "rooms" ("property_id", "room_number") ;

CREATE TYPE "tenants_status_enum" AS ENUM('active', 'suspended');

CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(150) NOT NULL, "slug" character varying(100) NOT NULL, "status" "tenants_status_enum" NOT NULL DEFAULT 'active', "plan" character varying(50) NOT NULL DEFAULT 'trial', "contact_email" character varying(190), "contact_phone" character varying(30), "timezone" character varying(100) NOT NULL DEFAULT 'Asia/Manila', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE ("slug"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"));

CREATE TYPE "units_type_enum" AS ENUM('apartment', 'condo', 'commercial', 'dorm_room', 'other');

CREATE TYPE "units_status_enum" AS ENUM('vacant', 'occupied', 'reserved', 'maintenance', 'inactive');

CREATE TABLE "units" ("id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "property_id" uuid NOT NULL, "unit_number" character varying(50) NOT NULL, "image_1_url" character varying(500), "image_2_url" character varying(500), "floor" character varying(20), "type" "units_type_enum" NOT NULL DEFAULT 'other', "bedrooms" integer, "bathrooms" integer, "area_sqm" numeric(8,2), "monthly_rate" numeric(10,2) NOT NULL DEFAULT '0', "status" "units_status_enum" NOT NULL DEFAULT 'vacant', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5a8f2f064919b587d93936cb223" PRIMARY KEY ("id"));

CREATE INDEX "IDX_dfc3fe2db03af2e60601ca2685" ON "units" ("tenant_id") ;

CREATE INDEX "IDX_f221e6d7bfd686266003b982b5" ON "units" ("property_id") ;

CREATE TYPE "users_role_enum" AS ENUM('super_admin', 'owner', 'manager', 'staff');

CREATE TYPE "users_status_enum" AS ENUM('active', 'disabled');

CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid, "email" character varying(190) NOT NULL, "password_hash" character varying(255) NOT NULL, "full_name" character varying(150) NOT NULL, "profile_picture_url" character varying(500), "role" "users_role_enum" NOT NULL, "status" "users_status_enum" NOT NULL DEFAULT 'active', "access_role_id" uuid, "credential_version" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "IDX_e9f4c2efab52114c4e99e28efb" ON "users" ("tenant_id", "email") ;

CREATE TYPE "utility_charges_status_enum" AS ENUM('unbilled', 'invoiced');

CREATE TABLE "utility_charges" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "unit_id" uuid NOT NULL, "lease_id" uuid, "utility_type" character varying(50) NOT NULL, "billing_period" character varying(50) NOT NULL, "amount" numeric(10,2) NOT NULL, "status" "utility_charges_status_enum" NOT NULL DEFAULT 'unbilled', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5831faaab577a326cdfa2677af9" PRIMARY KEY ("id"));

CREATE INDEX "IDX_7f35abae0532e1669e8221f770" ON "utility_charges" ("tenant_id") ;

CREATE INDEX "IDX_7bfa165788cdc198d60b822046" ON "utility_charges" ("billing_period") ;

CREATE TYPE "utility_meters_type_enum" AS ENUM('electricity', 'water', 'internet', 'other');

CREATE TYPE "utility_meters_status_enum" AS ENUM('active', 'inactive');

CREATE TABLE "utility_meters" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "unit_id" uuid NOT NULL, "type" "utility_meters_type_enum" NOT NULL, "meter_number" character varying(50), "status" "utility_meters_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dd4ca10a699292a84688444b88f" PRIMARY KEY ("id"));

CREATE INDEX "IDX_bc4cdf43cb6c78eab683dca61e" ON "utility_meters" ("tenant_id") ;

CREATE INDEX "IDX_f4d9c461258314cea074443868" ON "utility_meters" ("unit_id") ;

CREATE TABLE "utility_readings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "meter_id" uuid NOT NULL, "reading_date" date NOT NULL, "previous_reading" numeric(12,2) NOT NULL DEFAULT '0', "current_reading" numeric(12,2) NOT NULL, "consumption" numeric(12,2) NOT NULL, "rate" numeric(10,4) NOT NULL, "amount" numeric(10,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f30790235a61b9a95c339786cc9" PRIMARY KEY ("id"));

CREATE INDEX "IDX_0b66b8e109ff0537b4ed938065" ON "utility_readings" ("meter_id") ;

CREATE TABLE "vehicles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "renter_id" uuid NOT NULL, "plate_number" character varying(30) NOT NULL, "make" character varying(50), "model" character varying(50), "color" character varying(30), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"));

CREATE INDEX "IDX_83421ac7781fdc9554f5256841" ON "vehicles" ("tenant_id") ;

CREATE TYPE "vendors_status_enum" AS ENUM('active', 'inactive');

CREATE TABLE "vendors" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "service_type" character varying(100), "contact_person" character varying(150), "phone" character varying(30), "email" character varying(190), "address" character varying(255), "status" "vendors_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c956c9797edfae5c6ddacc4e6e" PRIMARY KEY ("id"));

CREATE INDEX "IDX_b362795545b91a886939d70bea" ON "vendors" ("tenant_id") ;

CREATE TYPE "visitors_status_enum" AS ENUM('expected', 'checked_in', 'checked_out', 'cancelled');

CREATE TABLE "visitors" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "property_id" uuid NOT NULL, "renter_id" uuid, "name" character varying(150) NOT NULL, "phone" character varying(30), "purpose" character varying(255), "expected_at" TIMESTAMP, "checked_in_at" TIMESTAMP, "checked_out_at" TIMESTAMP, "status" "visitors_status_enum" NOT NULL DEFAULT 'expected', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d0fd6e34a516c2bb3bbec71abde" PRIMARY KEY ("id"));

CREATE INDEX "IDX_420c269d0cea337d6c1dafd524" ON "visitors" ("tenant_id") ;

CREATE TYPE "work_orders_status_enum" AS ENUM('pending', 'scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE "work_orders" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "maintenance_request_id" uuid NOT NULL, "vendor_id" uuid, "assigned_user_id" uuid, "scheduled_at" TIMESTAMP, "scheduled_end_at" TIMESTAMP, "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "labor_cost" numeric(10,2) NOT NULL DEFAULT '0', "material_cost" numeric(10,2) NOT NULL DEFAULT '0', "description" text, "status" "work_orders_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_29f6c1884082ee6f535aed93660" PRIMARY KEY ("id"));

CREATE INDEX "IDX_0059be3d968bef25dcf779f043" ON "work_orders" ("tenant_id") ;

CREATE INDEX "IDX_291a907335617e13456451f4c3" ON "work_orders" ("maintenance_request_id") ;

-- Non-ORM structures from 020_google_drive_storage.sql

CREATE TABLE IF NOT EXISTS drive_connections (
 tenant_id text PRIMARY KEY, owner_id text NOT NULL, folder_id text NOT NULL,
 refresh_token text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS drive_oauth_states (
 state text PRIMARY KEY, tenant_id text NOT NULL, owner_id text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS drive_files (
 id text PRIMARY KEY, tenant_id text NOT NULL, drive_id text NOT NULL UNIQUE,
 category text NOT NULL, owner_type text NOT NULL, owner_id text NOT NULL,
 file_name text NOT NULL, mime_type text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drive_files_tenant_idx ON drive_files(tenant_id);


-- Non-ORM structures from 023_platform_subscriptions_crm.sql

CREATE TABLE IF NOT EXISTS platform_subscriptions (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id), plan varchar(20) NOT NULL CHECK(plan IN ('starter','business','portfolio','enterprise')), cycle varchar(10) NOT NULL DEFAULT 'monthly' CHECK(cycle IN ('monthly','annual')),
 billing_day integer CHECK(billing_day BETWEEN 1 AND 31), trial_ends date NOT NULL DEFAULT (CURRENT_DATE + 14), paid_through date, cancel_at_end boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS billing_day integer CHECK(billing_day BETWEEN 1 AND 31);
CREATE TABLE IF NOT EXISTS platform_subscription_payments (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), plan varchar(20) NOT NULL, cycle varchar(10) NOT NULL,
 amount_usd numeric(12,2) NOT NULL CHECK(amount_usd>0), method varchar(20) NOT NULL CHECK(method IN ('gcash','maya','bank_transfer')),
 reference varchar(150) NOT NULL, status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
 submitted_by varchar(36) NOT NULL, reviewed_by varchar(36), review_note varchar(1000), actual_currency varchar(3) NOT NULL DEFAULT 'USD', actual_amount numeric(12,2) NOT NULL CHECK(actual_amount>0),
 period_start date, period_end date, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS platform_payment_reference ON platform_subscription_payments(tenant_id,method,reference);
CREATE UNIQUE INDEX IF NOT EXISTS platform_payment_one_pending ON platform_subscription_payments(tenant_id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS platform_sales_leads (
 id uuid PRIMARY KEY, name varchar(150) NOT NULL, email varchar(190) NOT NULL, phone varchar(30), business_name varchar(150), spaces integer,
 plan varchar(20), stage varchar(20) NOT NULL DEFAULT 'new' CHECK(stage IN ('new','contacted','qualified','demo','proposal','won','lost')),
 notes varchar(4000), follow_up date, tenant_id uuid REFERENCES tenants(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_support_tickets (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), subject varchar(200) NOT NULL, description varchar(4000) NOT NULL,
 category varchar(30) NOT NULL CHECK(category IN ('billing','account','storage','technical','other')), priority varchar(20) NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
 status varchar(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','waiting_customer','resolved','closed')),
 created_by varchar(36) NOT NULL, assigned_to varchar(36), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_support_replies (
 id uuid PRIMARY KEY, ticket_id uuid NOT NULL REFERENCES platform_support_tickets(id), author_id varchar(36) NOT NULL, author_type varchar(10) NOT NULL CHECK(author_type IN ('owner','admin')),
 body varchar(4000) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_billing_notices (tenant_id uuid NOT NULL REFERENCES tenants(id), notice_date date NOT NULL, PRIMARY KEY(tenant_id,notice_date));
-- Serialize capacity checks with the tenant row so concurrent inventory requests cannot exceed a plan.
CREATE OR REPLACE FUNCTION platform_capacity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE max_spaces integer; total_spaces integer;
BEGIN
 PERFORM id FROM tenants WHERE id::text=NEW.tenant_id::text FOR UPDATE;
 SELECT CASE plan WHEN 'starter' THEN 10 WHEN 'business' THEN 40 WHEN 'portfolio' THEN 100 ELSE NULL END INTO max_spaces FROM platform_subscriptions WHERE tenant_id::text=NEW.tenant_id::text;
 IF max_spaces IS NOT NULL THEN
  SELECT (SELECT COUNT(*) FROM beds WHERE tenant_id::text=NEW.tenant_id::text)+(SELECT COUNT(*) FROM units u WHERE u.tenant_id::text=NEW.tenant_id::text AND NOT EXISTS(SELECT 1 FROM beds b WHERE b.unit_id::text=u.id::text AND b.tenant_id::text=NEW.tenant_id::text)) INTO total_spaces;
  IF total_spaces>max_spaces THEN RAISE EXCEPTION 'Rentable-space subscription limit reached' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS platform_unit_capacity ON units;
CREATE TRIGGER platform_unit_capacity AFTER INSERT OR UPDATE ON units FOR EACH ROW EXECUTE FUNCTION platform_capacity_guard();
DROP TRIGGER IF EXISTS platform_bed_capacity ON beds;
CREATE TRIGGER platform_bed_capacity AFTER INSERT OR UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION platform_capacity_guard();
-- Existing businesses without subscription rows keep legacy access until explicitly enrolled.


-- Non-ORM structures from 024_business_workspaces.sql

-- New tables use UUID tenant keys; existing char/uuid identifiers are compared as text in code.
CREATE TABLE IF NOT EXISTS business_workspaces (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id),
  enabled_modes text[] NOT NULL DEFAULT ARRAY['rental'],
  default_mode text NOT NULL DEFAULT 'rental',
  property_modes jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (enabled_modes <@ ARRAY['rental','hotel','short_stay','association']::text[]),
  CHECK (cardinality(enabled_modes)>0 AND default_mode=ANY(enabled_modes))
);
CREATE TABLE IF NOT EXISTS business_records (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id),
  kind text NOT NULL CHECK(kind IN ('reservation','membership','assessment','housekeeping')),
  data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_records_tenant_kind ON business_records(tenant_id,kind,created_at DESC);
CREATE TABLE IF NOT EXISTS renter_credit_movements (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), renter_id text NOT NULL,
  payment_id text NOT NULL, invoice_id text, amount numeric(10,2) NOT NULL CHECK(amount>0),
  action text NOT NULL CHECK(action IN ('apply','refund')), reason text NOT NULL,
  request_key uuid NOT NULL, actor_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,request_key)
);
CREATE INDEX IF NOT EXISTS credit_movements_payment ON renter_credit_movements(tenant_id,payment_id);
CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id),
  account text NOT NULL, external_id text NOT NULL, transaction_date date NOT NULL,
  cash_account text NOT NULL DEFAULT '1020' CHECK(cash_account IN ('1020','1030')),
  amount numeric(10,2) NOT NULL CHECK(amount<>0), reference text NOT NULL DEFAULT '',
  payment_id text, expense_id text, matched_by text, matched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,account,external_id),
  CHECK(NOT(payment_id IS NOT NULL AND expense_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS bank_line_payment_once ON bank_statement_lines(tenant_id,payment_id) WHERE payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bank_line_expense_once ON bank_statement_lines(tenant_id,expense_id) WHERE expense_id IS NOT NULL;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS billing_timing text NOT NULL DEFAULT 'arrears' CHECK(billing_timing IN ('arrears','advance'));
ALTER TABLE leases ADD COLUMN IF NOT EXISTS first_month_policy text NOT NULL DEFAULT 'none' CHECK(first_month_policy IN ('none','full','prorated'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS request_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS payments_request_once ON payments(tenant_id,request_key) WHERE request_key IS NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS request_key uuid;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS request_fingerprint text;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_request_once ON invoices(tenant_id,request_key) WHERE request_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS invoices_attention_idx ON invoices(tenant_id,status,due_date);
CREATE INDEX IF NOT EXISTS payments_attention_idx ON payments(tenant_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS leases_active_end_idx ON leases(tenant_id,status,end_date);


-- Additional integrity rules absent from ORM decorators.
ALTER TABLE erp_contacts ADD CONSTRAINT erp_contacts_name CHECK(length(trim(display_name))>0),
  ADD CONSTRAINT erp_contacts_kind CHECK(kind IN ('person','organization')),
  ADD CONSTRAINT erp_contacts_roles CHECK(cardinality(roles)>0 AND roles <@ ARRAY['owner','renter','guest','vendor','customer','staff']::text[]),
  ADD CONSTRAINT erp_contacts_status CHECK(status IN ('active','inactive')),
  ADD CONSTRAINT erp_contacts_version CHECK(version>0);
ALTER TABLE users ADD CONSTRAINT users_principal_scope CHECK((role='super_admin' AND tenant_id IS NULL) OR (role<>'super_admin' AND tenant_id IS NOT NULL));
CREATE UNIQUE INDEX users_platform_email ON users(lower(email)) WHERE tenant_id IS NULL;
ALTER TABLE leases ADD CONSTRAINT leases_dates CHECK(end_date IS NULL OR end_date>=start_date),
  ADD CONSTRAINT leases_billing_day CHECK(billing_day BETWEEN 1 AND 31),
  ADD CONSTRAINT leases_billing_timing CHECK(billing_timing IN ('arrears','advance')),
  ADD CONSTRAINT leases_first_month_policy CHECK(first_month_policy IN ('none','full','prorated'));
ALTER TABLE payments ADD CONSTRAINT payments_purpose CHECK(purpose IN ('invoice','security_deposit','advance_rent','unapplied'));
ALTER TABLE chart_of_accounts ADD CONSTRAINT chart_account_type CHECK(account_type IN ('asset','liability','equity','revenue','expense'));
ALTER TABLE journal_entry_lines ADD CONSTRAINT journal_line_amounts CHECK(debit>=0 AND credit>=0 AND NOT(debit>0 AND credit>0));
CREATE UNIQUE INDEX journal_entries_tenant_number ON journal_entries(tenant_id,entry_number);

-- Tenant ownership on every ORM table. Operational links are checked using
-- composite foreign keys so a valid record ID cannot point into another tenant.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='tenant_id'
      AND data_type='uuid' AND table_name NOT IN ('platform_sales_leads')
  LOOP
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY(tenant_id) REFERENCES tenants(id)',t.table_name,t.table_name||'_tenant_fk');
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.table_name AND column_name='id') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE(tenant_id,id)',t.table_name,t.table_name||'_tenant_id_unique');
    END IF;
  END LOOP;
END $$;

ALTER TABLE units ADD FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id);
ALTER TABLE rooms ADD FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id);
ALTER TABLE beds ADD FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id);
ALTER TABLE renters ADD FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id);
ALTER TABLE leases ADD FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,bed_id) REFERENCES beds(tenant_id,id);
ALTER TABLE lease_occupants ADD FOREIGN KEY(lease_id) REFERENCES leases(id),
  ADD FOREIGN KEY(renter_id) REFERENCES renters(id),
  ADD CONSTRAINT lease_occupants_pair UNIQUE(lease_id,renter_id);
CREATE FUNCTION erp_lease_occupant_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM leases l JOIN renters r ON r.tenant_id=l.tenant_id
    WHERE l.id=NEW.lease_id AND r.id=NEW.renter_id) THEN
    RAISE EXCEPTION 'Lease occupant must belong to the lease tenant' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER erp_lease_occupant_scope BEFORE INSERT OR UPDATE ON lease_occupants
  FOR EACH ROW EXECUTE FUNCTION erp_lease_occupant_scope();
ALTER TABLE invoices ADD FOREIGN KEY(tenant_id,renter_id) REFERENCES renters(tenant_id,id);
ALTER TABLE payments ADD FOREIGN KEY(tenant_id,renter_id) REFERENCES renters(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,invoice_id) REFERENCES invoices(tenant_id,id);
ALTER TABLE journal_entry_lines ADD FOREIGN KEY(tenant_id,entry_id) REFERENCES journal_entries(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,account_id) REFERENCES chart_of_accounts(tenant_id,id);
ALTER TABLE contracts ADD FOREIGN KEY(tenant_id,renter_id) REFERENCES renters(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,lease_id) REFERENCES leases(tenant_id,id);
ALTER TABLE users ADD FOREIGN KEY(tenant_id,access_role_id) REFERENCES roles(tenant_id,id);
ALTER TABLE billing_accounts ADD FOREIGN KEY(tenant_id,renter_id) REFERENCES renters(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id);
ALTER TABLE invoice_items ADD FOREIGN KEY(invoice_id) REFERENCES invoices(id);
ALTER TABLE payment_transactions ADD FOREIGN KEY(payment_id) REFERENCES payments(id);
ALTER TABLE receipts ADD FOREIGN KEY(payment_id) REFERENCES payments(id);
ALTER TABLE payment_attachments ADD FOREIGN KEY(payment_id) REFERENCES payments(id);
ALTER TABLE maintenance_requests ADD FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,renter_id) REFERENCES renters(tenant_id,id);
ALTER TABLE maintenance_attachments ADD FOREIGN KEY(maintenance_request_id) REFERENCES maintenance_requests(id);
ALTER TABLE maintenance_status_history ADD FOREIGN KEY(maintenance_request_id) REFERENCES maintenance_requests(id);
ALTER TABLE work_orders ADD FOREIGN KEY(tenant_id,maintenance_request_id) REFERENCES maintenance_requests(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,vendor_id) REFERENCES vendors(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,assigned_user_id) REFERENCES users(tenant_id,id);
ALTER TABLE utility_meters ADD FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id);
ALTER TABLE utility_readings ADD FOREIGN KEY(meter_id) REFERENCES utility_meters(id);
ALTER TABLE utility_charges ADD FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,lease_id) REFERENCES leases(tenant_id,id);
ALTER TABLE amenities ADD FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id);
ALTER TABLE amenity_bookings ADD FOREIGN KEY(tenant_id,amenity_id) REFERENCES amenities(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,renter_id) REFERENCES renters(tenant_id,id);
ALTER TABLE expenses ADD FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id),
  ADD FOREIGN KEY(tenant_id,vendor_id) REFERENCES vendors(tenant_id,id);


-- Retail foundation

CREATE TABLE retail_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 sku varchar(60) NOT NULL CHECK(length(trim(sku))>0), name varchar(150) NOT NULL CHECK(length(trim(name))>0),
 unit varchar(20) NOT NULL DEFAULT 'piece', selling_price numeric(12,2) NOT NULL CHECK(selling_price>=0),
 currency varchar(3) NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,sku), UNIQUE(tenant_id,id)
);
CREATE TABLE retail_stock_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), product_id uuid NOT NULL,
 quantity integer NOT NULL CHECK(quantity<>0), reason varchar(500) NOT NULL CHECK(length(trim(reason))>0),
 request_key uuid NOT NULL, actor_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id), UNIQUE(tenant_id,request_key)
);
CREATE INDEX retail_stock_product ON retail_stock_movements(tenant_id,product_id,created_at);
-- No billing, valuation, purchase order or POS posting is performed by stock entries.


-- Food and hospitality foundation

-- Existing contact installs predate the baseline's composite ownership key.
CREATE UNIQUE INDEX IF NOT EXISTS food_contacts_scope ON erp_contacts(tenant_id,id);
CREATE TABLE food_menu_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 name varchar(150) NOT NULL CHECK(length(trim(name))>0),category varchar(80) NOT NULL DEFAULT 'General',
 price numeric(10,2) NOT NULL CHECK(price>=0 AND price<=999999.99),currency varchar(3) NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 status varchar(20) NOT NULL DEFAULT 'available' CHECK(status IN ('available','unavailable')),
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id)
);
CREATE TABLE food_dining_tables (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 name varchar(60) NOT NULL CHECK(length(trim(name))>0),seats integer NOT NULL CHECK(seats BETWEEN 1 AND 100),
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 version integer NOT NULL DEFAULT 1,UNIQUE(tenant_id,name),UNIQUE(tenant_id,id)
);
CREATE TABLE food_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 channel varchar(20) NOT NULL CHECK(channel IN ('dine_in','takeaway')),table_id uuid,contact_id uuid,
 guest_name varchar(150),notes varchar(1000),
 status varchar(20) NOT NULL DEFAULT 'new' CHECK(status IN ('new','preparing','ready','served','cancelled')),
 total numeric(12,2) NOT NULL CHECK(total>=0),currency varchar(3) NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 request_key uuid NOT NULL,request_fingerprint text NOT NULL,version integer NOT NULL DEFAULT 1,created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((channel='dine_in' AND table_id IS NOT NULL) OR (channel='takeaway' AND table_id IS NULL)),
 FOREIGN KEY(tenant_id,table_id) REFERENCES food_dining_tables(tenant_id,id),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,id)
);
CREATE UNIQUE INDEX food_one_active_order_per_table ON food_orders(tenant_id,table_id) WHERE status IN ('new','preparing','ready');
CREATE INDEX food_orders_queue ON food_orders(tenant_id,status,created_at);
CREATE TABLE food_order_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),order_id uuid NOT NULL,menu_item_id uuid NOT NULL,
 item_name varchar(150) NOT NULL,quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 999),unit_price numeric(10,2) NOT NULL CHECK(unit_price>=0),
 FOREIGN KEY(tenant_id,order_id) REFERENCES food_orders(tenant_id,id),FOREIGN KEY(tenant_id,menu_item_id) REFERENCES food_menu_items(tenant_id,id),UNIQUE(order_id,menu_item_id)
);


-- Professional services foundation

CREATE UNIQUE INDEX IF NOT EXISTS services_contacts_scope ON erp_contacts(tenant_id,id);
CREATE TABLE service_engagements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),client_id uuid NOT NULL,
 title varchar(150) NOT NULL CHECK(length(trim(title))>0),description varchar(2000),assignee_id text,
 hourly_rate numeric(10,2) NOT NULL CHECK(hourly_rate BETWEEN 0 AND 999999.99),currency varchar(3) NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','completed','cancelled')),
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,client_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,id)
);
CREATE TABLE service_time_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),engagement_id uuid NOT NULL,
 staff_id text NOT NULL,work_date date NOT NULL,minutes integer NOT NULL CHECK(minutes BETWEEN 1 AND 1440),
 description varchar(1000) NOT NULL CHECK(length(trim(description))>0),hourly_rate numeric(10,2) NOT NULL CHECK(hourly_rate>=0),
 status varchar(20) NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),
 reviewed_by text,review_note varchar(500),reviewed_at timestamptz,request_key uuid NOT NULL,request_fingerprint text NOT NULL,
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,engagement_id) REFERENCES service_engagements(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE INDEX service_time_engagement ON service_time_entries(tenant_id,engagement_id,work_date);


-- Trades foundation

CREATE UNIQUE INDEX IF NOT EXISTS trades_contacts_scope ON erp_contacts(tenant_id,id);
CREATE TABLE trade_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),customer_id uuid NOT NULL,
 title varchar(150) NOT NULL CHECK(length(trim(title))>0),description varchar(2000),site_address varchar(255) NOT NULL CHECK(length(trim(site_address))>0),
 technician_id text,scheduled_start timestamptz NOT NULL,scheduled_end timestamptz NOT NULL CHECK(scheduled_end>scheduled_start),
 estimated_amount numeric(12,2) NOT NULL CHECK(estimated_amount>=0),currency varchar(3) NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','in_progress','completed','cancelled')),
 completion_note varchar(2000),started_at timestamptz,completed_at timestamptz,
 request_key uuid NOT NULL,request_fingerprint text NOT NULL,version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,customer_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,id)
);
CREATE INDEX trade_jobs_dispatch ON trade_jobs(tenant_id,technician_id,scheduled_start,scheduled_end);
CREATE TABLE trade_job_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),job_id uuid NOT NULL,
 status varchar(20) NOT NULL,notes varchar(2000) NOT NULL,actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,job_id) REFERENCES trade_jobs(tenant_id,id)
);


-- Health and fitness foundation

CREATE UNIQUE INDEX IF NOT EXISTS fitness_contacts_scope ON erp_contacts(tenant_id,id);
CREATE TABLE fitness_memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),contact_id uuid NOT NULL,
 label varchar(100) NOT NULL CHECK(length(trim(label))>0),start_date date NOT NULL,end_date date NOT NULL CHECK(end_date>=start_date),
 fee numeric(12,2) NOT NULL CHECK(fee>=0),currency varchar(3) NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled')),version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id)
);
CREATE INDEX fitness_membership_contact ON fitness_memberships(tenant_id,contact_id,start_date,end_date);
CREATE TABLE fitness_classes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),title varchar(150) NOT NULL CHECK(length(trim(title))>0),
 instructor_id text NOT NULL,venue varchar(150) NOT NULL CHECK(length(trim(venue))>0),
 starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 500),
 status varchar(20) NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','cancelled')),version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id)
);
CREATE TABLE fitness_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),class_id uuid NOT NULL,contact_id uuid NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),request_key uuid NOT NULL,version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),cancelled_at timestamptz,
 FOREIGN KEY(tenant_id,class_id) REFERENCES fitness_classes(tenant_id,id),FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX fitness_one_booking ON fitness_bookings(tenant_id,class_id,contact_id) WHERE status='confirmed';


-- Manufacturing foundation

CREATE UNIQUE INDEX IF NOT EXISTS manufacturing_stock_scope ON retail_stock_movements(tenant_id,id);
CREATE TABLE manufacturing_boms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),product_id uuid NOT NULL,
 name varchar(150) NOT NULL CHECK(length(trim(name))>0),created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),UNIQUE(tenant_id,id)
);
CREATE TABLE manufacturing_bom_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),bom_id uuid NOT NULL,component_id uuid NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 FOREIGN KEY(tenant_id,bom_id) REFERENCES manufacturing_boms(tenant_id,id),FOREIGN KEY(tenant_id,component_id) REFERENCES retail_products(tenant_id,id),UNIQUE(bom_id,component_id)
);
CREATE TABLE manufacturing_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),bom_id uuid NOT NULL,product_id uuid NOT NULL,
 product_name varchar(150) NOT NULL,bom_name varchar(150) NOT NULL,quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','in_progress','completed','cancelled')),
 version integer NOT NULL DEFAULT 1,request_key uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),started_at timestamptz,completed_at timestamptz,
 FOREIGN KEY(tenant_id,bom_id) REFERENCES manufacturing_boms(tenant_id,id),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,id)
);
CREATE TABLE manufacturing_order_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),order_id uuid NOT NULL,component_id uuid NOT NULL,
 component_name varchar(150) NOT NULL,quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000000),
 FOREIGN KEY(tenant_id,order_id) REFERENCES manufacturing_orders(tenant_id,id),FOREIGN KEY(tenant_id,component_id) REFERENCES retail_products(tenant_id,id),UNIQUE(order_id,component_id)
);
CREATE TABLE manufacturing_stock_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),order_id uuid NOT NULL,movement_id uuid NOT NULL,
 product_id uuid NOT NULL,kind varchar(20) NOT NULL CHECK(kind IN ('consumed','produced')),
 FOREIGN KEY(tenant_id,order_id) REFERENCES manufacturing_orders(tenant_id,id),FOREIGN KEY(tenant_id,movement_id) REFERENCES retail_stock_movements(tenant_id,id),
 FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),UNIQUE(order_id,product_id,kind),UNIQUE(movement_id)
);


-- Other industries foundation

CREATE UNIQUE INDEX IF NOT EXISTS other_contacts_scope ON erp_contacts(tenant_id,id);
CREATE TABLE business_activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 title varchar(150) NOT NULL CHECK(length(trim(title))>0),category varchar(80) NOT NULL CHECK(length(trim(category))>0),
 contact_id uuid,assignee_id text,due_date date,description varchar(2000),
 status varchar(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','completed','cancelled')),
 version integer NOT NULL DEFAULT 1,request_key uuid NOT NULL,request_fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,id)
);
CREATE INDEX business_activities_due ON business_activities(tenant_id,status,due_date);
CREATE TABLE business_activity_updates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),activity_id uuid NOT NULL,
 status varchar(20) NOT NULL,notes varchar(2000) NOT NULL CHECK(length(trim(notes))>0),actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,activity_id) REFERENCES business_activities(tenant_id,id)
);


-- Tenant foundation builder

CREATE TABLE tenant_foundations (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id),industry_id varchar(60) NOT NULL,template_id varchar(80) NOT NULL,
 blocks text[] NOT NULL CHECK(cardinality(blocks)>0),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_by text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE platform_sales_leads ADD COLUMN foundation jsonb;


-- Retail order and payroll workflows

CREATE TABLE retail_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 kind varchar(10) NOT NULL CHECK(kind IN ('sale','purchase')),contact_id uuid NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','confirmed','completed','cancelled')),
 total numeric(12,2) NOT NULL CHECK(total>0),notes varchar(2000),version integer NOT NULL DEFAULT 1,
 request_key uuid NOT NULL,request_fingerprint text NOT NULL,created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE TABLE retail_order_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),order_id uuid NOT NULL,product_id uuid NOT NULL,
 sku varchar(60) NOT NULL,product_name varchar(150) NOT NULL,quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 unit_price numeric(12,2) NOT NULL CHECK(unit_price>0),
 FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),UNIQUE(order_id,product_id)
);
CREATE TABLE retail_order_settlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),order_id uuid NOT NULL,
 amount numeric(12,2) NOT NULL CHECK(amount>0),method varchar(20) NOT NULL CHECK(method IN ('cash','bank_transfer','gcash','maya')),
 reference varchar(150) NOT NULL,request_key uuid NOT NULL,request_fingerprint text NOT NULL,actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,method,reference)
);
CREATE TABLE retail_payroll_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),label varchar(150) NOT NULL,
 period_start date NOT NULL,period_end date NOT NULL CHECK(period_end>=period_start),
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','paid','cancelled')),
 gross numeric(12,2) NOT NULL CHECK(gross>0),deductions numeric(12,2) NOT NULL CHECK(deductions>=0 AND deductions<gross),net numeric(12,2) NOT NULL CHECK(net=gross-deductions),
 created_by text NOT NULL,approved_by text,version integer NOT NULL DEFAULT 1,request_key uuid NOT NULL,request_fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE TABLE retail_payroll_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),run_id uuid NOT NULL,employee_id text NOT NULL,
 employee_name varchar(150) NOT NULL,gross numeric(12,2) NOT NULL CHECK(gross>0),deductions numeric(12,2) NOT NULL CHECK(deductions>=0 AND deductions<gross),net numeric(12,2) NOT NULL CHECK(net=gross-deductions),
 FOREIGN KEY(tenant_id,run_id) REFERENCES retail_payroll_runs(tenant_id,id),UNIQUE(run_id,employee_id)
);
CREATE TABLE retail_payroll_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),run_id uuid NOT NULL,
 method varchar(20) NOT NULL CHECK(method IN ('cash','bank_transfer','gcash','maya')),reference varchar(150) NOT NULL,
 request_key uuid NOT NULL,request_fingerprint text NOT NULL,actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,run_id) REFERENCES retail_payroll_runs(tenant_id,id),UNIQUE(run_id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,method,reference)
);
CREATE INDEX retail_orders_queue ON retail_orders(tenant_id,kind,status,created_at);


-- Shared inventory and retail controls

CREATE TABLE erp_document_sequences (tenant_id uuid NOT NULL REFERENCES tenants(id),kind varchar(40) NOT NULL,period varchar(10) NOT NULL,next_number integer NOT NULL DEFAULT 1 CHECK(next_number>0),PRIMARY KEY(tenant_id,kind,period));
CREATE TABLE erp_accounting_periods (tenant_id uuid NOT NULL REFERENCES tenants(id),month varchar(7) NOT NULL CHECK(month~'^\d{4}-\d{2}$'),closed_by text NOT NULL,closed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,month));
CREATE OR REPLACE FUNCTION erp_closed_period_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;IF EXISTS(SELECT 1 FROM erp_accounting_periods WHERE tenant_id=NEW.tenant_id AND month=to_char(NEW.entry_date,'YYYY-MM')) THEN RAISE EXCEPTION 'Accounting period is closed';END IF;RETURN NEW;END $$;
CREATE TRIGGER erp_closed_period BEFORE INSERT ON journal_entries FOR EACH ROW EXECUTE FUNCTION erp_closed_period_guard();
CREATE TABLE erp_stock_locations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),code varchar(40) NOT NULL,name varchar(150) NOT NULL,is_default boolean NOT NULL DEFAULT false,status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),UNIQUE(tenant_id,code),UNIQUE(tenant_id,id));
CREATE UNIQUE INDEX erp_stock_one_default ON erp_stock_locations(tenant_id) WHERE is_default;
INSERT INTO erp_stock_locations(tenant_id,code,name,is_default) SELECT t.id,'MAIN','Main stock location',true FROM tenants t WHERE EXISTS(SELECT 1 FROM retail_products p WHERE p.tenant_id=t.id);
ALTER TABLE retail_products ADD COLUMN barcode varchar(80),ADD COLUMN category varchar(100),ADD COLUMN reorder_level integer NOT NULL DEFAULT 0 CHECK(reorder_level>=0);
CREATE UNIQUE INDEX retail_barcode_unique ON retail_products(tenant_id,barcode) WHERE barcode IS NOT NULL;
ALTER TABLE retail_stock_movements ADD COLUMN location_id uuid,ADD COLUMN cost_cents bigint,ADD COLUMN source_type varchar(40),ADD COLUMN source_id uuid;
UPDATE retail_stock_movements m SET location_id=l.id FROM erp_stock_locations l WHERE l.tenant_id=m.tenant_id AND l.is_default;
ALTER TABLE retail_stock_movements ADD FOREIGN KEY(tenant_id,location_id) REFERENCES erp_stock_locations(tenant_id,id);
CREATE TABLE erp_inventory_settings (tenant_id uuid PRIMARY KEY REFERENCES tenants(id),costing varchar(30) NOT NULL DEFAULT 'periodic' CHECK(costing IN ('periodic','weighted_average')),opening_request_key uuid,opening_fingerprint text,activated_at timestamptz);
CREATE TABLE erp_inventory_values (tenant_id uuid NOT NULL REFERENCES tenants(id),product_id uuid NOT NULL,quantity bigint NOT NULL CHECK(quantity>=0),value_cents bigint NOT NULL CHECK(value_cents BETWEEN 0 AND 999999999999),PRIMARY KEY(tenant_id,product_id),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),CHECK(quantity>0 OR value_cents=0));
CREATE OR REPLACE FUNCTION erp_stock_control() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE loc uuid; available bigint; global_quantity bigint; mode text; v erp_inventory_values%ROWTYPE; amount bigint;
BEGIN
 PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;
 IF NEW.location_id IS NULL THEN
  SELECT id INTO loc FROM erp_stock_locations WHERE tenant_id=NEW.tenant_id AND is_default;
  IF loc IS NULL THEN INSERT INTO erp_stock_locations(tenant_id,code,name,is_default) VALUES(NEW.tenant_id,'MAIN','Main stock location',true) RETURNING id INTO loc; END IF;
  NEW.location_id:=loc;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM erp_stock_locations WHERE tenant_id=NEW.tenant_id AND id=NEW.location_id AND status='active') THEN RAISE EXCEPTION 'Active tenant stock location required'; END IF;
 SELECT coalesce(sum(quantity),0) INTO available FROM retail_stock_movements WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id AND location_id=NEW.location_id;
 IF available+NEW.quantity<0 OR available+NEW.quantity>2147483647 THEN RAISE EXCEPTION 'Insufficient stock at selected location or location stock limit exceeded'; END IF;
 SELECT coalesce(sum(quantity),0) INTO global_quantity FROM retail_stock_movements WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id;
 IF global_quantity+NEW.quantity<0 OR global_quantity+NEW.quantity>2147483647 THEN RAISE EXCEPTION 'Global stock limit exceeded'; END IF;
 SELECT costing INTO mode FROM erp_inventory_settings WHERE tenant_id=NEW.tenant_id;
 IF mode='weighted_average' THEN
  INSERT INTO erp_inventory_values(tenant_id,product_id,quantity,value_cents) VALUES(NEW.tenant_id,NEW.product_id,0,0) ON CONFLICT DO NOTHING;
  SELECT * INTO v FROM erp_inventory_values WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id FOR UPDATE;
  IF v.quantity<>global_quantity THEN RAISE EXCEPTION 'Stock quantity and valuation do not reconcile'; END IF;
  IF NEW.quantity<0 THEN
   amount:=CASE WHEN -NEW.quantity=v.quantity THEN v.value_cents ELSE round(v.value_cents::numeric*(-NEW.quantity)/nullif(v.quantity,0))::bigint END;
   NEW.cost_cents:=-amount;
  ELSE
   IF NEW.cost_cents IS NULL OR NEW.cost_cents<0 THEN RAISE EXCEPTION 'Receipt cost is required after valuation activation'; END IF;
   amount:=NEW.cost_cents;
  END IF;
  UPDATE erp_inventory_values SET quantity=quantity+NEW.quantity,value_cents=value_cents+NEW.cost_cents WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id;
 ELSE NEW.cost_cents:=NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER erp_stock_control_before BEFORE INSERT ON retail_stock_movements FOR EACH ROW EXECUTE FUNCTION erp_stock_control();
ALTER TABLE retail_orders DROP CONSTRAINT retail_orders_status_check;
ALTER TABLE retail_orders ADD CONSTRAINT retail_orders_status_check CHECK(status IN ('draft','submitted','confirmed','approved','partially_completed','completed','cancelled'));
ALTER TABLE retail_orders ADD COLUMN requires_approval boolean NOT NULL DEFAULT false,ADD COLUMN approved_by text,ADD COLUMN due_date date;
ALTER TABLE retail_orders ALTER COLUMN requires_approval SET DEFAULT true;
CREATE TABLE retail_fulfillments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),order_id uuid NOT NULL,document_number varchar(50) NOT NULL,location_id uuid NOT NULL,total numeric(12,2) NOT NULL CHECK(total>0),request_key uuid NOT NULL,fingerprint text NOT NULL,actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),FOREIGN KEY(tenant_id,location_id) REFERENCES erp_stock_locations(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,document_number));
CREATE TABLE retail_fulfillment_lines (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,fulfillment_id uuid NOT NULL,order_line_id uuid NOT NULL,product_id uuid NOT NULL,quantity integer NOT NULL CHECK(quantity>0),unit_price numeric(12,2) NOT NULL,cost_cents bigint,FOREIGN KEY(tenant_id,fulfillment_id) REFERENCES retail_fulfillments(tenant_id,id),FOREIGN KEY(order_line_id) REFERENCES retail_order_lines(id),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),UNIQUE(fulfillment_id,order_line_id));
ALTER TABLE retail_fulfillments ADD COLUMN contact_name varchar(150),ADD COLUMN contact_email varchar(190),ADD COLUMN contact_address varchar(255),ADD COLUMN due_date date;
CREATE TABLE retail_credit_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,fulfillment_id uuid NOT NULL,document_number varchar(50) NOT NULL,reason varchar(1000) NOT NULL,total numeric(12,2) NOT NULL CHECK(total>0),request_key uuid NOT NULL,fingerprint text NOT NULL,actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,fulfillment_id) REFERENCES retail_fulfillments(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,document_number));
CREATE TABLE retail_credit_lines (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,credit_id uuid NOT NULL,fulfillment_line_id uuid NOT NULL,quantity integer NOT NULL CHECK(quantity>0),cost_cents bigint,FOREIGN KEY(tenant_id,credit_id) REFERENCES retail_credit_notes(tenant_id,id),FOREIGN KEY(fulfillment_line_id) REFERENCES retail_fulfillment_lines(id),UNIQUE(credit_id,fulfillment_line_id));
CREATE UNIQUE INDEX retail_order_lines_scope ON retail_order_lines(tenant_id,id);
CREATE UNIQUE INDEX retail_fulfillment_lines_scope ON retail_fulfillment_lines(tenant_id,id);
ALTER TABLE retail_fulfillment_lines ADD FOREIGN KEY(tenant_id,order_line_id) REFERENCES retail_order_lines(tenant_id,id);
ALTER TABLE retail_credit_lines ADD FOREIGN KEY(tenant_id,fulfillment_line_id) REFERENCES retail_fulfillment_lines(tenant_id,id);
CREATE TABLE retail_refunds (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,order_id uuid NOT NULL,amount numeric(12,2) NOT NULL CHECK(amount>0),method varchar(20) NOT NULL CHECK(method IN ('cash','bank_transfer','gcash','maya')),reference varchar(150) NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,method,reference));
CREATE TABLE retail_supplier_bills (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,fulfillment_id uuid NOT NULL,contact_id uuid NOT NULL,invoice_number varchar(150) NOT NULL,invoice_date date NOT NULL,amount numeric(12,2) NOT NULL CHECK(amount>0),request_key uuid NOT NULL,fingerprint text NOT NULL,actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,fulfillment_id) REFERENCES retail_fulfillments(tenant_id,id),FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(fulfillment_id),UNIQUE(tenant_id,contact_id,invoice_number),UNIQUE(tenant_id,request_key));
-- Preserve existing completion/posting history; imports below do not write stock or journals.
INSERT INTO retail_fulfillments(id,tenant_id,order_id,document_number,location_id,total,request_key,fingerprint,actor_id,created_at)
SELECT o.id,o.tenant_id,o.id,'LEGACY-'||o.id,l.id,o.total,o.id,'legacy',o.created_by,coalesce(o.completed_at,o.created_at) FROM retail_orders o JOIN erp_stock_locations l ON l.tenant_id=o.tenant_id AND l.is_default WHERE o.status='completed';
INSERT INTO retail_fulfillment_lines(tenant_id,fulfillment_id,order_line_id,product_id,quantity,unit_price) SELECT l.tenant_id,l.order_id,l.id,l.product_id,l.quantity,l.unit_price FROM retail_order_lines l JOIN retail_fulfillments f ON f.id=l.order_id;
UPDATE retail_fulfillments f SET contact_name=c.display_name,contact_email=c.email,contact_address=c.address,due_date=o.due_date FROM retail_orders o JOIN erp_contacts c ON c.id=o.contact_id AND c.tenant_id=o.tenant_id WHERE f.order_id=o.id AND f.tenant_id=o.tenant_id;


-- Shared workforce

CREATE TABLE erp_employee_links (tenant_id uuid NOT NULL REFERENCES tenants(id),employee_id text NOT NULL,user_id text NOT NULL,hourly_rate numeric(10,2) NOT NULL DEFAULT 0 CHECK(hourly_rate>=0),PRIMARY KEY(tenant_id,employee_id),UNIQUE(tenant_id,user_id));
CREATE TABLE erp_attendance (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),employee_id text NOT NULL,started_at timestamptz NOT NULL,ended_at timestamptz,break_minutes integer NOT NULL DEFAULT 0 CHECK(break_minutes>=0),status varchar(20) NOT NULL CHECK(status IN ('open','submitted','approved','rejected')),created_by text NOT NULL,reviewed_by text,review_note varchar(500),request_key uuid NOT NULL,version integer NOT NULL DEFAULT 1,FOREIGN KEY(tenant_id,employee_id) REFERENCES erp_employee_links(tenant_id,employee_id),CHECK(ended_at IS NULL OR ended_at>started_at),UNIQUE(tenant_id,request_key));
CREATE UNIQUE INDEX erp_one_open_clock ON erp_attendance(tenant_id,employee_id) WHERE status='open';
CREATE TABLE erp_leave_allocations (tenant_id uuid NOT NULL,employee_id text NOT NULL,kind varchar(20) NOT NULL CHECK(kind IN ('annual','sick')),days integer NOT NULL CHECK(days>=0),year integer NOT NULL CHECK(year BETWEEN 2000 AND 2100),PRIMARY KEY(tenant_id,employee_id,kind,year),FOREIGN KEY(tenant_id,employee_id) REFERENCES erp_employee_links(tenant_id,employee_id));
CREATE TABLE erp_leave_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,employee_id text NOT NULL,kind varchar(20) NOT NULL CHECK(kind IN ('annual','sick','unpaid')),start_date date NOT NULL,end_date date NOT NULL CHECK(end_date>=start_date),reason varchar(1000) NOT NULL,days integer NOT NULL CHECK(days>0),status varchar(20) NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),created_by text NOT NULL,reviewed_by text,review_note varchar(500),request_key uuid NOT NULL,fingerprint text NOT NULL,version integer NOT NULL DEFAULT 1,FOREIGN KEY(tenant_id,employee_id) REFERENCES erp_employee_links(tenant_id,employee_id),UNIQUE(tenant_id,request_key));
CREATE TABLE erp_payroll_rules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),name varchar(100) NOT NULL,employee_rate numeric(6,3) NOT NULL CHECK(employee_rate BETWEEN 0 AND 100),employer_rate numeric(6,3) NOT NULL CHECK(employer_rate BETWEEN 0 AND 100),employee_fixed numeric(12,2) NOT NULL DEFAULT 0 CHECK(employee_fixed>=0),employer_fixed numeric(12,2) NOT NULL DEFAULT 0 CHECK(employer_fixed>=0),basis_floor numeric(12,2) NOT NULL DEFAULT 0 CHECK(basis_floor>=0),basis_ceiling numeric(12,2) CHECK(basis_ceiling IS NULL OR basis_ceiling>=basis_floor),status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),UNIQUE(tenant_id,name));
ALTER TABLE retail_payroll_runs ADD COLUMN employer_contributions numeric(12,2) NOT NULL DEFAULT 0 CHECK(employer_contributions>=0);
CREATE TABLE retail_payroll_contributions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,run_id uuid NOT NULL,employee_id text NOT NULL,rule_name varchar(100) NOT NULL,employee_amount numeric(12,2) NOT NULL,employer_amount numeric(12,2) NOT NULL,FOREIGN KEY(tenant_id,run_id) REFERENCES retail_payroll_runs(tenant_id,id));
CREATE TABLE retail_payroll_remittances (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,run_id uuid NOT NULL,employee_amount numeric(12,2) NOT NULL CHECK(employee_amount>=0),employer_amount numeric(12,2) NOT NULL CHECK(employer_amount>=0),method varchar(20) NOT NULL CHECK(method IN ('cash','bank_transfer','gcash','maya')),reference varchar(150) NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,actor_id text NOT NULL,FOREIGN KEY(tenant_id,run_id) REFERENCES retail_payroll_runs(tenant_id,id),CHECK(employee_amount+employer_amount>0),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,method,reference));
CREATE UNIQUE INDEX erp_attendance_scope ON erp_attendance(tenant_id,id);
CREATE TABLE retail_payroll_attendance (tenant_id uuid NOT NULL,run_id uuid NOT NULL,attendance_id uuid NOT NULL,snapshot_version integer NOT NULL,released boolean NOT NULL DEFAULT false,PRIMARY KEY(run_id,attendance_id),FOREIGN KEY(tenant_id,run_id) REFERENCES retail_payroll_runs(tenant_id,id),FOREIGN KEY(tenant_id,attendance_id) REFERENCES erp_attendance(tenant_id,id));
CREATE UNIQUE INDEX retail_attendance_one_payroll ON retail_payroll_attendance(attendance_id) WHERE NOT released;


-- Retail catalog and decimal stock

ALTER TABLE retail_stock_movements ALTER COLUMN quantity TYPE numeric(18,3);
ALTER TABLE erp_inventory_values ALTER COLUMN quantity TYPE numeric(18,3);
ALTER TABLE retail_order_lines ALTER COLUMN quantity TYPE numeric(18,3);
ALTER TABLE retail_order_lines DROP CONSTRAINT retail_order_lines_quantity_check;
ALTER TABLE retail_order_lines ADD CHECK(quantity BETWEEN 0.001 AND 1000000);
ALTER TABLE retail_fulfillment_lines ALTER COLUMN quantity TYPE numeric(18,3);
ALTER TABLE retail_credit_lines ALTER COLUMN quantity TYPE numeric(18,3);
ALTER TABLE retail_products ALTER COLUMN reorder_level TYPE numeric(18,3);
ALTER TABLE retail_order_lines ADD COLUMN line_total numeric(12,2) GENERATED ALWAYS AS (round(quantity*unit_price,2)) STORED;
ALTER TABLE retail_fulfillment_lines ADD COLUMN amount_cents bigint;
UPDATE retail_fulfillment_lines SET amount_cents=round(quantity*unit_price*100)::bigint;
ALTER TABLE retail_fulfillment_lines ALTER COLUMN amount_cents SET NOT NULL;
ALTER TABLE retail_fulfillment_lines ADD CHECK(amount_cents>0);
ALTER TABLE retail_credit_lines ADD COLUMN amount_cents bigint;
UPDATE retail_credit_lines c SET amount_cents=round(c.quantity*l.unit_price*100)::bigint FROM retail_fulfillment_lines l WHERE l.id=c.fulfillment_line_id AND l.tenant_id=c.tenant_id;
ALTER TABLE retail_credit_lines ALTER COLUMN amount_cents SET NOT NULL;
CREATE TABLE retail_product_families(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),name varchar(150) NOT NULL,store_type varchar(20) NOT NULL CHECK(store_type IN ('bookstore','clothing','furniture','grocery','hardware','toy')),UNIQUE(tenant_id,id),UNIQUE(tenant_id,name));
ALTER TABLE retail_products ADD COLUMN family_id uuid,ADD COLUMN variant_size varchar(60),ADD COLUMN variant_color varchar(60),ADD COLUMN material varchar(100),ADD COLUMN brand varchar(100),ADD COLUMN author varchar(150),ADD COLUMN publisher varchar(150),ADD COLUMN isbn varchar(13),ADD COLUMN age_min integer CHECK(age_min>=0),ADD COLUMN age_max integer CHECK(age_max>=age_min),ADD COLUMN reorder_target numeric(18,3) NOT NULL DEFAULT 0 CHECK(reorder_target>=0);
ALTER TABLE retail_products ADD FOREIGN KEY(tenant_id,family_id) REFERENCES retail_product_families(tenant_id,id);
CREATE UNIQUE INDEX retail_family_variant ON retail_products(tenant_id,family_id,coalesce(variant_size,''),coalesce(variant_color,''),coalesce(material,'')) WHERE family_id IS NOT NULL;
CREATE UNIQUE INDEX retail_isbn_unique ON retail_products(tenant_id,isbn) WHERE isbn IS NOT NULL;
CREATE TABLE retail_product_codes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,product_id uuid NOT NULL,code varchar(150) NOT NULL,kind varchar(20) NOT NULL CHECK(kind IN ('internal','ean13','isbn13','qr')),label varchar(80) NOT NULL,base_quantity numeric(18,3) NOT NULL CHECK(base_quantity>0),price numeric(12,2) CHECK(price>=0),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),UNIQUE(tenant_id,code));
CREATE TABLE retail_reservations(tenant_id uuid NOT NULL,order_id uuid NOT NULL,order_line_id uuid NOT NULL,product_id uuid NOT NULL,location_id uuid NOT NULL,quantity numeric(18,3) NOT NULL CHECK(quantity>0),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,order_line_id),FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),FOREIGN KEY(tenant_id,order_line_id) REFERENCES retail_order_lines(tenant_id,id),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),FOREIGN KEY(tenant_id,location_id) REFERENCES erp_stock_locations(tenant_id,id));
CREATE OR REPLACE FUNCTION erp_stock_control() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE loc uuid; available numeric(18,3); global_quantity numeric(18,3); reserved numeric(18,3); mode text; v erp_inventory_values%ROWTYPE; amount bigint;
BEGIN
 PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;
 IF NEW.location_id IS NULL THEN
  SELECT id INTO loc FROM erp_stock_locations WHERE tenant_id=NEW.tenant_id AND is_default;
  IF loc IS NULL THEN INSERT INTO erp_stock_locations(tenant_id,code,name,is_default) VALUES(NEW.tenant_id,'MAIN','Main stock location',true) RETURNING id INTO loc; END IF;
  NEW.location_id:=loc;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM erp_stock_locations WHERE tenant_id=NEW.tenant_id AND id=NEW.location_id AND status='active') THEN RAISE EXCEPTION 'Active tenant stock location required'; END IF;
 SELECT coalesce(sum(quantity),0) INTO available FROM retail_stock_movements WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id AND location_id=NEW.location_id;
 SELECT coalesce(sum(quantity),0) INTO reserved FROM retail_reservations WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id AND location_id=NEW.location_id;
 IF reserved>0 AND NEW.quantity<0 AND available+NEW.quantity<reserved THEN RAISE EXCEPTION 'Stock is reserved for another order'; END IF;
 IF available+NEW.quantity<0 OR available+NEW.quantity>2147483647 THEN RAISE EXCEPTION 'Insufficient stock at selected location or location stock limit exceeded'; END IF;
 SELECT coalesce(sum(quantity),0) INTO global_quantity FROM retail_stock_movements WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id;
 IF global_quantity+NEW.quantity<0 OR global_quantity+NEW.quantity>2147483647 THEN RAISE EXCEPTION 'Global stock limit exceeded'; END IF;
 SELECT costing INTO mode FROM erp_inventory_settings WHERE tenant_id=NEW.tenant_id;
 IF mode='weighted_average' THEN
  INSERT INTO erp_inventory_values(tenant_id,product_id,quantity,value_cents) VALUES(NEW.tenant_id,NEW.product_id,0,0) ON CONFLICT DO NOTHING;
  SELECT * INTO v FROM erp_inventory_values WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id FOR UPDATE;
  IF v.quantity<>global_quantity THEN RAISE EXCEPTION 'Stock quantity and valuation do not reconcile'; END IF;
  IF NEW.quantity<0 THEN
   amount:=CASE WHEN -NEW.quantity=v.quantity THEN v.value_cents ELSE round(v.value_cents::numeric*(-NEW.quantity)/nullif(v.quantity,0))::bigint END;
   NEW.cost_cents:=-amount;
  ELSE
   IF NEW.cost_cents IS NULL OR NEW.cost_cents<0 THEN RAISE EXCEPTION 'Receipt cost is required after valuation activation'; END IF;
   amount:=NEW.cost_cents;
  END IF;
  UPDATE erp_inventory_values SET quantity=quantity+NEW.quantity,value_cents=value_cents+NEW.cost_cents WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id;
 ELSE NEW.cost_cents:=NULL;
 END IF;
 RETURN NEW;
END $$;



-- Retail store operations

CREATE TABLE retail_quotes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),contact_id uuid NOT NULL,number varchar(50) NOT NULL,status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','cancelled')),expires_on date NOT NULL,total numeric(12,2) NOT NULL CHECK(total>0),notes varchar(2000),version integer NOT NULL DEFAULT 1,order_id uuid,created_by text NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,number),UNIQUE(tenant_id,request_key));
CREATE TABLE retail_quote_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,quote_id uuid NOT NULL,product_id uuid NOT NULL,quantity numeric(18,3) NOT NULL CHECK(quantity>0),unit_price numeric(12,2) NOT NULL CHECK(unit_price>0),product_name varchar(150) NOT NULL,sku varchar(60) NOT NULL,FOREIGN KEY(tenant_id,quote_id) REFERENCES retail_quotes(tenant_id,id),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),UNIQUE(quote_id,product_id));
CREATE TABLE retail_deposits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,order_id uuid NOT NULL,amount_cents bigint NOT NULL CHECK(amount_cents>0),refunded_cents bigint NOT NULL DEFAULT 0 CHECK(refunded_cents>=0 AND refunded_cents<=amount_cents),method varchar(20) NOT NULL CHECK(method IN ('cash','bank_transfer','gcash','maya')),reference varchar(150) NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,method,reference));
CREATE TABLE retail_deposit_applications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,deposit_id uuid NOT NULL,fulfillment_id uuid NOT NULL,amount_cents bigint NOT NULL CHECK(amount_cents>0),created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,deposit_id) REFERENCES retail_deposits(tenant_id,id),FOREIGN KEY(tenant_id,fulfillment_id) REFERENCES retail_fulfillments(tenant_id,id),UNIQUE(deposit_id,fulfillment_id));
CREATE TABLE retail_deposit_refunds(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,deposit_id uuid NOT NULL,amount_cents bigint NOT NULL CHECK(amount_cents>0),reference varchar(150) NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,deposit_id) REFERENCES retail_deposits(tenant_id,id),UNIQUE(tenant_id,reference),UNIQUE(tenant_id,request_key));
CREATE TABLE retail_deliveries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,order_id uuid NOT NULL,scheduled_at timestamptz NOT NULL,address varchar(500) NOT NULL,status varchar(20) NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','dispatched','delivered','cancelled')),proof varchar(1000),request_key uuid NOT NULL,fingerprint text NOT NULL,version integer NOT NULL DEFAULT 1,created_by text NOT NULL,FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key));
CREATE TABLE retail_cash_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,cashier_id text NOT NULL,location_id uuid NOT NULL,opening_cents bigint NOT NULL CHECK(opening_cents>=0),expected_cents bigint,closing_cents bigint,variance_cents bigint,status varchar(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),opened_at timestamptz NOT NULL DEFAULT now(),closed_at timestamptz,FOREIGN KEY(tenant_id,location_id) REFERENCES erp_stock_locations(tenant_id,id),UNIQUE(tenant_id,id));
CREATE UNIQUE INDEX retail_one_open_till ON retail_cash_sessions(tenant_id,cashier_id) WHERE status='open';
ALTER TABLE retail_refunds ADD COLUMN cash_session_id uuid;
ALTER TABLE retail_refunds ADD FOREIGN KEY(tenant_id,cash_session_id) REFERENCES retail_cash_sessions(tenant_id,id);
CREATE TABLE retail_pos_receipts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,session_id uuid NOT NULL,order_id uuid NOT NULL,fulfillment_id uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,session_id) REFERENCES retail_cash_sessions(tenant_id,id),FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),FOREIGN KEY(tenant_id,fulfillment_id) REFERENCES retail_fulfillments(tenant_id,id),UNIQUE(tenant_id,order_id),UNIQUE(tenant_id,request_key));
CREATE TABLE retail_stock_counts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,product_id uuid NOT NULL,location_id uuid NOT NULL,expected_quantity numeric(18,3) NOT NULL,counted_quantity numeric(18,3) NOT NULL CHECK(counted_quantity>=0),reason varchar(500) NOT NULL,status varchar(20) NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),created_by text NOT NULL,reviewed_by text,request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),FOREIGN KEY(tenant_id,location_id) REFERENCES erp_stock_locations(tenant_id,id),UNIQUE(tenant_id,request_key));
CREATE TABLE retail_replenishment_rules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,product_id uuid NOT NULL,location_id uuid NOT NULL,vendor_id uuid NOT NULL,min_quantity numeric(18,3) NOT NULL CHECK(min_quantity>=0),target_quantity numeric(18,3) NOT NULL CHECK(target_quantity>min_quantity),pack_quantity numeric(18,3) NOT NULL DEFAULT 1 CHECK(pack_quantity>0),unit_cost numeric(12,2) NOT NULL CHECK(unit_cost>0),lead_days integer NOT NULL DEFAULT 0 CHECK(lead_days>=0),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),FOREIGN KEY(tenant_id,location_id) REFERENCES erp_stock_locations(tenant_id,id),FOREIGN KEY(tenant_id,vendor_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,product_id,location_id));


-- Retail lot and serial traceability

ALTER TABLE retail_products ADD COLUMN tracking varchar(10) NOT NULL DEFAULT 'none' CHECK(tracking IN ('none','lot','serial'));
CREATE TABLE retail_lots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,product_id uuid NOT NULL,code varchar(100) NOT NULL,expires_on date,status varchar(10) NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')),created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,product_id,code));
ALTER TABLE retail_stock_movements ADD COLUMN lot_id uuid;
ALTER TABLE retail_stock_movements ADD FOREIGN KEY(tenant_id,lot_id) REFERENCES retail_lots(tenant_id,id);
CREATE TABLE retail_lot_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,movement_id uuid NOT NULL,lot_id uuid NOT NULL,location_id uuid NOT NULL,quantity numeric(18,3) NOT NULL CHECK(quantity<>0),FOREIGN KEY(tenant_id,movement_id) REFERENCES retail_stock_movements(tenant_id,id),FOREIGN KEY(tenant_id,lot_id) REFERENCES retail_lots(tenant_id,id),FOREIGN KEY(tenant_id,location_id) REFERENCES erp_stock_locations(tenant_id,id));
CREATE OR REPLACE FUNCTION erp_allocate_lots() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mode text; remaining numeric(18,3); take_qty numeric(18,3); item record; target uuid; source_doc uuid; balance numeric(18,3);
BEGIN
 SELECT tracking INTO mode FROM retail_products WHERE tenant_id=NEW.tenant_id AND id=NEW.product_id;
 IF mode='none' THEN IF NEW.lot_id IS NOT NULL THEN RAISE EXCEPTION 'Enable tracking before using a lot'; END IF;RETURN NEW;END IF;
 remaining:=abs(NEW.quantity);
 IF NEW.quantity>0 AND NEW.source_type='transfer' THEN
  FOR item IN SELECT a.lot_id,-sum(a.quantity) AS quantity FROM retail_lot_allocations a JOIN retail_stock_movements m ON m.id=a.movement_id AND m.tenant_id=a.tenant_id WHERE m.tenant_id=NEW.tenant_id AND m.product_id=NEW.product_id AND m.source_type='transfer' AND m.source_id=NEW.source_id AND m.quantity<0 GROUP BY a.lot_id LOOP
   INSERT INTO retail_lot_allocations(tenant_id,movement_id,lot_id,location_id,quantity) VALUES(NEW.tenant_id,NEW.id,item.lot_id,NEW.location_id,item.quantity);remaining:=remaining-item.quantity;
  END LOOP;
 ELSIF NEW.quantity>0 AND NEW.source_type='return' THEN
  SELECT fulfillment_id INTO source_doc FROM retail_credit_notes WHERE tenant_id=NEW.tenant_id AND id=NEW.source_id;
  FOR item IN SELECT a.lot_id,-sum(a.quantity)-coalesce((SELECT sum(x.quantity) FROM retail_lot_allocations x JOIN retail_stock_movements rm ON rm.id=x.movement_id AND rm.tenant_id=x.tenant_id JOIN retail_credit_notes cn ON cn.id=rm.source_id AND cn.tenant_id=rm.tenant_id WHERE x.tenant_id=NEW.tenant_id AND x.lot_id=a.lot_id AND rm.product_id=NEW.product_id AND rm.source_type='return' AND rm.quantity>0 AND cn.fulfillment_id=source_doc),0) AS quantity FROM retail_lot_allocations a JOIN retail_stock_movements m ON m.id=a.movement_id AND m.tenant_id=a.tenant_id WHERE m.tenant_id=NEW.tenant_id AND m.product_id=NEW.product_id AND m.source_type='sale' AND m.source_id=source_doc GROUP BY a.lot_id ORDER BY a.lot_id LOOP
   take_qty:=least(remaining,item.quantity);IF take_qty>0 THEN INSERT INTO retail_lot_allocations(tenant_id,movement_id,lot_id,location_id,quantity) VALUES(NEW.tenant_id,NEW.id,item.lot_id,NEW.location_id,take_qty);remaining:=remaining-take_qty; END IF;EXIT WHEN remaining=0;
  END LOOP;
 ELSIF NEW.quantity>0 THEN
  SELECT id INTO target FROM retail_lots WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id AND id=NEW.lot_id;
  IF target IS NULL THEN RAISE EXCEPTION 'A matching receipt lot or serial number is required';END IF;
  IF mode='serial' THEN SELECT coalesce(sum(quantity),0) INTO balance FROM retail_lot_allocations WHERE tenant_id=NEW.tenant_id AND lot_id=target;IF NEW.quantity<>1 OR balance<>0 OR EXISTS(SELECT 1 FROM retail_lot_allocations WHERE tenant_id=NEW.tenant_id AND lot_id=target) THEN RAISE EXCEPTION 'Serial receipt requires one unit and a serial not currently in stock';END IF; END IF;
  INSERT INTO retail_lot_allocations(tenant_id,movement_id,lot_id,location_id,quantity) VALUES(NEW.tenant_id,NEW.id,target,NEW.location_id,NEW.quantity);remaining:=0;
 ELSE
  FOR item IN SELECT l.id,coalesce(sum(a.quantity),0) AS quantity FROM retail_lots l LEFT JOIN retail_lot_allocations a ON a.tenant_id=l.tenant_id AND a.lot_id=l.id AND a.location_id=NEW.location_id WHERE l.tenant_id=NEW.tenant_id AND l.product_id=NEW.product_id AND (NEW.lot_id IS NULL OR l.id=NEW.lot_id) AND (l.status='active' OR NEW.source_type='adjustment') AND (NEW.source_type IS DISTINCT FROM 'sale' OR l.expires_on IS NULL OR l.expires_on>=(now() AT TIME ZONE 'Asia/Manila')::date) GROUP BY l.id HAVING coalesce(sum(a.quantity),0)>0 ORDER BY l.expires_on NULLS LAST,l.created_at,l.id LOOP
   take_qty:=least(remaining,item.quantity);INSERT INTO retail_lot_allocations(tenant_id,movement_id,lot_id,location_id,quantity) VALUES(NEW.tenant_id,NEW.id,item.id,NEW.location_id,-take_qty);remaining:=remaining-take_qty;EXIT WHEN remaining=0;
  END LOOP;
 END IF;
 IF remaining<>0 THEN RAISE EXCEPTION 'Insufficient eligible lot stock or incomplete lot provenance';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER erp_lot_allocation_after AFTER INSERT ON retail_stock_movements FOR EACH ROW EXECUTE FUNCTION erp_allocate_lots();


-- Retail price rules

CREATE TABLE retail_price_rules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,product_id uuid NOT NULL,contact_id uuid,name varchar(100) NOT NULL,kind varchar(20) NOT NULL CHECK(kind IN ('unit_price','discount_percent')),amount numeric(12,3) NOT NULL CHECK(amount>0),minimum_quantity numeric(18,3) NOT NULL DEFAULT 0 CHECK(minimum_quantity>=0),starts_on date NOT NULL,ends_on date NOT NULL CHECK(ends_on>=starts_on),priority integer NOT NULL DEFAULT 0,status varchar(10) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),CHECK(kind<>'discount_percent' OR amount<100),UNIQUE(tenant_id,name));


-- POS received cash and change

-- Legacy receipts retain NULL: historical cash received/change cannot be reconstructed.
ALTER TABLE retail_pos_receipts ADD COLUMN tender_details jsonb;
ALTER TABLE retail_pos_receipts ADD CONSTRAINT retail_pos_tender_details_array CHECK(tender_details IS NULL OR jsonb_typeof(tender_details)='array');


-- Property POS collections

CREATE UNIQUE INDEX payments_tenant_pos_identity ON payments(tenant_id,id);
CREATE TABLE pos_property_collections(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 payment_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),
 request_key uuid NOT NULL,fingerprint text NOT NULL,
 method varchar(20) NOT NULL CHECK(method IN ('cash','gcash','maya','bank_transfer')),
 reference varchar(150) NOT NULL,amount_cents bigint NOT NULL CHECK(amount_cents>0),
 received_cents bigint NOT NULL CHECK(received_cents>=amount_cents),
 change_cents bigint GENERATED ALWAYS AS (received_cents-amount_cents) STORED,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,payment_id) REFERENCES payments(tenant_id,id),
 CHECK(method='cash' OR received_cents=amount_cents),
 UNIQUE(tenant_id,payment_id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,method,reference)
);


-- Hotel guest folios

CREATE UNIQUE INDEX hotel_guest_identity ON erp_contacts(tenant_id,id);
CREATE TABLE hotel_folios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 request_key uuid NOT NULL, fingerprint text NOT NULL,
 guest_id uuid NOT NULL, room_label varchar(80) NOT NULL,
 arrival date NOT NULL, departure date NOT NULL CHECK(departure>arrival),
 status varchar(12) NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 no_post boolean NOT NULL DEFAULT false, created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz,
 FOREIGN KEY(tenant_id,guest_id) REFERENCES erp_contacts(tenant_id,id),
 UNIQUE(tenant_id,request_key), UNIQUE(tenant_id,id)
);
CREATE TABLE hotel_folio_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 folio_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES users(id),
 kind varchar(12) NOT NULL CHECK(kind IN ('charge','payment')),
 description varchar(200) NOT NULL, amount_cents bigint NOT NULL CHECK(amount_cents>0 AND amount_cents<=9999999900),
 method varchar(20) CHECK(method IN ('cash','gcash','maya','bank_transfer')),
 reference varchar(150), received_cents bigint,
 request_key uuid NOT NULL, fingerprint text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,folio_id) REFERENCES hotel_folios(tenant_id,id),
 CONSTRAINT hotel_entry_shape CHECK((kind='charge' AND method IS NULL AND received_cents IS NULL) OR
 (kind='payment' AND method IS NOT NULL AND reference IS NOT NULL AND received_cents IS NOT NULL AND received_cents>=amount_cents AND (method='cash' OR received_cents=amount_cents))),
 UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX hotel_payment_reference ON hotel_folio_entries(tenant_id,method,reference) WHERE kind='payment';
CREATE INDEX hotel_folios_tenant_status ON hotel_folios(tenant_id,status,created_at);


-- Short-stay POS register

CREATE TABLE hotel_pos_services (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 code varchar(50) NOT NULL,name varchar(150) NOT NULL,category varchar(30) NOT NULL,
 price_cents bigint NOT NULL CHECK(price_cents>0 AND price_cents<=9999999900),
 version integer NOT NULL DEFAULT 1,active boolean NOT NULL DEFAULT true,
 UNIQUE(tenant_id,code),UNIQUE(tenant_id,id)
);
CREATE TABLE hotel_pos_checkouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 folio_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),
 request_key uuid NOT NULL,fingerprint text NOT NULL,
 mode varchar(20) NOT NULL CHECK(mode IN ('pay_now','charge_room')),
 details jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,folio_id) REFERENCES hotel_folios(tenant_id,id),UNIQUE(tenant_id,request_key)
);


-- Room-first hotel POS

CREATE UNIQUE INDEX hotel_room_units_identity ON units(tenant_id,id);
CREATE UNIQUE INDEX hotel_room_reservation_identity ON business_records(tenant_id,id);
CREATE TABLE hotel_room_rates (
 tenant_id uuid NOT NULL REFERENCES tenants(id),unit_id uuid PRIMARY KEY REFERENCES units(id),
 nightly_cents bigint NOT NULL CHECK(nightly_cents>0 AND nightly_cents<=9999999900),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id)
);
CREATE TABLE hotel_pos_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 reservation_id uuid NOT NULL UNIQUE REFERENCES business_records(id),unit_id uuid NOT NULL REFERENCES units(id),
 folio_id uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,reservation_id) REFERENCES business_records(tenant_id,id),
 FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id),
 FOREIGN KEY(tenant_id,folio_id) REFERENCES hotel_folios(tenant_id,id),UNIQUE(tenant_id,request_key)
);


-- Shared payroll and shift controls

CREATE TABLE erp_shift_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,employee_id text NOT NULL,
 work_date date NOT NULL,starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,
 break_minutes integer NOT NULL DEFAULT 0 CHECK(break_minutes BETWEEN 0 AND 720),
 grace_minutes integer NOT NULL DEFAULT 0 CHECK(grace_minutes BETWEEN 0 AND 120),
 label varchar(100) NOT NULL,status varchar(20) NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','cancelled')),
 created_by text NOT NULL,version integer NOT NULL DEFAULT 1,
 CHECK(ends_at>starts_at AND ends_at<=starts_at+interval '24 hours'),
 FOREIGN KEY(tenant_id,employee_id) REFERENCES erp_employee_links(tenant_id,employee_id),
 UNIQUE(tenant_id,id)
);
ALTER TABLE erp_attendance ADD COLUMN shift_id uuid;
ALTER TABLE erp_attendance ADD FOREIGN KEY(tenant_id,shift_id) REFERENCES erp_shift_assignments(tenant_id,id);
CREATE TABLE erp_attendance_breaks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,attendance_id uuid NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(),ended_at timestamptz,
 request_key uuid NOT NULL,end_request_key uuid,
 FOREIGN KEY(tenant_id,attendance_id) REFERENCES erp_attendance(tenant_id,id),
 CHECK(ended_at IS NULL OR ended_at>=started_at),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,end_request_key)
);
CREATE UNIQUE INDEX erp_one_open_break ON erp_attendance_breaks(attendance_id) WHERE ended_at IS NULL;
CREATE TABLE erp_overtime_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,attendance_id uuid NOT NULL,
 minutes integer NOT NULL CHECK(minutes BETWEEN 1 AND 1440),approved_minutes integer CHECK(approved_minutes BETWEEN 0 AND minutes),
 reason varchar(1000) NOT NULL,status varchar(20) NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),
 created_by text NOT NULL,reviewed_by text,review_note varchar(500),request_key uuid NOT NULL,fingerprint text NOT NULL,version integer NOT NULL DEFAULT 1,
 FOREIGN KEY(tenant_id,attendance_id) REFERENCES erp_attendance(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX erp_one_overtime_request ON erp_overtime_requests(attendance_id) WHERE status<>'rejected';
CREATE TABLE erp_attendance_corrections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,attendance_id uuid NOT NULL,
 proposed_start timestamptz NOT NULL,proposed_end timestamptz NOT NULL,break_minutes integer NOT NULL CHECK(break_minutes>=0),
 reason varchar(1000) NOT NULL,status varchar(20) NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),
 attendance_version integer NOT NULL,created_by text NOT NULL,reviewed_by text,review_note varchar(500),
 request_key uuid NOT NULL,fingerprint text NOT NULL,version integer NOT NULL DEFAULT 1,
 FOREIGN KEY(tenant_id,attendance_id) REFERENCES erp_attendance(tenant_id,id),
 CHECK(proposed_end>proposed_start),UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX erp_one_pending_correction ON erp_attendance_corrections(attendance_id) WHERE status='submitted';
ALTER TABLE erp_payroll_rules ADD COLUMN effective_from date NOT NULL DEFAULT '1900-01-01',ADD COLUMN effective_until date;
ALTER TABLE erp_payroll_rules ADD CHECK(effective_until IS NULL OR effective_until>=effective_from);
ALTER TABLE erp_payroll_rules DROP CONSTRAINT erp_payroll_rules_tenant_id_name_key;
ALTER TABLE erp_payroll_rules ADD UNIQUE(tenant_id,name,effective_from);
ALTER TABLE retail_payroll_contributions ADD COLUMN rule_snapshot jsonb;


-- Industry delivery controls

CREATE UNIQUE INDEX IF NOT EXISTS industry_properties_scope ON properties(tenant_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS industry_users_scope ON users(tenant_id,id);
CREATE TABLE agency_opportunities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 property_id uuid NOT NULL,contact_id uuid NOT NULL,agent_id uuid NOT NULL REFERENCES users(id),
 title varchar(150) NOT NULL CHECK(length(trim(title))>0),asking_cents bigint NOT NULL CHECK(asking_cents>0 AND asking_cents<=999999999900),
 offer_cents bigint CHECK(offer_cents>0 AND offer_cents<=999999999900),commission_bps integer NOT NULL DEFAULT 0 CHECK(commission_bps BETWEEN 0 AND 10000),
 status text NOT NULL DEFAULT 'qualified' CHECK(status IN ('qualified','viewing','offer','under_contract','won','lost')),
 next_follow_up date NOT NULL,notes varchar(2000) NOT NULL DEFAULT '',created_by uuid NOT NULL REFERENCES users(id),
 request_key uuid NOT NULL,fingerprint text NOT NULL,version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE TABLE agency_viewings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,opportunity_id uuid NOT NULL,
 starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled')),
 feedback varchar(2000) NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1,
 FOREIGN KEY(tenant_id,opportunity_id) REFERENCES agency_opportunities(tenant_id,id)
);
CREATE TABLE association_cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),property_id uuid NOT NULL,unit_id uuid NOT NULL,
 category text NOT NULL CHECK(category IN ('architectural','violation','board_request')),
 title varchar(150) NOT NULL CHECK(length(trim(title))>0),description varchar(2000) NOT NULL CHECK(length(trim(description))>0),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected','resolved')),
 decision_note varchar(2000),reviewed_by uuid REFERENCES users(id),reviewed_at timestamptz,created_by uuid NOT NULL REFERENCES users(id),
 request_key uuid NOT NULL,fingerprint text NOT NULL,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id),FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE TABLE service_delivery_plans (
 tenant_id uuid NOT NULL,engagement_id uuid PRIMARY KEY,budget_minutes integer NOT NULL CHECK(budget_minutes BETWEEN 1 AND 10000000),
 fee_budget_cents bigint NOT NULL CHECK(fee_budget_cents BETWEEN 0 AND 999999999900),version integer NOT NULL DEFAULT 1,
 FOREIGN KEY(tenant_id,engagement_id) REFERENCES service_engagements(tenant_id,id)
);
CREATE TABLE service_milestones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,engagement_id uuid NOT NULL,
 title varchar(150) NOT NULL CHECK(length(trim(title))>0),due_date date NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','submitted','accepted','rejected')),
 evidence varchar(2000),submitted_by uuid REFERENCES users(id),reviewed_by uuid REFERENCES users(id),review_note varchar(2000),version integer NOT NULL DEFAULT 1,
 FOREIGN KEY(tenant_id,engagement_id) REFERENCES service_engagements(tenant_id,id),UNIQUE(tenant_id,engagement_id,title)
);
CREATE TABLE trade_job_checks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,job_id uuid NOT NULL,
 title varchar(150) NOT NULL CHECK(length(trim(title))>0),required boolean NOT NULL DEFAULT true,
 completed boolean NOT NULL DEFAULT false,evidence varchar(2000),completed_by uuid REFERENCES users(id),completed_at timestamptz,version integer NOT NULL DEFAULT 1,
 FOREIGN KEY(tenant_id,job_id) REFERENCES trade_jobs(tenant_id,id),UNIQUE(tenant_id,job_id,title)
);
CREATE INDEX agency_followups ON agency_opportunities(tenant_id,status,next_follow_up);
CREATE INDEX association_case_queue ON association_cases(tenant_id,status,created_at);
CREATE INDEX service_milestone_queue ON service_milestones(tenant_id,engagement_id,status);
CREATE INDEX trade_check_queue ON trade_job_checks(tenant_id,job_id,completed);
ALTER TABLE agency_opportunities ADD FOREIGN KEY(tenant_id,agent_id) REFERENCES users(tenant_id,id),ADD FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id);
ALTER TABLE association_cases ADD FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),ADD FOREIGN KEY(tenant_id,reviewed_by) REFERENCES users(tenant_id,id);
ALTER TABLE service_milestones ADD FOREIGN KEY(tenant_id,submitted_by) REFERENCES users(tenant_id,id),ADD FOREIGN KEY(tenant_id,reviewed_by) REFERENCES users(tenant_id,id);
ALTER TABLE trade_job_checks ADD FOREIGN KEY(tenant_id,completed_by) REFERENCES users(tenant_id,id);


-- Commercial delivery

CREATE UNIQUE INDEX IF NOT EXISTS commercial_time_scope ON service_time_entries(tenant_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS commercial_milestone_scope ON service_milestones(tenant_id,id);
CREATE TABLE commercial_invoices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),contact_id uuid NOT NULL,
 source_kind text NOT NULL CHECK(source_kind IN ('service_time','service_milestone','trade_job','agency_fee')),source_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','cancelled')),document_number varchar(40),due_date date NOT NULL,
 total_cents bigint NOT NULL CHECK(total_cents BETWEEN 1 AND 999999999999),description varchar(2000) NOT NULL,
 contact_snapshot jsonb,created_by uuid NOT NULL,issued_by uuid,issued_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 1,request_key uuid NOT NULL,fingerprint text NOT NULL,
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),
 FOREIGN KEY(tenant_id,issued_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,document_number)
);
CREATE UNIQUE INDEX commercial_one_job_invoice ON commercial_invoices(tenant_id,source_kind,source_id) WHERE source_kind IN ('trade_job','agency_fee') AND status<>'cancelled';
CREATE TABLE commercial_invoice_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,invoice_id uuid NOT NULL,
 description varchar(1000) NOT NULL,quantity numeric(18,3) NOT NULL CHECK(quantity>0),unit_price_cents bigint NOT NULL CHECK(unit_price_cents>=0),
 amount_cents bigint NOT NULL CHECK(amount_cents>0 AND amount_cents<=999999999999),time_id uuid,milestone_id uuid,
 claim_active boolean NOT NULL DEFAULT true,
 FOREIGN KEY(tenant_id,invoice_id) REFERENCES commercial_invoices(tenant_id,id),FOREIGN KEY(tenant_id,time_id) REFERENCES service_time_entries(tenant_id,id),
 FOREIGN KEY(tenant_id,milestone_id) REFERENCES service_milestones(tenant_id,id),CHECK(NOT(time_id IS NOT NULL AND milestone_id IS NOT NULL))
);
CREATE UNIQUE INDEX commercial_time_once ON commercial_invoice_lines(tenant_id,time_id) WHERE time_id IS NOT NULL AND claim_active;
CREATE UNIQUE INDEX commercial_milestone_once ON commercial_invoice_lines(tenant_id,milestone_id) WHERE milestone_id IS NOT NULL AND claim_active;
CREATE TABLE commercial_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,invoice_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('payment','credit','refund')),amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 999999999999),
 method text CHECK(method IN ('cash','gcash','maya','bank_transfer')),reference varchar(150),received_cents bigint,
 reason varchar(2000) NOT NULL,actor_id uuid NOT NULL,payment_id uuid,document_number varchar(40) NOT NULL,
 request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,invoice_id) REFERENCES commercial_invoices(tenant_id,id),FOREIGN KEY(tenant_id,actor_id) REFERENCES users(tenant_id,id),
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,document_number),
 FOREIGN KEY(tenant_id,payment_id) REFERENCES commercial_entries(tenant_id,id),
 CHECK((kind='credit' AND method IS NULL AND payment_id IS NULL AND received_cents IS NULL) OR (kind='payment' AND method IS NOT NULL AND reference IS NOT NULL AND payment_id IS NULL AND received_cents>=amount_cents) OR (kind='refund' AND method IS NOT NULL AND reference IS NOT NULL AND received_cents IS NULL AND payment_id IS NOT NULL))
);
CREATE TABLE trade_material_issues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,job_id uuid NOT NULL,movement_id uuid NOT NULL,
 product_id uuid NOT NULL,location_id uuid NOT NULL,quantity numeric(18,3) NOT NULL CHECK(quantity>0),cost_cents bigint,
 note varchar(1000) NOT NULL,actor_id uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,job_id) REFERENCES trade_jobs(tenant_id,id),FOREIGN KEY(tenant_id,movement_id) REFERENCES retail_stock_movements(tenant_id,id),
 FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),FOREIGN KEY(tenant_id,location_id) REFERENCES erp_stock_locations(tenant_id,id),
 FOREIGN KEY(tenant_id,actor_id) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE TABLE trade_actual_costs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,job_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('labor','subcontract','other')),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 999999999999),description varchar(1000) NOT NULL,reference varchar(150) NOT NULL,
 created_by uuid NOT NULL,reviewed_by uuid,status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),
 review_note varchar(1000),version integer NOT NULL DEFAULT 1,request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,job_id) REFERENCES trade_jobs(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,reviewed_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE TABLE erp_gateway_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),channel text NOT NULL CHECK(channel IN ('hotel_channels','esign','banking','sms','email','accounting','statutory')),
 event_type varchar(100) NOT NULL,source_id uuid NOT NULL,payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivering','delivered','failed')),attempts integer NOT NULL DEFAULT 0,
 last_error varchar(300),created_at timestamptz NOT NULL DEFAULT now(),delivered_at timestamptz,lease_until timestamptz,
 UNIQUE(tenant_id,channel,event_type,source_id)
);
CREATE INDEX commercial_invoice_queue ON commercial_invoices(tenant_id,status,due_date);
CREATE INDEX commercial_entry_invoice ON commercial_entries(tenant_id,invoice_id,created_at);
CREATE INDEX erp_gateway_pending ON erp_gateway_outbox(tenant_id,status,created_at);
CREATE TABLE erp_gateway_inbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),channel text NOT NULL,
 provider_event_id varchar(150) NOT NULL,event_type varchar(100) NOT NULL,payload jsonb NOT NULL,fingerprint varchar(64) NOT NULL,
 status text NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','acknowledged','rejected')),
 reviewed_by uuid,review_note varchar(1000),received_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,reviewed_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,channel,provider_event_id)
);
-- Job issues use a distinct source while enforcing the same eligible-lot expiry policy as sales.
CREATE OR REPLACE FUNCTION erp_allocate_lots() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mode text; remaining numeric(18,3); take_qty numeric(18,3); item record; target uuid; source_doc uuid; balance numeric(18,3);
BEGIN
 SELECT tracking INTO mode FROM retail_products WHERE tenant_id=NEW.tenant_id AND id=NEW.product_id;
 IF mode='none' THEN IF NEW.lot_id IS NOT NULL THEN RAISE EXCEPTION 'Enable tracking before using a lot'; END IF;RETURN NEW;END IF;
 remaining:=abs(NEW.quantity);
 IF NEW.quantity>0 AND NEW.source_type='transfer' THEN
  FOR item IN SELECT a.lot_id,-sum(a.quantity) AS quantity FROM retail_lot_allocations a JOIN retail_stock_movements m ON m.id=a.movement_id AND m.tenant_id=a.tenant_id WHERE m.tenant_id=NEW.tenant_id AND m.product_id=NEW.product_id AND m.source_type='transfer' AND m.source_id=NEW.source_id AND m.quantity<0 GROUP BY a.lot_id LOOP
   INSERT INTO retail_lot_allocations(tenant_id,movement_id,lot_id,location_id,quantity) VALUES(NEW.tenant_id,NEW.id,item.lot_id,NEW.location_id,item.quantity);remaining:=remaining-item.quantity;
  END LOOP;
 ELSIF NEW.quantity>0 AND NEW.source_type='return' THEN
  SELECT fulfillment_id INTO source_doc FROM retail_credit_notes WHERE tenant_id=NEW.tenant_id AND id=NEW.source_id;
  FOR item IN SELECT a.lot_id,-sum(a.quantity)-coalesce((SELECT sum(x.quantity) FROM retail_lot_allocations x JOIN retail_stock_movements rm ON rm.id=x.movement_id AND rm.tenant_id=x.tenant_id JOIN retail_credit_notes cn ON cn.id=rm.source_id AND cn.tenant_id=rm.tenant_id WHERE x.tenant_id=NEW.tenant_id AND x.lot_id=a.lot_id AND rm.product_id=NEW.product_id AND rm.source_type='return' AND rm.quantity>0 AND cn.fulfillment_id=source_doc),0) AS quantity FROM retail_lot_allocations a JOIN retail_stock_movements m ON m.id=a.movement_id AND m.tenant_id=a.tenant_id WHERE m.tenant_id=NEW.tenant_id AND m.product_id=NEW.product_id AND m.source_type='sale' AND m.source_id=source_doc GROUP BY a.lot_id ORDER BY a.lot_id LOOP
   take_qty:=least(remaining,item.quantity);IF take_qty>0 THEN INSERT INTO retail_lot_allocations(tenant_id,movement_id,lot_id,location_id,quantity) VALUES(NEW.tenant_id,NEW.id,item.lot_id,NEW.location_id,take_qty);remaining:=remaining-take_qty; END IF;EXIT WHEN remaining=0;
  END LOOP;
 ELSIF NEW.quantity>0 THEN
  SELECT id INTO target FROM retail_lots WHERE tenant_id=NEW.tenant_id AND product_id=NEW.product_id AND id=NEW.lot_id;
  IF target IS NULL THEN RAISE EXCEPTION 'A matching receipt lot or serial number is required';END IF;
  IF mode='serial' THEN SELECT coalesce(sum(quantity),0) INTO balance FROM retail_lot_allocations WHERE tenant_id=NEW.tenant_id AND lot_id=target;IF NEW.quantity<>1 OR balance<>0 OR EXISTS(SELECT 1 FROM retail_lot_allocations WHERE tenant_id=NEW.tenant_id AND lot_id=target) THEN RAISE EXCEPTION 'Serial receipt requires one unit and a serial not currently in stock';END IF; END IF;
  INSERT INTO retail_lot_allocations(tenant_id,movement_id,lot_id,location_id,quantity) VALUES(NEW.tenant_id,NEW.id,target,NEW.location_id,NEW.quantity);remaining:=0;
 ELSE
  FOR item IN SELECT l.id,coalesce(sum(a.quantity),0) AS quantity FROM retail_lots l LEFT JOIN retail_lot_allocations a ON a.tenant_id=l.tenant_id AND a.lot_id=l.id AND a.location_id=NEW.location_id WHERE l.tenant_id=NEW.tenant_id AND l.product_id=NEW.product_id AND (NEW.lot_id IS NULL OR l.id=NEW.lot_id) AND (l.status='active' OR NEW.source_type='adjustment') AND ((NEW.source_type IS DISTINCT FROM 'sale' AND NEW.source_type IS DISTINCT FROM 'trade_material') OR l.expires_on IS NULL OR l.expires_on>=(now() AT TIME ZONE 'Asia/Manila')::date) GROUP BY l.id HAVING coalesce(sum(a.quantity),0)>0 ORDER BY l.expires_on NULLS LAST,l.created_at,l.id LOOP
   take_qty:=least(remaining,item.quantity);INSERT INTO retail_lot_allocations(tenant_id,movement_id,lot_id,location_id,quantity) VALUES(NEW.tenant_id,NEW.id,item.id,NEW.location_id,-take_qty);remaining:=remaining-take_qty;EXIT WHEN remaining=0;
  END LOOP;
 END IF;
 IF remaining<>0 THEN RAISE EXCEPTION 'Insufficient eligible lot stock or incomplete lot provenance';END IF;
 RETURN NEW;
END $$;


-- Industry financial controls

CREATE UNIQUE INDEX IF NOT EXISTS hotel_entries_scope ON hotel_folio_entries(tenant_id,id);
CREATE TABLE agency_commission_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,opportunity_id uuid NOT NULL,
 total_cents bigint NOT NULL CHECK(total_cents BETWEEN 1 AND 999999999999),status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','cancelled')),
 created_by uuid NOT NULL,approved_by uuid,reason varchar(1000) NOT NULL,version integer NOT NULL DEFAULT 1,
 request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,opportunity_id) REFERENCES agency_opportunities(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,approved_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX agency_commission_once ON agency_commission_runs(tenant_id,opportunity_id) WHERE status<>'cancelled';
CREATE TABLE agency_commission_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,run_id uuid NOT NULL,user_id uuid NOT NULL,
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 999999999999),
 FOREIGN KEY(tenant_id,run_id) REFERENCES agency_commission_runs(tenant_id,id),FOREIGN KEY(tenant_id,user_id) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,run_id,user_id)
);
CREATE TABLE agency_commission_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,line_id uuid NOT NULL,amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 999999999999),
 method text NOT NULL CHECK(method IN ('cash','gcash','maya','bank_transfer')),reference varchar(150) NOT NULL,actor_id uuid NOT NULL,
 request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,line_id) REFERENCES agency_commission_lines(tenant_id,id),FOREIGN KEY(tenant_id,actor_id) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE TABLE association_budgets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,property_id uuid NOT NULL,year integer NOT NULL CHECK(year BETWEEN 2000 AND 2200),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','cancelled')),created_by uuid NOT NULL,approved_by uuid,
 version integer NOT NULL DEFAULT 1,reason varchar(1000) NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,approved_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX association_one_budget ON association_budgets(tenant_id,property_id,year) WHERE status<>'cancelled';
CREATE TABLE association_budget_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,budget_id uuid NOT NULL,fund text NOT NULL CHECK(fund IN ('operating','reserve')),
 category varchar(100) NOT NULL,planned_cents bigint NOT NULL CHECK(planned_cents BETWEEN 0 AND 999999999999),
 FOREIGN KEY(tenant_id,budget_id) REFERENCES association_budgets(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,budget_id,fund,category)
);
CREATE UNIQUE INDEX IF NOT EXISTS association_expense_scope ON expenses(tenant_id,id);
CREATE TABLE association_expense_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,line_id uuid NOT NULL,expense_id uuid NOT NULL,note varchar(1000) NOT NULL,actor_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,line_id) REFERENCES association_budget_lines(tenant_id,id),FOREIGN KEY(tenant_id,expense_id) REFERENCES expenses(tenant_id,id),FOREIGN KEY(tenant_id,actor_id) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,expense_id)
);
CREATE TABLE hotel_adjustment_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,folio_id uuid NOT NULL,original_entry_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('credit','refund')),amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999900),
 reason varchar(1000) NOT NULL,reference varchar(150),created_by uuid NOT NULL,reviewed_by uuid,
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),version integer NOT NULL DEFAULT 1,review_note varchar(1000),
 request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,folio_id) REFERENCES hotel_folios(tenant_id,id),FOREIGN KEY(tenant_id,original_entry_id) REFERENCES hotel_folio_entries(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,reviewed_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE TABLE hotel_posting_days (
 tenant_id uuid NOT NULL REFERENCES tenants(id),day date NOT NULL,closed boolean NOT NULL DEFAULT true,snapshot jsonb NOT NULL,
 closed_by uuid NOT NULL,reopened_by uuid,version integer NOT NULL DEFAULT 1,
 FOREIGN KEY(tenant_id,closed_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,reopened_by) REFERENCES users(tenant_id,id),PRIMARY KEY(tenant_id,day)
);
ALTER TABLE hotel_folio_entries DROP CONSTRAINT hotel_folio_entries_kind_check;
ALTER TABLE hotel_folio_entries DROP CONSTRAINT hotel_entry_shape;
ALTER TABLE hotel_folio_entries ADD CONSTRAINT hotel_folio_entries_kind_check CHECK(kind IN ('charge','payment','credit','refund'));
ALTER TABLE hotel_folio_entries ADD COLUMN original_entry_id uuid,ADD FOREIGN KEY(tenant_id,original_entry_id) REFERENCES hotel_folio_entries(tenant_id,id);
ALTER TABLE hotel_folio_entries ADD CONSTRAINT hotel_entry_shape CHECK(
 (kind='charge' AND method IS NULL AND received_cents IS NULL) OR
 (kind='payment' AND method IS NOT NULL AND reference IS NOT NULL AND received_cents IS NOT NULL AND received_cents>=amount_cents AND (method='cash' OR received_cents=amount_cents)) OR
 (kind='credit' AND method IS NULL AND received_cents IS NULL AND original_entry_id IS NOT NULL) OR
 (kind='refund' AND method IS NOT NULL AND reference IS NOT NULL AND received_cents IS NULL AND original_entry_id IS NOT NULL));
CREATE FUNCTION hotel_posting_day_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM hotel_posting_days WHERE tenant_id=NEW.tenant_id AND day=(now() AT TIME ZONE 'Asia/Manila')::date AND closed) THEN RAISE EXCEPTION 'Hotel posting day is closed';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER hotel_posting_day BEFORE INSERT ON hotel_folio_entries FOR EACH ROW EXECUTE FUNCTION hotel_posting_day_guard();


-- Hotel entry compatibility

-- Some upgraded installations retain the older automatically named shape check
-- alongside hotel_entry_shape. Remove only that reviewed charge/payment check.
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid='hotel_folio_entries'::regclass AND conname='hotel_folio_entries_check';
 IF definition IS NOT NULL THEN
  IF position('charge' IN definition)=0 OR position('payment' IN definition)=0 OR position('received_cents' IN definition)=0 OR position('refund' IN definition)>0 THEN RAISE EXCEPTION 'Unexpected legacy hotel entry constraint; review before upgrading';END IF;
  ALTER TABLE hotel_folio_entries DROP CONSTRAINT hotel_folio_entries_check;
 END IF;
END $$;


-- Hotel reception shifts

CREATE TABLE hotel_register_settings (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id),require_cash_session boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1
);
CREATE TABLE hotel_cash_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),cashier_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),opening_cents bigint NOT NULL CHECK(opening_cents BETWEEN 0 AND 999999999999),
 expected_cents bigint,counted_cents bigint CHECK(counted_cents BETWEEN 0 AND 999999999999),variance_cents bigint,
 opened_at timestamptz NOT NULL DEFAULT now(),closed_at timestamptz,reviewed_by uuid,review_note varchar(1000),reviewed_at timestamptz,
 request_key uuid NOT NULL,fingerprint text NOT NULL,
 FOREIGN KEY(tenant_id,cashier_id) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,reviewed_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX hotel_cash_one_open ON hotel_cash_sessions(tenant_id,cashier_id) WHERE status='open';
ALTER TABLE hotel_folio_entries ADD COLUMN cash_session_id uuid,ADD FOREIGN KEY(tenant_id,cash_session_id) REFERENCES hotel_cash_sessions(tenant_id,id);
ALTER TABLE hotel_adjustment_requests ADD COLUMN cash_session_id uuid,ADD FOREIGN KEY(tenant_id,cash_session_id) REFERENCES hotel_cash_sessions(tenant_id,id);
CREATE FUNCTION hotel_cash_session_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE session_id uuid;required boolean;BEGIN
 IF NEW.method='cash' AND NEW.kind IN ('payment','refund') THEN
  PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;
  SELECT id INTO session_id FROM hotel_cash_sessions WHERE tenant_id=NEW.tenant_id AND cashier_id=NEW.actor_id AND status='open' FOR UPDATE;
  SELECT require_cash_session INTO required FROM hotel_register_settings WHERE tenant_id=NEW.tenant_id;
  IF coalesce(required,false) AND session_id IS NULL THEN RAISE EXCEPTION 'Open your own hotel cash session before recording cash';END IF;
  NEW.cash_session_id:=session_id;
 ELSE IF NEW.cash_session_id IS NOT NULL THEN RAISE EXCEPTION 'Cash session applies only to cash receipts/refunds';END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER hotel_cash_session BEFORE INSERT ON hotel_folio_entries FOR EACH ROW EXECUTE FUNCTION hotel_cash_session_guard();


-- Industry planning

CREATE TABLE agency_listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,property_id uuid NOT NULL,unit_id uuid,seller_id uuid NOT NULL,
 title varchar(150) NOT NULL,city varchar(100) NOT NULL,property_type text NOT NULL CHECK(property_type IN ('residential','commercial','land','other')),
 bedrooms integer NOT NULL CHECK(bedrooms BETWEEN 0 AND 100),asking_cents bigint NOT NULL CHECK(asking_cents BETWEEN 1 AND 999999999999),
 mandate_reference varchar(150) NOT NULL,mandate_expires date NOT NULL,status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','withdrawn','sold')),
 version integer NOT NULL DEFAULT 1,created_by uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id),FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id),FOREIGN KEY(tenant_id,seller_id) REFERENCES erp_contacts(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX agency_active_listing ON agency_listings(tenant_id,property_id,coalesce(unit_id,'00000000-0000-0000-0000-000000000000'::uuid)) WHERE status='active';
CREATE TABLE agency_buyer_briefs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,contact_id uuid NOT NULL,city varchar(100) NOT NULL,
 property_type text NOT NULL CHECK(property_type IN ('any','residential','commercial','land','other')),min_bedrooms integer NOT NULL CHECK(min_bedrooms BETWEEN 0 AND 100),
 min_cents bigint NOT NULL CHECK(min_cents>=0),max_cents bigint NOT NULL CHECK(max_cents>=min_cents AND max_cents<=999999999999),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','closed')),version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,contact_id)
);
CREATE TABLE service_capacities (
 tenant_id uuid NOT NULL,user_id uuid NOT NULL,work_date date NOT NULL,minutes integer NOT NULL CHECK(minutes BETWEEN 0 AND 1440),version integer NOT NULL DEFAULT 1,
 FOREIGN KEY(tenant_id,user_id) REFERENCES users(tenant_id,id),PRIMARY KEY(tenant_id,user_id,work_date)
);
CREATE TABLE service_resource_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,engagement_id uuid NOT NULL,user_id uuid NOT NULL,work_date date NOT NULL,
 minutes integer NOT NULL CHECK(minutes BETWEEN 0 AND 1440),version integer NOT NULL DEFAULT 1,note varchar(1000) NOT NULL,
 FOREIGN KEY(tenant_id,engagement_id) REFERENCES service_engagements(tenant_id,id),FOREIGN KEY(tenant_id,user_id,work_date) REFERENCES service_capacities(tenant_id,user_id,work_date),UNIQUE(tenant_id,engagement_id,user_id,work_date)
);
ALTER TABLE service_time_entries ADD COLUMN billable boolean NOT NULL DEFAULT true;
CREATE TABLE trade_quotes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,job_id uuid NOT NULL,valid_until date NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','rejected','cancelled')),total_cents bigint NOT NULL CHECK(total_cents BETWEEN 1 AND 999999999999),
 evidence varchar(1000),version integer NOT NULL DEFAULT 1,created_by uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,job_id) REFERENCES trade_jobs(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX trade_active_quote ON trade_quotes(tenant_id,job_id) WHERE status IN ('draft','sent','accepted');
CREATE TABLE trade_quote_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,quote_id uuid NOT NULL,description varchar(1000) NOT NULL,
 quantity numeric(18,3) NOT NULL CHECK(quantity>0),unit_price_cents bigint NOT NULL CHECK(unit_price_cents>0),amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 999999999999),
 FOREIGN KEY(tenant_id,quote_id) REFERENCES trade_quotes(tenant_id,id)
);
CREATE TABLE trade_recurring_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,source_job_id uuid NOT NULL,next_date date NOT NULL,
 interval_days integer NOT NULL CHECK(interval_days BETWEEN 1 AND 366),local_time varchar(5) NOT NULL CHECK(local_time~'^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 1 AND 1440),status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused')),
 version integer NOT NULL DEFAULT 1,created_by uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,
 FOREIGN KEY(tenant_id,source_job_id) REFERENCES trade_jobs(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE TABLE trade_recurring_instances (
 tenant_id uuid NOT NULL,plan_id uuid NOT NULL,job_id uuid NOT NULL,due_date date NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,
 FOREIGN KEY(tenant_id,plan_id) REFERENCES trade_recurring_plans(tenant_id,id),FOREIGN KEY(tenant_id,job_id) REFERENCES trade_jobs(tenant_id,id),UNIQUE(tenant_id,plan_id,due_date),UNIQUE(tenant_id,request_key)
);


-- Governance and assigned housekeeping

CREATE TABLE association_owner_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,unit_id uuid NOT NULL,contact_id uuid NOT NULL,
 starts_on date NOT NULL,ends_on date CHECK(ends_on IS NULL OR ends_on>=starts_on),evidence varchar(1000) NOT NULL,version integer NOT NULL DEFAULT 1,
 FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id),FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,id)
);
CREATE TABLE association_resolutions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,property_id uuid NOT NULL,title varchar(150) NOT NULL,proposal varchar(2000) NOT NULL,
 electorate_date date NOT NULL,closes_at timestamptz NOT NULL,quorum_bps integer NOT NULL CHECK(quorum_bps BETWEEN 1 AND 10000),approval_bps integer NOT NULL CHECK(approval_bps BETWEEN 1 AND 10000),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','open','passed','rejected','no_quorum','cancelled')),version integer NOT NULL DEFAULT 1,
 created_by uuid NOT NULL,closed_by uuid,close_note varchar(1000),tally jsonb,request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,closed_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE TABLE association_electors (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,resolution_id uuid NOT NULL,unit_id uuid NOT NULL,contact_id uuid NOT NULL,
 unit_snapshot varchar(150) NOT NULL,contact_snapshot varchar(200) NOT NULL,link_evidence varchar(1000) NOT NULL,
 FOREIGN KEY(tenant_id,resolution_id) REFERENCES association_resolutions(tenant_id,id),FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id),FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,resolution_id,unit_id)
);
CREATE TABLE association_ballots (
 tenant_id uuid NOT NULL,elector_id uuid NOT NULL,choice text NOT NULL CHECK(choice IN ('yes','no','abstain')),evidence varchar(1000) NOT NULL,recorded_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,elector_id) REFERENCES association_electors(tenant_id,id),FOREIGN KEY(tenant_id,recorded_by) REFERENCES users(tenant_id,id),PRIMARY KEY(tenant_id,elector_id)
);
CREATE UNIQUE INDEX governance_business_scope ON business_records(tenant_id,id);
CREATE TABLE hotel_housekeeping_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,unit_id uuid NOT NULL,source_id uuid NOT NULL,assignee_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','clean','inspected','cancelled')),version integer NOT NULL DEFAULT 1,
 due_at timestamptz NOT NULL,note varchar(1000) NOT NULL,cleaned_by uuid,inspected_by uuid,created_by uuid NOT NULL,
 FOREIGN KEY(tenant_id,unit_id) REFERENCES units(tenant_id,id),FOREIGN KEY(tenant_id,source_id) REFERENCES business_records(tenant_id,id),FOREIGN KEY(tenant_id,assignee_id) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,cleaned_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,inspected_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id)
);
CREATE UNIQUE INDEX hotel_housekeeping_active ON hotel_housekeeping_assignments(tenant_id,unit_id) WHERE status IN ('assigned','clean');
CREATE FUNCTION erp_assigned_housekeeping_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.kind='housekeeping' AND NEW.data->>'status'='inspected' AND EXISTS(SELECT 1 FROM hotel_housekeeping_assignments h WHERE h.tenant_id=NEW.tenant_id AND h.unit_id::text=NEW.data->>'unitId' AND h.status IN ('assigned','clean')) THEN
  RAISE EXCEPTION 'Complete the assigned cleaning and independent inspection workflow first';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER erp_assigned_housekeeping_guard BEFORE INSERT OR UPDATE ON business_records FOR EACH ROW EXECUTE FUNCTION erp_assigned_housekeeping_guard();


-- Project expenses and crews

CREATE TABLE service_project_expenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,engagement_id uuid NOT NULL,work_date date NOT NULL,amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 999999999999),description varchar(1000) NOT NULL,receipt_reference varchar(150) NOT NULL,
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),version integer NOT NULL DEFAULT 1,created_by uuid NOT NULL,reviewed_by uuid,review_note varchar(1000),request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,engagement_id) REFERENCES service_engagements(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,reviewed_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX service_expense_receipt ON service_project_expenses(tenant_id,receipt_reference) WHERE status<>'rejected';
CREATE TABLE trade_crew_members (
 tenant_id uuid NOT NULL,job_id uuid NOT NULL,user_id uuid NOT NULL,active boolean NOT NULL DEFAULT true,version integer NOT NULL DEFAULT 1,note varchar(1000) NOT NULL,
 FOREIGN KEY(tenant_id,job_id) REFERENCES trade_jobs(tenant_id,id),FOREIGN KEY(tenant_id,user_id) REFERENCES users(tenant_id,id),PRIMARY KEY(tenant_id,job_id,user_id)
);


-- Contact client portal

CREATE TABLE erp_client_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,contact_id uuid NOT NULL,secret_hash char(64) NOT NULL UNIQUE,expires_at timestamptz NOT NULL,status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
 created_by uuid NOT NULL,evidence varchar(1000) NOT NULL,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id)
);
CREATE TABLE erp_client_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,grant_id uuid NOT NULL,target_kind text NOT NULL CHECK(target_kind IN ('quote','milestone')),target_id uuid NOT NULL,evidence varchar(1000) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,grant_id) REFERENCES erp_client_grants(tenant_id,id),UNIQUE(tenant_id,target_kind,target_id)
);
ALTER TABLE association_ballots ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE association_ballots ADD COLUMN client_grant_id uuid;
ALTER TABLE association_ballots ADD FOREIGN KEY(tenant_id,client_grant_id) REFERENCES erp_client_grants(tenant_id,id);
ALTER TABLE association_ballots ADD CHECK((recorded_by IS NOT NULL AND client_grant_id IS NULL) OR (recorded_by IS NULL AND client_grant_id IS NOT NULL));


-- Service contracts and retainers

CREATE TABLE service_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,engagement_id uuid NOT NULL,title varchar(150) NOT NULL,agreement_reference varchar(150) NOT NULL,starts_on date NOT NULL CHECK(extract(day FROM starts_on)=1),
 period_count integer NOT NULL CHECK(period_count BETWEEN 1 AND 120),fee_cents bigint NOT NULL CHECK(fee_cents BETWEEN 1 AND 999999999999),next_period date NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','paused','completed','cancelled')),version integer NOT NULL DEFAULT 1,created_by uuid NOT NULL,approved_by uuid,
 request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,engagement_id) REFERENCES service_engagements(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,approved_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,engagement_id),UNIQUE(tenant_id,request_key)
);
CREATE TABLE service_contract_periods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,contract_id uuid NOT NULL,milestone_id uuid NOT NULL,starts_on date NOT NULL,ends_on date NOT NULL,fee_cents bigint NOT NULL CHECK(fee_cents>0),request_key uuid NOT NULL,fingerprint text NOT NULL,
 FOREIGN KEY(tenant_id,contract_id) REFERENCES service_contracts(tenant_id,id),FOREIGN KEY(tenant_id,milestone_id) REFERENCES service_milestones(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,milestone_id),UNIQUE(tenant_id,contract_id,starts_on),UNIQUE(tenant_id,request_key)
);
CREATE TABLE service_retainer_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,contract_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('receipt','apply','reverse','refund')),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 999999999999),parent_id uuid,invoice_id uuid,method text CHECK(method IN ('cash','gcash','maya','bank_transfer')),reference varchar(150),received_cents bigint,
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','posted','rejected')),version integer NOT NULL DEFAULT 1,description varchar(1000) NOT NULL,created_by uuid NOT NULL,reviewed_by uuid,review_note varchar(1000),document_number varchar(40),request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),posted_at timestamptz,
 FOREIGN KEY(tenant_id,contract_id) REFERENCES service_contracts(tenant_id,id),FOREIGN KEY(tenant_id,parent_id) REFERENCES service_retainer_events(tenant_id,id),FOREIGN KEY(tenant_id,invoice_id) REFERENCES commercial_invoices(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,reviewed_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,document_number),
 CHECK((kind='receipt' AND parent_id IS NULL AND invoice_id IS NULL AND method IS NOT NULL AND reference IS NOT NULL AND received_cents>=amount_cents) OR (kind IN ('apply','reverse') AND parent_id IS NOT NULL AND invoice_id IS NOT NULL AND method IS NULL AND reference IS NULL AND received_cents IS NULL) OR (kind='refund' AND parent_id IS NOT NULL AND invoice_id IS NULL AND method IS NOT NULL AND reference IS NOT NULL AND received_cents IS NULL))
);
CREATE UNIQUE INDEX service_retainer_external_receipt ON service_retainer_events(tenant_id,method,reference) WHERE kind='receipt' AND status='posted' AND method<>'cash';
CREATE FUNCTION erp_contract_period_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status IN ('submitted','accepted') AND EXISTS(SELECT 1 FROM service_contract_periods p WHERE p.tenant_id=NEW.tenant_id AND p.milestone_id=NEW.id AND p.ends_on>(now() AT TIME ZONE 'Asia/Manila')::date) THEN RAISE EXCEPTION 'Contract period must end before delivery submission or acceptance'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER erp_contract_period_guard BEFORE UPDATE ON service_milestones FOR EACH ROW EXECUTE FUNCTION erp_contract_period_guard();
CREATE FUNCTION erp_retainer_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.status IN ('posted','rejected') THEN RAISE EXCEPTION 'Reviewed retainer evidence is immutable'; END IF; IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $$;
CREATE TRIGGER erp_retainer_immutable BEFORE UPDATE OR DELETE ON service_retainer_events FOR EACH ROW EXECUTE FUNCTION erp_retainer_immutable();


-- Reviewed kitchen charges to hotel folios

CREATE UNIQUE INDEX hotel_outlet_entry_scope ON hotel_folio_entries(tenant_id,id);
CREATE TABLE hotel_outlet_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),order_id uuid NOT NULL,folio_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','posted','rejected')),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999900),order_snapshot jsonb NOT NULL,
 authorization_evidence varchar(1000) NOT NULL CHECK(length(trim(authorization_evidence))>0),created_by uuid NOT NULL,reviewed_by uuid,review_note varchar(1000),entry_id uuid,
 version integer NOT NULL DEFAULT 1,request_key uuid NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz,
 FOREIGN KEY(tenant_id,order_id) REFERENCES food_orders(tenant_id,id),FOREIGN KEY(tenant_id,folio_id) REFERENCES hotel_folios(tenant_id,id),
 FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,reviewed_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,entry_id) REFERENCES hotel_folio_entries(tenant_id,id),
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,entry_id),
 CHECK((status='submitted' AND reviewed_by IS NULL AND reviewed_at IS NULL AND entry_id IS NULL) OR (status IN ('posted','rejected') AND reviewed_by IS NOT NULL AND reviewed_by<>created_by AND reviewed_at IS NOT NULL AND length(trim(review_note))>0 AND ((status='posted' AND entry_id IS NOT NULL) OR (status='rejected' AND entry_id IS NULL))))
);
CREATE UNIQUE INDEX hotel_outlet_order_once ON hotel_outlet_posts(tenant_id,order_id) WHERE status IN ('submitted','posted');
CREATE FUNCTION hotel_outlet_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.status<>'submitted' OR ROW(NEW.tenant_id,NEW.order_id,NEW.folio_id,NEW.amount_cents,NEW.order_snapshot,NEW.authorization_evidence,NEW.created_by,NEW.request_key,NEW.fingerprint,NEW.created_at) IS DISTINCT FROM ROW(OLD.tenant_id,OLD.order_id,OLD.folio_id,OLD.amount_cents,OLD.order_snapshot,OLD.authorization_evidence,OLD.created_by,OLD.request_key,OLD.fingerprint,OLD.created_at) THEN RAISE EXCEPTION 'Outlet source and posted/rejected evidence are immutable'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER hotel_outlet_immutable BEFORE UPDATE OR DELETE ON hotel_outlet_posts FOR EACH ROW EXECUTE FUNCTION hotel_outlet_immutable();


-- Immutable agency offers and independent acceptance

CREATE TABLE agency_offer_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,opportunity_id uuid NOT NULL,revision integer NOT NULL CHECK(revision>0),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 999999999900),terms varchar(2000) NOT NULL CHECK(length(trim(terms))>0),valid_until date,
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','accepted','rejected')),created_by uuid NOT NULL,reviewed_by uuid,review_note varchar(1000),reviewed_at timestamptz,
 request_key text NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),version integer NOT NULL DEFAULT 1,
 FOREIGN KEY(tenant_id,opportunity_id) REFERENCES agency_opportunities(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,reviewed_by) REFERENCES users(tenant_id,id),
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,opportunity_id,revision),UNIQUE(tenant_id,request_key),
 CHECK((status='submitted' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR (status IN ('accepted','rejected') AND reviewed_by IS NOT NULL AND reviewed_by<>created_by AND reviewed_at IS NOT NULL AND length(trim(review_note))>0))
);
CREATE FUNCTION agency_offer_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.status<>'submitted' OR ROW(NEW.tenant_id,NEW.opportunity_id,NEW.revision,NEW.amount_cents,NEW.terms,NEW.valid_until,NEW.created_by,NEW.request_key,NEW.fingerprint,NEW.created_at) IS DISTINCT FROM ROW(OLD.tenant_id,OLD.opportunity_id,OLD.revision,OLD.amount_cents,OLD.terms,OLD.valid_until,OLD.created_by,OLD.request_key,OLD.fingerprint,OLD.created_at) THEN RAISE EXCEPTION 'Offer terms and reviewed evidence are immutable';END IF;RETURN NEW;END $$;
CREATE TRIGGER agency_offer_immutable BEFORE UPDATE OR DELETE ON agency_offer_revisions FOR EACH ROW EXECUTE FUNCTION agency_offer_immutable();


-- Counter workflow selection

ALTER TABLE tenant_foundations ADD COLUMN IF NOT EXISTS workflow_ids text[];
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='tenant_foundation_workflow_ids' AND conrelid='tenant_foundations'::regclass) THEN
  ALTER TABLE tenant_foundations ADD CONSTRAINT tenant_foundation_workflow_ids CHECK(workflow_ids IS NULL OR (array_ndims(workflow_ids) IS NULL OR array_ndims(workflow_ids)=1) AND cardinality(workflow_ids)<=32 AND array_position(workflow_ids,NULL) IS NULL);
 END IF;
END $$;
COMMENT ON COLUMN tenant_foundations.workflow_ids IS 'NULL preserves eligible legacy counter workflows; an empty array explicitly disables them. Catalog and dependencies are validated by the API.';


CREATE TABLE erp_schema_migrations (
  version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now(), description text NOT NULL
);
INSERT INTO erp_schema_migrations(version,description) VALUES ('baseline_001','ERP schema including contacts, retail stock, food orders, professional services, trades, fitness, manufacturing shared business activities and tenant foundation blueprints; supersedes legacy migrations 001Ã¢â‚¬â€œ051');

COMMIT;

-- 060: optional package classification; existing foundation and counter identities remain unchanged.

ALTER TABLE tenant_foundations ADD COLUMN IF NOT EXISTS package_family_id text;
ALTER TABLE tenant_foundations ADD COLUMN IF NOT EXISTS specialization_id text;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tenant_foundations_package_pair' AND conrelid='tenant_foundations'::regclass) THEN
  ALTER TABLE tenant_foundations ADD CONSTRAINT tenant_foundations_package_pair CHECK (
   (package_family_id IS NULL AND specialization_id IS NULL) OR
   (package_family_id IS NOT NULL AND specialization_id IS NOT NULL AND length(trim(package_family_id)) BETWEEN 1 AND 60 AND length(trim(specialization_id)) BETWEEN 1 AND 80));
 END IF;
END $$;


-- Optional specialist operational annexes, migration 061
BEGIN;
-- Typed operational annexes; no modifications to financial/stock/property tables.
CREATE TABLE IF NOT EXISTS specialist_container_movements (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 status text NOT NULL DEFAULT 'recorded' CHECK(status IN ('recorded')),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 note varchar(2000) NOT NULL CHECK(length(trim(note))>0),created_by uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),
contact_id uuid NOT NULL,container_type varchar(80) NOT NULL CHECK(length(trim(container_type))>0),direction text NOT NULL CHECK(direction IN ('issue','return')),quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10000),FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS specialist_container_movements_queue ON specialist_container_movements(tenant_id,status,created_at);
CREATE OR REPLACE FUNCTION specialist_custody_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Container movements are append-only; record an opposite custody movement'; END $$;
 DROP TRIGGER IF EXISTS specialist_custody_immutable ON specialist_container_movements;
 CREATE TRIGGER specialist_custody_immutable BEFORE UPDATE OR DELETE ON specialist_container_movements FOR EACH ROW EXECUTE FUNCTION specialist_custody_immutable();
 CREATE TABLE IF NOT EXISTS specialist_salon_visits (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 status text NOT NULL DEFAULT 'booked' CHECK(status IN ('booked','arrived','in_service','completed','cancelled','no_show')),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 note varchar(2000) NOT NULL CHECK(length(trim(note))>0),created_by uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),
contact_id uuid NOT NULL,staff_id uuid NOT NULL,chair varchar(80) NOT NULL CHECK(length(trim(chair))>0),service varchar(150) NOT NULL CHECK(length(trim(service))>0),starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),FOREIGN KEY(tenant_id,staff_id) REFERENCES users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS specialist_salon_visits_queue ON specialist_salon_visits(tenant_id,status,created_at);
CREATE TABLE IF NOT EXISTS specialist_laundry_tickets (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','sorting','washing','drying','packing','qc','ready','released','cancelled')),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 note varchar(2000) NOT NULL CHECK(length(trim(note))>0),created_by uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),
contact_id uuid NOT NULL,basis text NOT NULL CHECK(basis IN ('kg','piece')),gross numeric(12,3) NOT NULL CHECK(gross>0),tare numeric(12,3) NOT NULL CHECK(tare>=0 AND tare<gross),net_quantity numeric(12,3) GENERATED ALWAYS AS (gross-tare) STORED,bag_codes text[] NOT NULL CHECK(cardinality(bag_codes) BETWEEN 1 AND 100),promised_at timestamptz NOT NULL,CHECK(basis='kg' OR (tare=0 AND gross=trunc(gross))),FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS specialist_laundry_tickets_queue ON specialist_laundry_tickets(tenant_id,status,created_at);
CREATE TABLE IF NOT EXISTS specialist_food_pickups (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 status text NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','collected','cancelled')),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 note varchar(2000) NOT NULL CHECK(length(trim(note))>0),created_by uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),
order_id uuid NOT NULL,pickup_name varchar(150) NOT NULL CHECK(length(trim(pickup_name))>0),FOREIGN KEY(tenant_id,order_id) REFERENCES food_orders(tenant_id,id),UNIQUE(tenant_id,order_id)
);
CREATE INDEX IF NOT EXISTS specialist_food_pickups_queue ON specialist_food_pickups(tenant_id,status,created_at);
CREATE TABLE IF NOT EXISTS specialist_auto_intakes (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','inspection','authorised','in_progress','qc','released','cancelled')),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 note varchar(2000) NOT NULL CHECK(length(trim(note))>0),created_by uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),
job_id uuid NOT NULL,vehicle varchar(150) NOT NULL CHECK(length(trim(vehicle))>0),odometer integer NOT NULL CHECK(odometer BETWEEN 0 AND 9999999),authorised_estimate numeric(12,2),FOREIGN KEY(tenant_id,job_id) REFERENCES trade_jobs(tenant_id,id),UNIQUE(tenant_id,job_id)
);
CREATE INDEX IF NOT EXISTS specialist_auto_intakes_queue ON specialist_auto_intakes(tenant_id,status,created_at);
CREATE TABLE IF NOT EXISTS specialist_retail_handoffs (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 status text NOT NULL DEFAULT 'picking' CHECK(status IN ('picking','packed','released','cancelled')),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 note varchar(2000) NOT NULL CHECK(length(trim(note))>0),created_by uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),
order_id uuid NOT NULL,FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),UNIQUE(tenant_id,order_id)
);
CREATE INDEX IF NOT EXISTS specialist_retail_handoffs_queue ON specialist_retail_handoffs(tenant_id,status,created_at);
CREATE TABLE IF NOT EXISTS specialist_service_visits (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','dispatched','arrived','completed','cancelled')),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 note varchar(2000) NOT NULL CHECK(length(trim(note))>0),created_by uuid NOT NULL,request_key uuid NOT NULL,fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),
job_id uuid,engagement_id uuid,staff_id uuid NOT NULL,site varchar(255) NOT NULL CHECK(length(trim(site))>0),starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),CHECK((job_id IS NOT NULL)::integer+(engagement_id IS NOT NULL)::integer=1),FOREIGN KEY(tenant_id,job_id) REFERENCES trade_jobs(tenant_id,id),FOREIGN KEY(tenant_id,engagement_id) REFERENCES service_engagements(tenant_id,id),FOREIGN KEY(tenant_id,staff_id) REFERENCES users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS specialist_service_visits_queue ON specialist_service_visits(tenant_id,status,created_at);
COMMIT;

-- Migration 062 retail checkout
BEGIN;
-- Additive retail POS evidence. No historical amount or journal rewrites.
ALTER TABLE retail_orders ADD COLUMN pos_snapshot jsonb;
ALTER TABLE retail_order_lines ADD COLUMN pos_net_cents bigint CHECK(pos_net_cents>=0 AND pos_net_cents<=round(line_total*100));
ALTER TABLE retail_pos_receipts ADD COLUMN checkout_details jsonb;
ALTER TABLE retail_pos_receipts ADD UNIQUE(tenant_id,id);
ALTER TABLE retail_fulfillment_lines DROP CONSTRAINT retail_fulfillment_lines_amount_cents_check;
ALTER TABLE retail_fulfillment_lines ADD CHECK(amount_cents>=0);
ALTER TABLE retail_credit_notes DROP CONSTRAINT retail_credit_notes_total_check;
ALTER TABLE retail_credit_notes ADD CHECK(total>=0);
CREATE TABLE retail_pos_policy(
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 cashier_discount_enabled boolean NOT NULL DEFAULT false,max_discount_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK(max_discount_percent BETWEEN 0 AND 100),
 max_discount_cents bigint NOT NULL DEFAULT 0 CHECK(max_discount_cents BETWEEN 0 AND 999999999999),updated_by uuid,updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,updated_by) REFERENCES users(tenant_id,id));
CREATE TABLE retail_pos_customer_requests(
 tenant_id uuid NOT NULL REFERENCES tenants(id),request_key uuid NOT NULL,contact_id uuid NOT NULL,fingerprint text NOT NULL,
 created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,request_key),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id));
CREATE TABLE retail_pos_walk_in(tenant_id uuid PRIMARY KEY REFERENCES tenants(id),contact_id uuid NOT NULL,FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id));
CREATE TABLE retail_pos_action_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),receipt_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('return','refund','reverse')),payload jsonb NOT NULL,fingerprint text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),version integer NOT NULL DEFAULT 1,
 created_by uuid NOT NULL,reviewed_by uuid,request_key uuid NOT NULL,result jsonb,created_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz,
 CHECK(reviewed_by IS NULL OR reviewed_by<>created_by),UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),
 FOREIGN KEY(tenant_id,receipt_id) REFERENCES retail_pos_receipts(tenant_id,id),FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id),FOREIGN KEY(tenant_id,reviewed_by) REFERENCES users(tenant_id,id));
ALTER TABLE retail_order_settlements DROP CONSTRAINT retail_order_settlements_method_check;
ALTER TABLE retail_order_settlements ADD CHECK(method IN ('cash','bank_transfer','gcash','maya','card'));
ALTER TABLE retail_refunds DROP CONSTRAINT retail_refunds_method_check;
ALTER TABLE retail_refunds ADD CHECK(method IN ('cash','bank_transfer','gcash','maya','card'));
COMMIT;

-- Platform licensing (063): additive, existing access preserved.
BEGIN;
-- Existing subscriptions/expiry dates are deliberately not backfilled or restricted.
CREATE TABLE IF NOT EXISTS platform_licenses (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id),
 kind varchar(10) NOT NULL CHECK(kind IN ('trial','paid')),
 trial_days integer NOT NULL CHECK(trial_days BETWEEN 1 AND 3650),
 grace_days integer NOT NULL CHECK(grace_days BETWEEN 0 AND 365),
 platforms text[] NOT NULL CHECK(cardinality(platforms) BETWEEN 1 AND 3 AND platforms <@ ARRAY['cloud','desktop','android']::text[]),
 started_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, grace_ends_at timestamptz NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_at>started_at AND grace_ends_at>=expires_at)
);
CREATE TABLE IF NOT EXISTS platform_license_keys (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES platform_licenses(tenant_id),
 revision integer NOT NULL CHECK(revision>0),kind varchar(10) NOT NULL CHECK(kind IN ('trial','extension')),
 key_digest varchar(64) NOT NULL UNIQUE,key_prefix varchar(20) NOT NULL,key_suffix varchar(8) NOT NULL,
 payment_id uuid UNIQUE REFERENCES platform_subscription_payments(id),
 policy jsonb NOT NULL,issued_by varchar(36) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,revision)
);
CREATE TABLE IF NOT EXISTS platform_license_notices (
 tenant_id uuid NOT NULL REFERENCES platform_licenses(tenant_id),revision integer NOT NULL,
 recipient_id uuid NOT NULL REFERENCES users(id),stage varchar(30) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,revision,recipient_id,stage)
);
COMMIT;

-- Package commerce 064 and 065: additive commercial records; no seed data.
BEGIN;
-- Additive: old USD subscription/license records are intentionally unchanged.
CREATE TABLE IF NOT EXISTS package_commerce_quotes (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id),
 snapshot jsonb NOT NULL, payment_instructions text, created_by uuid NOT NULL REFERENCES users(id),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), CHECK(jsonb_typeof(snapshot)='object')
);
CREATE TABLE IF NOT EXISTS package_commerce_payments (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), quote_id uuid NOT NULL,
 amount_cents bigint NOT NULL CHECK(amount_cents>0), method varchar(80) NOT NULL, reference varchar(190) NOT NULL,
 request_key varchar(100) NOT NULL, status varchar(12) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
 submitted_by uuid NOT NULL REFERENCES users(id), reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz,
 receipt_confirmed boolean NOT NULL DEFAULT false, note text, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,quote_id) REFERENCES package_commerce_quotes(tenant_id,id),
 UNIQUE(tenant_id,request_key), UNIQUE(tenant_id,id), CHECK((status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR (status<>'pending' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
 CHECK(status<>'verified' OR receipt_confirmed)
);
CREATE UNIQUE INDEX IF NOT EXISTS package_commerce_quote_claim ON package_commerce_payments(quote_id) WHERE status IN ('pending','verified');
CREATE TABLE IF NOT EXISTS package_commerce_contracts (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),payment_id uuid UNIQUE,
 revision integer NOT NULL CHECK(revision>0),kind varchar(10) NOT NULL CHECK(kind IN ('trial','paid')),
 deployment varchar(10) NOT NULL CHECK(deployment IN ('cloud','desktop')), snapshot jsonb NOT NULL,
 starts_at timestamptz NOT NULL,expires_at timestamptz,grace_ends_at timestamptz,
 updates_until timestamptz,support_until timestamptz,superseded_at timestamptz,
 created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,payment_id) REFERENCES package_commerce_payments(tenant_id,id),UNIQUE(tenant_id,revision),UNIQUE(tenant_id,id),
 CHECK((deployment='desktop' AND kind='paid' AND expires_at IS NULL AND grace_ends_at IS NULL) OR (deployment='cloud' AND expires_at>starts_at AND grace_ends_at>=expires_at)),
 CHECK((kind='trial' AND payment_id IS NULL) OR (kind='paid' AND payment_id IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS package_commerce_audits (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),actor_id uuid NOT NULL REFERENCES users(id),
 action varchar(60) NOT NULL,details jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS package_commerce_contract_access ON package_commerce_contracts(tenant_id,starts_at DESC);
CREATE OR REPLACE FUNCTION package_commerce_protect_quote() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Package quotations are immutable; create a new quotation';
END;
$$;
DROP TRIGGER IF EXISTS package_commerce_quote_immutable ON package_commerce_quotes;
CREATE TRIGGER package_commerce_quote_immutable BEFORE UPDATE OR DELETE ON package_commerce_quotes FOR EACH ROW EXECUTE FUNCTION package_commerce_protect_quote();
CREATE OR REPLACE FUNCTION package_commerce_protect_contract() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Package contracts are immutable'; END IF;
 IF (to_jsonb(NEW)-'superseded_at') IS DISTINCT FROM (to_jsonb(OLD)-'superseded_at')
    OR OLD.superseded_at IS NOT NULL OR NEW.superseded_at IS NULL THEN
  RAISE EXCEPTION 'Package contract terms are immutable';
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS package_commerce_contract_immutable ON package_commerce_contracts;
CREATE TRIGGER package_commerce_contract_immutable BEFORE UPDATE OR DELETE ON package_commerce_contracts FOR EACH ROW EXECUTE FUNCTION package_commerce_protect_contract();
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS package_commerce_notices (
 tenant_id uuid NOT NULL REFERENCES tenants(id),contract_id uuid NOT NULL,
 recipient_id uuid NOT NULL REFERENCES users(id),stage varchar(30) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(contract_id,recipient_id,stage),
 FOREIGN KEY(tenant_id,contract_id) REFERENCES package_commerce_contracts(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS package_commerce_branches (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), name varchar(100) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS package_commerce_installations (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), branch_id uuid NOT NULL,
 installation_id uuid NOT NULL, status varchar(10) NOT NULL CHECK(status IN ('active','revoked')),
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 revoked_by uuid REFERENCES users(id), reason varchar(500), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,installation_id), FOREIGN KEY(tenant_id,branch_id) REFERENCES package_commerce_branches(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS package_commerce_desktop_activations (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), contract_id uuid NOT NULL,
 installation_id uuid NOT NULL, local_business_id uuid NOT NULL, public_fingerprint varchar(64) NOT NULL,
 purchased_version varchar(50) NOT NULL, signed_grant text NOT NULL, issued_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(contract_id), UNIQUE(tenant_id,installation_id,contract_id),
 FOREIGN KEY(tenant_id,contract_id) REFERENCES package_commerce_contracts(tenant_id,id)
);
COMMIT;

-- Full desktop registration 066 and desktop-primary reporting replica067.
BEGIN;
CREATE TABLE IF NOT EXISTS desktop_registrations (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id),local_business_id uuid NOT NULL UNIQUE,
 installation_id uuid NOT NULL UNIQUE,public_fingerprint varchar(64) NOT NULL UNIQUE,public_key text NOT NULL,
 source varchar(30) NOT NULL DEFAULT 'local-generated' CHECK(source='local-generated'),
 package_id varchar(80) NOT NULL,local_trial_key varchar(100) NOT NULL,business_name varchar(100) NOT NULL,
 owner_name varchar(100) NOT NULL,owner_email varchar(190) NOT NULL,
 verification_status varchar(12) NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','verified')),
 cloud_enabled boolean NOT NULL DEFAULT false,reviewed_by uuid REFERENCES users(id),review_note varchar(1000),
 app_version varchar(50) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),last_seen_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT cloud_enabled OR verification_status='verified')
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS desktop_replica_runs (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES desktop_registrations(tenant_id),installation_id uuid NOT NULL,
 sequence bigint NOT NULL CHECK(sequence>0),digest varchar(64) NOT NULL,manifest jsonb NOT NULL,
 status varchar(12) NOT NULL DEFAULT 'uploading' CHECK(status IN ('uploading','complete')),
 created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,
 UNIQUE(tenant_id,sequence),UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS desktop_replica_chunks (
 tenant_id uuid NOT NULL,run_id uuid NOT NULL,chunk_index integer NOT NULL CHECK(chunk_index>=0),digest varchar(64) NOT NULL,content text NOT NULL,
 PRIMARY KEY(run_id,chunk_index),FOREIGN KEY(tenant_id,run_id) REFERENCES desktop_replica_runs(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS desktop_replica_records (
 tenant_id uuid NOT NULL,run_id uuid NOT NULL,table_name varchar(63) NOT NULL,record_key varchar(200) NOT NULL,data jsonb NOT NULL,
 PRIMARY KEY(run_id,table_name,record_key),FOREIGN KEY(tenant_id,run_id) REFERENCES desktop_replica_runs(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS desktop_replica_assets (
 tenant_id uuid NOT NULL,run_id uuid NOT NULL,asset_id uuid NOT NULL,size integer NOT NULL CHECK(size>=0 AND size<=10485760),digest varchar(64) NOT NULL,contents bytea NOT NULL,
 PRIMARY KEY(run_id,asset_id),FOREIGN KEY(tenant_id,run_id) REFERENCES desktop_replica_runs(tenant_id,id),CHECK(octet_length(contents)=size)
);
COMMIT;

-- Offline purchased-version issuance without a required cloud tenant, migration068

BEGIN;
CREATE TABLE IF NOT EXISTS offline_licenses (
 id uuid PRIMARY KEY, platform varchar(10) NOT NULL CHECK(platform IN ('desktop','android')),
 installation_id uuid NOT NULL,local_business_id uuid NOT NULL,public_fingerprint char(64) NOT NULL,
 business_name varchar(120) NOT NULL,customer_contact varchar(200) NOT NULL,
 source varchar(24) NOT NULL DEFAULT 'local-generated' CHECK(source='local-generated'),
 tenant_id uuid REFERENCES tenants(id),created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(platform,installation_id,local_business_id)
);
CREATE TABLE IF NOT EXISTS offline_license_issues (
 id uuid PRIMARY KEY,license_id uuid NOT NULL REFERENCES offline_licenses(id),revision integer NOT NULL CHECK(revision>0),
 request_key uuid NOT NULL UNIQUE,request_digest char(64) NOT NULL,request_metadata jsonb NOT NULL,
 snapshot jsonb NOT NULL,payment jsonb NOT NULL,signed_grant text NOT NULL,issuer_key_id varchar(40) NOT NULL,
 purchased_version varchar(50) NOT NULL,created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(license_id,revision)
);
CREATE TABLE IF NOT EXISTS offline_license_audits (
 id uuid PRIMARY KEY,license_id uuid NOT NULL REFERENCES offline_licenses(id),issue_id uuid NOT NULL REFERENCES offline_license_issues(id),
 actor_id uuid NOT NULL REFERENCES users(id),action varchar(40) NOT NULL,details jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;

-- Local item pictures travel with database backups, never with cloud reporting.
CREATE TABLE IF NOT EXISTS retail_product_images (
 tenant_id uuid NOT NULL,
 product_id uuid NOT NULL,
 mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
 body bytea NOT NULL CHECK (octet_length(body) BETWEEN 12 AND 2097152),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (tenant_id,product_id),
 FOREIGN KEY (tenant_id,product_id) REFERENCES retail_products(tenant_id,id) ON DELETE CASCADE
);


-- Optional shared operational evidence. No stock, payment or ledger backfill.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS fleet_employee_tenant_key ON employees(tenant_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS fleet_settlement_tenant_key ON retail_order_settlements(tenant_id,id);
CREATE TABLE IF NOT EXISTS fleet_vehicles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 name varchar(150) NOT NULL, plate varchar(40) NOT NULL, kind text NOT NULL CHECK(kind IN ('tricycle','motorcycle','van','truck','other')),
 capacity_note varchar(300) NOT NULL DEFAULT '', available boolean NOT NULL DEFAULT true,
 request_key uuid NOT NULL, fingerprint text NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS fleet_vehicle_plate ON fleet_vehicles(tenant_id,lower(plate));
CREATE TABLE IF NOT EXISTS fleet_trips (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 vehicle_id uuid NOT NULL, driver_id uuid NOT NULL, helper_id uuid,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, note varchar(1000) NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','dispatched','returned','closed','cancelled')),
 request_key uuid NOT NULL, fingerprint text NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 counted_cash_cents bigint CHECK(counted_cash_cents BETWEEN 0 AND 999999990000), cash_difference_cents bigint,
 shortfall_reason varchar(1000), discrepancy_reason varchar(1000), closed_by uuid REFERENCES users(id),
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,vehicle_id) REFERENCES fleet_vehicles(tenant_id,id),
 FOREIGN KEY(tenant_id,driver_id) REFERENCES employees(tenant_id,id), FOREIGN KEY(tenant_id,helper_id) REFERENCES employees(tenant_id,id),
 CHECK(ends_at>starts_at AND ends_at<=starts_at+interval '7 days'), CHECK(helper_id IS NULL OR helper_id<>driver_id),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,request_key)
);
CREATE INDEX IF NOT EXISTS fleet_trip_queue ON fleet_trips(tenant_id,status,starts_at);
CREATE TABLE IF NOT EXISTS fleet_stops (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, trip_id uuid NOT NULL,
 customer_id uuid NOT NULL, order_id uuid, address varchar(500) NOT NULL, sequence integer NOT NULL CHECK(sequence>0),
 expected_cents bigint NOT NULL CHECK(expected_cents BETWEEN 0 AND 9999999900),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered','partial','failed')),
 outcome_note varchar(1000), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 request_key uuid NOT NULL, fingerprint text NOT NULL,
 FOREIGN KEY(tenant_id,trip_id) REFERENCES fleet_trips(tenant_id,id), FOREIGN KEY(tenant_id,customer_id) REFERENCES erp_contacts(tenant_id,id),
 FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,request_key), UNIQUE(trip_id,sequence)
);
CREATE TABLE IF NOT EXISTS fleet_stop_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, stop_id uuid NOT NULL, product_id uuid NOT NULL,
 product_name varchar(200) NOT NULL, unit varchar(30) NOT NULL,
 loaded_milli bigint NOT NULL CHECK(loaded_milli BETWEEN 1 AND 1000000000),
 delivered_milli bigint NOT NULL DEFAULT 0 CHECK(delivered_milli>=0),
 returned_milli bigint NOT NULL DEFAULT 0 CHECK(returned_milli>=0), damaged_milli bigint NOT NULL DEFAULT 0 CHECK(damaged_milli>=0),
 FOREIGN KEY(tenant_id,stop_id) REFERENCES fleet_stops(tenant_id,id), FOREIGN KEY(tenant_id,product_id) REFERENCES retail_products(tenant_id,id),
 CHECK(delivered_milli+returned_milli+damaged_milli<=loaded_milli), UNIQUE(stop_id,product_id)
);
CREATE TABLE IF NOT EXISTS fleet_collections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, stop_id uuid NOT NULL,
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999900),
 method text NOT NULL CHECK(method IN ('cash','gcash','maya','bank_transfer','card')), reference varchar(150) NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
 settlement_id uuid, review_note varchar(1000), reviewed_by uuid REFERENCES users(id),
 request_key uuid NOT NULL, fingerprint text NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,stop_id) REFERENCES fleet_stops(tenant_id,id),
 FOREIGN KEY(tenant_id,settlement_id) REFERENCES retail_order_settlements(tenant_id,id),
 CHECK(reviewed_by IS NULL OR reviewed_by<>created_by), UNIQUE(tenant_id,request_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS fleet_collection_settlement ON fleet_collections(tenant_id,settlement_id) WHERE status='verified' AND settlement_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS fleet_collection_reference ON fleet_collections(tenant_id,method,reference) WHERE status<>'rejected';
COMMIT;
BEGIN;
-- Only valid existing Water selections gain the required operational blocks.
-- Historical signed grants/contracts, roles and every operational table remain untouched.
WITH candidates AS (
 SELECT tenant_id,to_jsonb(f) AS old_values,
 ARRAY(SELECT DISTINCT b FROM unnest(f.blocks || ARRAY['water-custody','delivery-fleet','contacts','inventory','staff']) b ORDER BY b) AS expanded
 FROM tenant_foundations f
 WHERE industry_id='retail' AND blocks @> ARRAY['inventory','retail-pos']
 AND (specialization_id='water-refilling' OR (specialization_id IS NULL AND workflow_ids @> ARRAY['water-desk'] AND blocks @> ARRAY['water-custody']))
 AND NOT blocks @> ARRAY['water-custody','delivery-fleet','contacts','inventory','staff']
), changed AS (
 UPDATE tenant_foundations f SET blocks=c.expanded,version=f.version+1,updated_at=now()
 FROM candidates c WHERE f.tenant_id=c.tenant_id
 RETURNING f.tenant_id,c.old_values,to_jsonb(f) AS new_values
)
INSERT INTO audit_logs(tenant_id,action,entity_type,entity_id,old_values,new_values)
SELECT tenant_id,'foundation.water-fleet-standard','TenantFoundation',tenant_id,old_values,new_values FROM changed;
COMMIT;

-- Industry notification lifecycle 072
BEGIN;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS operation jsonb;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_required boolean NOT NULL DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
CREATE INDEX IF NOT EXISTS ix_notifications_owner_inbox ON notifications(tenant_id,recipient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ix_notifications_actions ON notifications(tenant_id,recipient_id,action_required,resolved_at);

-- Curated operational records only. Never attach to users, journals, audit logs or notifications.
CREATE OR REPLACE FUNCTION operational_owner_notification() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n jsonb;o jsonb; t uuid; f text[]; source text; state text; prior text; verb text; label text; actor text; actor_name text; required boolean; payload jsonb; owner_row record; event_key text;
BEGIN
 n:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 t:=(n->>'tenant_id')::uuid;source:=COALESCE(n->>'id',n->>'order_line_id');IF t IS NULL OR source IS NULL THEN RETURN NEW;END IF;
 SELECT blocks INTO f FROM tenant_foundations WHERE tenant_id::text=t::text;
 IF NOT (CASE WHEN TG_TABLE_NAME='retail_orders' AND n->>'kind'='purchase' THEN 'retail-purchase' WHEN TG_TABLE_NAME LIKE 'retail_payroll_%' AND 'retail-payroll'=ANY(f) THEN 'retail-payroll' ELSE TG_ARGV[1] END)=ANY(COALESCE(f,ARRAY[]::text[])) THEN RETURN NEW;END IF;
 IF TG_OP='UPDATE' THEN
  o:=to_jsonb(OLD);
  IF (n-ARRAY['updated_at','version','updated_by','reviewed_at']) IS NOT DISTINCT FROM (o-ARRAY['updated_at','version','updated_by','reviewed_at']) THEN RETURN NEW;END IF;
 END IF;
 state:=CASE WHEN TG_OP='DELETE' THEN 'deleted' WHEN TG_TABLE_NAME='specialist_container_movements' THEN n->>'direction' ELSE COALESCE(n->>'status',n->>'stage',n->>'direction','recorded') END;prior:=COALESCE(o->>'status',o->>'stage',o->>'direction');
 verb:=CASE WHEN TG_OP='INSERT' THEN 'created' WHEN TG_OP='DELETE' THEN 'deleted' WHEN prior IS DISTINCT FROM state THEN state ELSE 'updated' END;
 label:=COALESCE(n->>'document_number',n->>'receipt_number',n->>'sku',n->>'name',n->>'title',n->>'label',n->>'container_type',left(source,8));
 actor:=CASE WHEN TG_OP='INSERT' THEN COALESCE(n->>'actor_id',n->>'created_by',n->>'cashier_id') ELSE COALESCE(CASE WHEN n->>'updated_by' IS DISTINCT FROM o->>'updated_by' THEN n->>'updated_by' END,CASE WHEN n->>'reviewed_by' IS DISTINCT FROM o->>'reviewed_by' THEN n->>'reviewed_by' END) END;
 SELECT full_name INTO actor_name FROM users WHERE tenant_id::text=t::text AND id::text=actor;
 required:=state=ANY(ARRAY['pending','submitted','awaiting_approval','awaiting_verification','ready','returned','on_hold','blocked','qc','inspection']);
 payload:=jsonb_build_object('module',TG_ARGV[0],'block',TG_ARGV[1],'sourceTable',TG_TABLE_NAME,'sourceId',source,'reference',label,'label',TG_ARGV[2],'fromStatus',prior,'status',state,'event',verb,'actorId',actor,'actorName',actor_name,'eventTransaction',txid_current()::text,'route',TG_ARGV[3],'industryPriority',TG_ARGV[4]::int,'priority',CASE WHEN required THEN 'action' ELSE 'information' END,
  'amount',COALESCE(n->'amount',n->'total'),'amountCents',COALESCE(n->'amount_cents',n->'total_cents'),'direction',n->>'direction','containerType',n->>'container_type','contactId',n->>'contact_id','quantity',n->'quantity','unit',n->>'unit','orderId',COALESCE(n->>'order_id',CASE WHEN TG_TABLE_NAME='retail_orders' THEN source END));
 IF TG_TABLE_NAME='retail_orders' AND n->>'kind'='purchase' THEN payload:=payload||jsonb_build_object('block','retail-purchase','label','Purchase order','route','/dashboard/retail-purchase');END IF;
 IF TG_TABLE_NAME LIKE 'retail_payroll_%' AND 'retail-payroll'=ANY(f) AND NOT 'payroll'=ANY(f) THEN payload:=payload||jsonb_build_object('block','retail-payroll','route','/dashboard/retail-payroll');END IF;
 UPDATE notifications SET resolved_at=now() WHERE tenant_id::text=t::text AND operation->>'sourceTable'=TG_TABLE_NAME AND operation->>'sourceId'=source AND operation->>'alert' IS NULL AND action_required AND resolved_at IS NULL;
 event_key:='op:'||TG_TABLE_NAME||':'||source||':'||gen_random_uuid()::text;
 FOR owner_row IN SELECT id FROM users WHERE tenant_id::text=t::text AND role='owner' AND status='active' LOOP
  INSERT INTO notifications(id,tenant_id,recipient_type,recipient_id,title,body,dedupe_key,is_read,operation,action_required)
  VALUES(gen_random_uuid(),t,'staff',owner_row.id,left((payload->>'label')||' Â· '||verb,150),label||CASE WHEN prior IS DISTINCT FROM state AND prior IS NOT NULL THEN ' Â· '||prior||' â†’ '||state ELSE ' Â· '||state END,event_key||':'||owner_row.id,false,payload,required)
  ON CONFLICT(tenant_id,dedupe_key) DO NOTHING;
 END LOOP;
 RETURN NEW;
END $$;

-- Audit writes enrich actor attribution only; they never generate notification events.
CREATE OR REPLACE FUNCTION operational_notification_actor() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_name text;BEGIN
 IF NEW.tenant_id IS NULL OR NEW.user_id IS NULL THEN RETURN NEW;END IF;
 SELECT full_name INTO actor_name FROM users WHERE tenant_id::text=NEW.tenant_id::text AND id::text=NEW.user_id::text;
 IF actor_name IS NULL THEN RETURN NEW;END IF;
 UPDATE notifications SET operation=operation||jsonb_build_object('actorId',NEW.user_id,'actorName',actor_name)
 WHERE tenant_id::text=NEW.tenant_id::text AND operation->>'eventTransaction'=txid_current()::text AND (operation->>'sourceId'=NEW.entity_id::text OR operation->>'orderId'=NEW.entity_id::text);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS operational_notification_actor ON audit_logs;
CREATE TRIGGER operational_notification_actor AFTER INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION operational_notification_actor();

DO $$ DECLARE d record;BEGIN
 FOR d IN SELECT * FROM (VALUES
 ('retail_products','retail','inventory','Product','/dashboard/retail',1),
 ('retail_stock_movements','inventory','inventory','Stock movement','/dashboard/retail',1),
 ('retail_orders','retail','retail-sales','Retail order','/dashboard/retail-sales',1),
 ('retail_order_settlements','retail','retail-accounting','Order payment','/dashboard/retail-sales',1),
 ('retail_credit_notes','retail','retail-accounting','Credit or return','/dashboard/retail-documents',1),
 ('retail_refunds','retail','retail-accounting','Retail refund','/dashboard/retail-documents',1),
 ('retail_supplier_bills','retail','retail-purchase','Supplier bill','/dashboard/retail-purchase',1),
 ('retail_quotes','retail','retail-sales','Retail quote','/dashboard/retail-store',1),
 ('retail_deposits','retail','retail-sales','Customer deposit','/dashboard/retail-store',1),
 ('retail_deposit_refunds','retail','retail-sales','Deposit refund','/dashboard/retail-store',1),
 ('retail_fulfillments','retail','retail-sales','Order fulfillment','/dashboard/retail-sales',1),
 ('retail_cash_sessions','retail','retail-pos','Cash session','/dashboard/retail-pos',1),
 ('retail_pos_receipts','retail','retail-pos','POS receipt','/dashboard/retail-pos',1),
 ('retail_pos_action_requests','retail','retail-pos','POS review','/dashboard/retail-pos',1),
 ('retail_stock_counts','inventory','inventory','Stock count','/dashboard/inventory-operations',1),
 ('retail_reservations','retail','retail-sales','Stock reservation','/dashboard/retail-store',1),
 ('retail_deliveries','retail','retail-sales','Retail delivery','/dashboard/retail-store',1),
 ('retail_lots','inventory','inventory','Stock lot','/dashboard/inventory-operations',1),
 ('retail_price_rules','retail','retail-sales','Price rule','/dashboard/retail-store',1),
 ('fleet_vehicles','delivery-fleet','delivery-fleet','Fleet vehicle','/dashboard/delivery-fleet',1),
 ('fleet_trips','delivery-fleet','delivery-fleet','Delivery trip','/dashboard/delivery-fleet',1),
 ('fleet_stops','delivery-fleet','delivery-fleet','Customer stop','/dashboard/delivery-fleet',1),
 ('fleet_collections','delivery-fleet','delivery-fleet','Delivery collection','/dashboard/delivery-fleet',1),
 ('specialist_container_movements','water-refilling','water-custody','Water container custody','/dashboard/specialist-operations',1),
 ('specialist_salon_visits','salon','salon-appointments','Salon appointment','/dashboard/specialist-operations',1),
 ('specialist_laundry_tickets','laundry','laundry-custody','Laundry ticket','/dashboard/specialist-operations',1),
 ('specialist_food_pickups','food-beverage','food-pickup','Food pickup','/dashboard/specialist-operations',1),
 ('specialist_auto_intakes','auto-repair','auto-intake','Vehicle repair intake','/dashboard/specialist-operations',1),
 ('specialist_retail_handoffs','retail-store','retail-handover','Retail handover','/dashboard/specialist-operations',1),
 ('specialist_service_visits','services-contracting','service-visits','Service site visit','/dashboard/specialist-operations',1),
 ('food_orders','food-beverage','food','Kitchen order','/dashboard/food',1),
 ('leases','real-estate','rentals','Lease','/dashboard/leases',2),
 ('invoices','real-estate','property-finance','Property invoice','/dashboard/accounting',2),
 ('payments','real-estate','property-finance','Property payment','/dashboard/payments',2),
 ('maintenance_requests','real-estate','maintenance','Maintenance request','/dashboard/maintenance',2),
 ('hotel_pos_bookings','hotel','stays','Hotel booking','/dashboard/units',2),
 ('hotel_folio_entries','hotel','stays','Hotel charge or payment','/dashboard/units',2),
 ('hotel_adjustment_requests','hotel','stays','Hotel adjustment','/dashboard/industry-finance',2),
 ('hotel_housekeeping_assignments','hotel','stays','Housekeeping assignment','/dashboard/hotel-housekeeping',2),
 ('hotel_cash_sessions','hotel','stays','Reception cash session','/dashboard/industry-finance',2),
 ('agency_opportunities','agency','crm','Agency opportunity','/dashboard/industry-operations',2),
 ('agency_viewings','agency','crm','Property viewing','/dashboard/industry-operations',2),
 ('association_cases','association','association','Association case','/dashboard/industry-operations',2),
 ('service_engagements','services','services','Service engagement','/dashboard/services',3),
 ('service_time_entries','services','services','Time entry','/dashboard/services',3),
 ('service_milestones','services','services','Service milestone','/dashboard/industry-operations',3),
 ('trade_jobs','trades','trades','Trade job','/dashboard/trades',3),
 ('trade_job_checks','trades','trades','Job checklist','/dashboard/industry-operations',3),
 ('trade_actual_costs','trades','trades','Job cost','/dashboard/job-costs',3),
 ('commercial_invoices','commercial','contacts','Commercial invoice','/dashboard/commercial',3),
 ('commercial_entries','commercial','contacts','Commercial settlement','/dashboard/commercial',3),
 ('manufacturing_orders','manufacturing','manufacturing','Production order','/dashboard/manufacturing',3),
 ('manufacturing_boms','manufacturing','manufacturing','Bill of materials','/dashboard/manufacturing',3),
 ('fitness_memberships','fitness','fitness','Membership','/dashboard/fitness',3),
 ('fitness_classes','fitness','fitness','Fitness class','/dashboard/fitness',3),
 ('fitness_bookings','fitness','fitness','Class booking','/dashboard/fitness',3),
 ('business_activities','activities','activities','Business activity','/dashboard/activities',3),
 ('erp_overtime_requests','workforce','workforce','Overtime request','/dashboard/workforce',3),
 ('erp_attendance_corrections','workforce','workforce','Attendance correction','/dashboard/workforce',3),
 ('erp_leave_requests','workforce','workforce','Leave request','/dashboard/workforce',3),
 ('retail_payroll_runs','payroll','payroll','Payroll run','/dashboard/payroll',3),
 ('retail_payroll_payments','payroll','payroll','Payroll payment','/dashboard/payroll',3),
 ('retail_payroll_remittances','payroll','payroll','Payroll remittance','/dashboard/payroll',3),
 ('properties','real-estate','properties','Property','/dashboard/properties',2),
 ('units','real-estate','properties','Unit','/dashboard/units',2),
 ('contracts','real-estate','rentals','Lease contract','/dashboard/contracts',2),
 ('utility_charges','real-estate','property-finance','Utility charge','/dashboard/utilities',2),
 ('expenses','real-estate','property-finance','Property expense','/dashboard/expenses',2),
 ('business_records','real-estate','properties','Property operation','/dashboard/workspaces',2),
 ('renter_credit_movements','real-estate','property-finance','Renter credit or refund','/dashboard/settlements',2),
 ('service_contracts','services','services','Service contract','/dashboard/service-contracts',3),
 ('service_project_expenses','services','services','Service project expense','/dashboard/planning-services',3),
 ('trade_quotes','trades','trades','Trade quote','/dashboard/planning-trades',3),
 ('trade_material_issues','trades','trades','Job material issue','/dashboard/job-costs',3),
 ('association_resolutions','association','association','Association resolution','/dashboard/association-governance',2),
 ('association_budgets','association','association','Association budget','/dashboard/industry-finance',2),
 ('agency_commission_runs','agency','crm','Agency commission','/dashboard/industry-finance',2),
 ('agency_commission_payments','agency','crm','Commission payment','/dashboard/industry-finance',2),
 ('work_orders','real-estate','maintenance','Maintenance work order','/dashboard/maintenance',2),
 ('beds','real-estate','properties','Rentable bed','/dashboard/beds',2),
 ('food_menu_items','food-beverage','food','Menu item','/dashboard/food',1),
 ('food_dining_tables','food-beverage','food','Dining table','/dashboard/food',1),
 ('erp_stock_locations','inventory','inventory','Stock location','/dashboard/inventory-control',1),
 ('erp_shift_assignments','workforce','workforce','Shift assignment','/dashboard/workforce/planning',3),
 ('employees','workforce','staff','Employee record','/dashboard/hr',3),
 ('hotel_folios','hotel','stays','Guest folio','/dashboard/units',2),
 ('agency_listings','agency','crm','Agency listing','/dashboard/industry-operations',2),
 ('agency_buyer_briefs','agency','crm','Buyer brief','/dashboard/industry-operations',2),
 ('agency_offer_revisions','agency','crm','Offer revision','/dashboard/industry-operations',2),
 ('trade_recurring_plans','trades','trades','Recurring job plan','/dashboard/planning-trades',3),
 ('service_retainer_events','services','services','Service retainer event','/dashboard/service-contracts',3),
 ('hotel_outlet_posts','hotel','stays','Hotel outlet charge','/dashboard/hotel-outlets',2)
 ) AS definitions(tab,mod,block,label,route,priority) LOOP
  IF to_regclass(d.tab) IS NOT NULL THEN
   EXECUTE format('DROP TRIGGER IF EXISTS notify_operational_owners ON %I',d.tab);
   EXECUTE format('CREATE TRIGGER notify_operational_owners AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION operational_owner_notification(%L,%L,%L,%L,%L)',d.tab,d.mod,d.block,d.label,d.route,d.priority);
  END IF;
 END LOOP;
END $$;

-- Source-derived attention. Reading an alert is separate from resolving its condition.
CREATE OR REPLACE FUNCTION refresh_operation_due_alerts(t uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE d record;r record;j jsonb;f text[];u record;deadline timestamptz;needed boolean;key text;payload jsonb;
BEGIN
 SELECT blocks INTO f FROM tenant_foundations WHERE tenant_id::text=t::text;
 FOR d IN SELECT * FROM (VALUES
 ('retail_orders','retail','retail-sales','Order payment due','/dashboard/retail-sales','due_date',ARRAY['draft','cancelled']),
 ('fleet_trips','delivery-fleet','delivery-fleet','Delivery trip follow-up','/dashboard/delivery-fleet','ends_at',ARRAY['closed','cancelled']),
 ('specialist_laundry_tickets','laundry','laundry-custody','Laundry promised time','/dashboard/specialist-operations','promised_at',ARRAY['released','cancelled']),
 ('specialist_salon_visits','salon','salon-appointments','Appointment awaiting arrival','/dashboard/specialist-operations','starts_at',ARRAY['arrived','in_service','completed','cancelled','no_show']),
 ('specialist_service_visits','services-contracting','service-visits','Site visit overdue','/dashboard/specialist-operations','ends_at',ARRAY['completed','cancelled']),
 ('business_activities','activities','activities','Activity overdue','/dashboard/activities','due_date',ARRAY['completed','cancelled']),
 ('fitness_memberships','fitness','fitness','Membership renewal','/dashboard/fitness','end_date',ARRAY['cancelled','inactive'])
 ) AS definitions(tab,mod,block,label,route,duekey,terminal) LOOP
  IF NOT (d.block=ANY(COALESCE(f,ARRAY[]::text[])) OR d.tab='retail_orders' AND 'retail-purchase'=ANY(COALESCE(f,ARRAY[]::text[]))) OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=d.tab AND column_name=d.duekey) THEN CONTINUE;END IF;
  FOR r IN EXECUTE format('SELECT to_jsonb(s) AS value FROM %I s WHERE tenant_id::text=$1 AND (%I<=now()+interval ''7 days'' OR id::text IN (SELECT operation->>''sourceId'' FROM notifications WHERE tenant_id::text=$1 AND operation->>''alert''=$2 AND resolved_at IS NULL))',d.tab,d.duekey) USING t::text,'due:'||d.tab LOOP
   j:=r.value;key:='due:'||d.tab;deadline:=CASE WHEN length(j->>d.duekey)=10 THEN ((j->>d.duekey)::date+time '23:59:59') AT TIME ZONE 'Asia/Manila' ELSE (j->>d.duekey)::timestamptz END;
   needed:=deadline IS NOT NULL AND deadline<=now()+CASE WHEN d.tab='fitness_memberships' THEN interval '7 days' ELSE interval '0 days' END AND NOT COALESCE(j->>'status','')=ANY(d.terminal);
   IF d.tab='retail_orders' THEN
    needed:=needed AND COALESCE((j->>'total')::numeric,0)>(SELECT COALESCE(sum(amount),0) FROM retail_order_settlements WHERE tenant_id::text=t::text AND order_id::text=j->>'id');
    needed:=needed AND (CASE WHEN j->>'kind'='purchase' THEN 'retail-purchase' ELSE 'retail-sales' END)=ANY(f);
   END IF;
   IF NOT needed THEN UPDATE notifications SET resolved_at=now() WHERE tenant_id::text=t::text AND operation->>'alert'=key AND operation->>'sourceId'=j->>'id' AND resolved_at IS NULL;CONTINUE;END IF;
   payload:=jsonb_build_object('module',d.mod,'block',d.block,'sourceTable',d.tab,'sourceId',j->>'id','reference',COALESCE(j->>'title',j->>'label',left(j->>'id',8)),'label',d.label,'alert',key,'status',j->>'status','priority','action','industryPriority',CASE WHEN d.mod IN ('retail','delivery-fleet','laundry','salon','services-contracting') THEN 1 ELSE 3 END,'route',d.route,'dueAt',deadline);
   IF d.tab='retail_orders' AND j->>'kind'='purchase' THEN payload:=payload||jsonb_build_object('block','retail-purchase','route','/dashboard/retail-purchase');END IF;
   FOR u IN SELECT id FROM users WHERE tenant_id::text=t::text AND role='owner' AND status='active' LOOP
    IF NOT EXISTS(SELECT 1 FROM notifications WHERE tenant_id::text=t::text AND recipient_id::text=u.id::text AND operation->>'alert'=key AND operation->>'sourceId'=j->>'id' AND resolved_at IS NULL) THEN
     INSERT INTO notifications(id,tenant_id,recipient_type,recipient_id,title,body,is_read,operation,action_required) VALUES(gen_random_uuid(),t,'staff',u.id,d.label,(payload->>'reference')||' Â· due '||to_char(deadline AT TIME ZONE 'Asia/Manila','DD Mon YYYY HH24:MI'),false,payload,true);
    ELSE UPDATE notifications SET operation=payload,body=(payload->>'reference')||' · due '||to_char(deadline AT TIME ZONE 'Asia/Manila','DD Mon YYYY HH24:MI') WHERE tenant_id::text=t::text AND recipient_id::text=u.id::text AND operation->>'alert'=key AND operation->>'sourceId'=j->>'id' AND resolved_at IS NULL;END IF;
   END LOOP;
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
END $$;
COMMIT;

-- 073 Retail customer accounts
BEGIN;
CREATE TABLE retail_customer_policy(
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id), version int NOT NULL DEFAULT 1,
 credit_enabled boolean NOT NULL DEFAULT false, block_overdue boolean NOT NULL DEFAULT true,
 reward_mode text NOT NULL DEFAULT 'off' CHECK(reward_mode IN ('off','points','stamps')),
 earn_every_cents bigint NOT NULL DEFAULT 10000 CHECK(earn_every_cents BETWEEN 1 AND 100000000),
 redeem_units int NOT NULL DEFAULT 1 CHECK(redeem_units BETWEEN 1 AND 1000000),
 redeem_value_cents bigint NOT NULL DEFAULT 100 CHECK(redeem_value_cents BETWEEN 1 AND 100000000),
 eligible_product_ids uuid[] NOT NULL DEFAULT '{}', eligible_source_kinds text[] NOT NULL DEFAULT '{}', cashier_ids text[] NOT NULL DEFAULT '{}',
 updated_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE retail_customer_accounts(
 tenant_id uuid NOT NULL,contact_id uuid NOT NULL, credit_approved boolean NOT NULL DEFAULT false,
 credit_limit_cents bigint NOT NULL DEFAULT 0 CHECK(credit_limit_cents BETWEEN 0 AND 100000000000),
 term_days int NOT NULL DEFAULT 7 CHECK(term_days BETWEEN 0 AND 365),on_hold boolean NOT NULL DEFAULT false,
 suki_enrolled boolean NOT NULL DEFAULT false,version int NOT NULL DEFAULT 1,updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,contact_id),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id));
CREATE TABLE retail_credit_sales(
 id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,tenant_id uuid NOT NULL,order_id uuid NOT NULL,contact_id uuid NOT NULL,
 charged_cents bigint NOT NULL CHECK(charged_cents>0),due_date date NOT NULL,actor_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,order_id),
 FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id));
CREATE TABLE retail_credit_collections(
 tenant_id uuid NOT NULL,settlement_id uuid NOT NULL,session_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,settlement_id),FOREIGN KEY(tenant_id,settlement_id) REFERENCES retail_order_settlements(tenant_id,id),
 FOREIGN KEY(tenant_id,session_id) REFERENCES retail_cash_sessions(tenant_id,id));
CREATE TABLE retail_reward_sales(
 tenant_id uuid NOT NULL,order_id uuid NOT NULL,contact_id uuid NOT NULL,
 mode text NOT NULL CHECK(mode IN ('points','stamps')),earn_every_cents bigint NOT NULL CHECK(earn_every_cents>0),
 eligible_product_ids uuid[] NOT NULL,redeemed_units bigint NOT NULL DEFAULT 0 CHECK(redeemed_units>=0),
 original_net_cents bigint NOT NULL CHECK(original_net_cents>0),actor_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,order_id),
 FOREIGN KEY(tenant_id,order_id) REFERENCES retail_orders(tenant_id,id),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id));
ALTER TABLE commercial_invoices ADD COLUMN customer_issue_details jsonb;
ALTER TABLE commercial_invoices DROP CONSTRAINT commercial_invoices_source_kind_check;
ALTER TABLE commercial_invoices ADD CONSTRAINT commercial_invoices_source_kind_check CHECK(source_kind IN ('service_time','service_milestone','trade_job','agency_fee','salon_visit','laundry_ticket','food_order'));
CREATE UNIQUE INDEX commercial_one_specialist_invoice ON commercial_invoices(tenant_id,source_kind,source_id) WHERE source_kind IN ('salon_visit','laundry_ticket','food_order') AND status<>'cancelled';
CREATE TABLE commercial_customer_rewards(
 tenant_id uuid NOT NULL,invoice_id uuid NOT NULL,contact_id uuid NOT NULL,mode text NOT NULL CHECK(mode IN ('points','stamps')),
 earn_every_cents bigint NOT NULL CHECK(earn_every_cents>0),redeemed_units bigint NOT NULL CHECK(redeemed_units>=0),
 original_net_cents bigint NOT NULL CHECK(original_net_cents>0),actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,invoice_id),FOREIGN KEY(tenant_id,invoice_id) REFERENCES commercial_invoices(tenant_id,id),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id));
CREATE TABLE retail_reward_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,contact_id uuid NOT NULL,order_id uuid,invoice_id uuid,
 CHECK((order_id IS NOT NULL)::int+(invoice_id IS NOT NULL)::int=1),
 kind text NOT NULL CHECK(kind IN ('earned','redeemed','restored')),units bigint NOT NULL CHECK(units<>0),
 actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,contact_id) REFERENCES erp_contacts(tenant_id,id),
 FOREIGN KEY(tenant_id,order_id) REFERENCES retail_reward_sales(tenant_id,order_id),
 FOREIGN KEY(tenant_id,invoice_id) REFERENCES commercial_customer_rewards(tenant_id,invoice_id));
CREATE INDEX retail_reward_customer ON retail_reward_events(tenant_id,contact_id);
CREATE OR REPLACE VIEW retail_customer_receivables AS
 SELECT o.tenant_id,o.id AS order_id,o.contact_id,o.due_date,
 round(100*(coalesce((SELECT sum(total) FROM retail_fulfillments f WHERE f.tenant_id=o.tenant_id AND f.order_id=o.id),0)
 -coalesce((SELECT sum(c.total) FROM retail_credit_notes c JOIN retail_fulfillments f ON f.tenant_id=c.tenant_id AND f.id=c.fulfillment_id WHERE f.tenant_id=o.tenant_id AND f.order_id=o.id),0)
 -coalesce((SELECT sum(s.amount) FROM retail_order_settlements s WHERE s.tenant_id=o.tenant_id AND s.order_id=o.id),0)
 -coalesce((SELECT sum(a.amount_cents)/100.0 FROM retail_deposit_applications a JOIN retail_deposits d ON d.tenant_id=a.tenant_id AND d.id=a.deposit_id WHERE d.tenant_id=o.tenant_id AND d.order_id=o.id),0)
 +coalesce((SELECT sum(r.amount) FROM retail_refunds r WHERE r.tenant_id=o.tenant_id AND r.order_id=o.id),0)))::bigint AS balance_cents
 FROM retail_orders o WHERE o.kind='sale';
CREATE OR REPLACE VIEW customer_account_receivables AS
 SELECT r.*,'retail'::text AS source_kind,o.status,o.created_at,f.document_number,o.version,o.created_by::text AS created_by,NULL::text AS issued_by,round(o.total*100)::bigint AS total_cents
 FROM retail_customer_receivables r JOIN retail_orders o ON o.tenant_id=r.tenant_id AND o.id=r.order_id
 JOIN LATERAL (SELECT min(document_number) document_number FROM retail_fulfillments WHERE tenant_id=o.tenant_id AND order_id=o.id) f ON f.document_number IS NOT NULL
 UNION ALL
 SELECT i.tenant_id,i.id,i.contact_id,i.due_date,i.total_cents-coalesce((SELECT sum(CASE WHEN kind='refund' THEN -amount_cents ELSE amount_cents END) FROM commercial_entries WHERE tenant_id=i.tenant_id AND invoice_id=i.id),0)-coalesce((SELECT sum(CASE WHEN kind='apply' THEN amount_cents ELSE -amount_cents END) FROM service_retainer_events WHERE tenant_id=i.tenant_id AND invoice_id=i.id AND status='posted' AND kind IN ('apply','reverse')),0),
 'commercial',i.status,i.created_at,i.document_number,i.version,i.created_by::text,i.issued_by::text,i.total_cents
 FROM commercial_invoices i WHERE i.status='issued' AND i.source_kind<>'agency_fee';
CREATE OR REPLACE FUNCTION commercial_reward_reconcile(t uuid,iid uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r commercial_customer_rewards%ROWTYPE; outstanding bigint; credited bigint; target bigint; old bigint; restored bigint;
BEGIN
 SELECT * INTO r FROM commercial_customer_rewards WHERE tenant_id=t AND invoice_id=iid FOR UPDATE;IF NOT FOUND THEN RETURN;END IF;
 SELECT balance_cents INTO outstanding FROM customer_account_receivables WHERE tenant_id=t AND order_id=iid AND source_kind='commercial';
 SELECT coalesce(sum(amount_cents),0) INTO credited FROM commercial_entries WHERE tenant_id=t AND invoice_id=iid AND kind='credit';
 target:=CASE WHEN coalesce(outstanding,1)<=0 THEN CASE WHEN r.mode='points' THEN floor(greatest(r.original_net_cents-credited,0)/r.earn_every_cents) WHEN credited=0 THEN 1 ELSE 0 END ELSE 0 END;
 SELECT coalesce(sum(units),0) INTO old FROM retail_reward_events WHERE tenant_id=t AND invoice_id=iid AND kind='earned';
 IF target<>old THEN INSERT INTO retail_reward_events(tenant_id,contact_id,invoice_id,kind,units,actor_id) VALUES(t,r.contact_id,iid,'earned',target-old,r.actor_id);END IF;
 restored:=least(r.redeemed_units,floor(r.redeemed_units::numeric*credited/r.original_net_cents));
 SELECT coalesce(sum(units),0) INTO old FROM retail_reward_events WHERE tenant_id=t AND invoice_id=iid AND kind='restored';
 IF restored<>old THEN INSERT INTO retail_reward_events(tenant_id,contact_id,invoice_id,kind,units,actor_id) VALUES(t,r.contact_id,iid,'restored',restored-old,r.actor_id);END IF;
END $$;
CREATE OR REPLACE FUNCTION commercial_reward_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;PERFORM commercial_reward_reconcile(NEW.tenant_id,NEW.invoice_id);RETURN NEW;END $$;
CREATE TRIGGER commercial_reward_entry AFTER INSERT ON commercial_entries FOR EACH ROW EXECUTE FUNCTION commercial_reward_changed();
CREATE TRIGGER commercial_reward_retainer AFTER INSERT OR UPDATE ON service_retainer_events FOR EACH ROW EXECUTE FUNCTION commercial_reward_changed();
CREATE OR REPLACE FUNCTION retail_reward_reconcile(t uuid,oid uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r retail_reward_sales%ROWTYPE; outstanding bigint; spend bigint; qty numeric; credited bigint; target bigint; old bigint; restored bigint;
BEGIN
 SELECT * INTO r FROM retail_reward_sales WHERE tenant_id=t AND order_id=oid FOR UPDATE;IF NOT FOUND THEN RETURN;END IF;
 SELECT balance_cents INTO outstanding FROM retail_customer_receivables WHERE tenant_id=t AND order_id=oid;
 SELECT coalesce(sum(greatest(l.amount_cents-coalesce(c.amount,0),0)),0),coalesce(sum(greatest(l.amount_cents-coalesce(c.amount,0),0)/nullif(l.unit_price*100,0)),0)
 INTO spend,qty FROM retail_fulfillment_lines l JOIN retail_fulfillments f ON f.tenant_id=l.tenant_id AND f.id=l.fulfillment_id
 LEFT JOIN (SELECT tenant_id,fulfillment_line_id,sum(amount_cents) amount,sum(quantity) qty FROM retail_credit_lines GROUP BY tenant_id,fulfillment_line_id) c ON c.tenant_id=l.tenant_id AND c.fulfillment_line_id=l.id
 WHERE f.tenant_id=t AND f.order_id=oid AND l.product_id=ANY(r.eligible_product_ids);
 target:=CASE WHEN coalesce(outstanding,1)<=0 THEN CASE WHEN r.mode='points' THEN floor(spend/r.earn_every_cents) ELSE floor(qty) END ELSE 0 END;
 SELECT coalesce(sum(units),0) INTO old FROM retail_reward_events WHERE tenant_id=t AND order_id=oid AND kind='earned';
 IF target<>old THEN INSERT INTO retail_reward_events(tenant_id,contact_id,order_id,kind,units,actor_id) VALUES(t,r.contact_id,oid,'earned',target-old,r.actor_id);END IF;
 SELECT coalesce(sum(c.total)*100,0) INTO credited FROM retail_credit_notes c JOIN retail_fulfillments f ON f.tenant_id=c.tenant_id AND f.id=c.fulfillment_id WHERE f.tenant_id=t AND f.order_id=oid;
 restored:=least(r.redeemed_units,floor(r.redeemed_units::numeric*credited/r.original_net_cents));
 SELECT coalesce(sum(units),0) INTO old FROM retail_reward_events WHERE tenant_id=t AND order_id=oid AND kind='restored';
 IF restored<>old THEN INSERT INTO retail_reward_events(tenant_id,contact_id,order_id,kind,units,actor_id) VALUES(t,r.contact_id,oid,'restored',restored-old,r.actor_id);END IF;
END $$;
CREATE OR REPLACE FUNCTION retail_reward_changed() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oid uuid;
BEGIN
 PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;
 IF TG_TABLE_NAME='retail_credit_notes' THEN SELECT order_id INTO oid FROM retail_fulfillments WHERE tenant_id=NEW.tenant_id AND id=NEW.fulfillment_id;ELSE oid:=NEW.order_id;END IF;
 PERFORM retail_reward_reconcile(NEW.tenant_id,oid);RETURN NEW;
END $$;
CREATE TRIGGER retail_reward_settlement AFTER INSERT ON retail_order_settlements FOR EACH ROW EXECUTE FUNCTION retail_reward_changed();
CREATE TRIGGER retail_reward_return AFTER INSERT ON retail_credit_lines FOR EACH ROW EXECUTE FUNCTION retail_reward_changed();
-- Credit lines link through the note, not directly to an order.
CREATE OR REPLACE FUNCTION retail_reward_return_changed() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oid uuid;
BEGIN
 PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;
 SELECT f.order_id INTO oid FROM retail_credit_notes c JOIN retail_fulfillments f ON f.tenant_id=c.tenant_id AND f.id=c.fulfillment_id WHERE c.tenant_id=NEW.tenant_id AND c.id=NEW.credit_id;
 PERFORM retail_reward_reconcile(NEW.tenant_id,oid);RETURN NEW;
END $$;
DROP TRIGGER retail_reward_return ON retail_credit_lines;
CREATE TRIGGER retail_reward_return AFTER INSERT ON retail_credit_lines FOR EACH ROW EXECUTE FUNCTION retail_reward_return_changed();
CREATE TRIGGER retail_reward_refund AFTER INSERT ON retail_refunds FOR EACH ROW EXECUTE FUNCTION retail_reward_changed();
CREATE OR REPLACE FUNCTION retail_customer_immutable() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Customer account evidence is immutable';END $$;
CREATE TRIGGER commercial_customer_rewards_immutable BEFORE UPDATE OR DELETE ON commercial_customer_rewards FOR EACH ROW EXECUTE FUNCTION retail_customer_immutable();
CREATE TRIGGER retail_reward_events_immutable BEFORE UPDATE OR DELETE ON retail_reward_events FOR EACH ROW EXECUTE FUNCTION retail_customer_immutable();
CREATE TRIGGER retail_reward_sales_immutable BEFORE UPDATE OR DELETE ON retail_reward_sales FOR EACH ROW EXECUTE FUNCTION retail_customer_immutable();
CREATE TRIGGER retail_credit_sales_immutable BEFORE UPDATE OR DELETE ON retail_credit_sales FOR EACH ROW EXECUTE FUNCTION retail_customer_immutable();
CREATE TRIGGER retail_credit_collections_immutable BEFORE UPDATE OR DELETE ON retail_credit_collections FOR EACH ROW EXECUTE FUNCTION retail_customer_immutable();
-- Add availability only. Existing users, signed contracts and customer balances are untouched.
WITH prior AS MATERIALIZED (SELECT f.*,to_jsonb(f) old_values FROM tenant_foundations f
 WHERE (industry_id='retail' OR industry_id='professional-services' AND (specialization_id IN ('salon','laundry','services-contracting') OR blocks&&ARRAY['salon-appointments','laundry-custody','service-visits']) OR industry_id='trades' AND (specialization_id IN ('auto-repair','services-contracting') OR blocks&&ARRAY['auto-intake','service-visits']) OR industry_id='food-hospitality' AND (specialization_id='food-beverage' OR 'food'=ANY(blocks))) AND (NOT ('retail-credit'=ANY(blocks)) OR NOT ('retail-loyalty'=ANY(blocks))) FOR UPDATE),
 changed AS (UPDATE tenant_foundations f SET blocks=ARRAY(SELECT DISTINCT b FROM unnest(f.blocks||ARRAY['retail-credit','retail-loyalty','contacts']||CASE WHEN f.industry_id='retail' THEN ARRAY['inventory','retail-sales','retail-accounting'] ELSE ARRAY[]::text[] END) b ORDER BY b),version=f.version+1,updated_at=now() FROM prior p WHERE f.tenant_id=p.tenant_id RETURNING f.*,p.old_values)
 INSERT INTO audit_logs(id,tenant_id,action,entity_type,entity_id,old_values,new_values)
 SELECT gen_random_uuid(),tenant_id,'foundation.retail-customer-accounts.retrofit','TenantFoundation',tenant_id,old_values,to_jsonb(changed)-'old_values' FROM changed;
CREATE OR REPLACE FUNCTION refresh_operation_due_alerts(t uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE d record;r record;j jsonb;f text[];u record;deadline timestamptz;needed boolean;key text;payload jsonb;
BEGIN
 SELECT blocks INTO f FROM tenant_foundations WHERE tenant_id::text=t::text;
 FOR d IN SELECT * FROM (VALUES
 ('retail_orders','retail','retail-sales','Order payment due','/dashboard/retail-sales','due_date',ARRAY['draft','cancelled']),
 ('fleet_trips','delivery-fleet','delivery-fleet','Delivery trip follow-up','/dashboard/delivery-fleet','ends_at',ARRAY['closed','cancelled']),
 ('specialist_laundry_tickets','laundry','laundry-custody','Laundry promised time','/dashboard/specialist-operations','promised_at',ARRAY['released','cancelled']),
 ('specialist_salon_visits','salon','salon-appointments','Appointment awaiting arrival','/dashboard/specialist-operations','starts_at',ARRAY['arrived','in_service','completed','cancelled','no_show']),
 ('specialist_service_visits','services-contracting','service-visits','Site visit overdue','/dashboard/specialist-operations','ends_at',ARRAY['completed','cancelled']),
 ('business_activities','activities','activities','Activity overdue','/dashboard/activities','due_date',ARRAY['completed','cancelled']),
 ('fitness_memberships','fitness','fitness','Membership renewal','/dashboard/fitness','end_date',ARRAY['cancelled','inactive'])
 ) AS definitions(tab,mod,block,label,route,duekey,terminal) LOOP
  IF NOT (d.block=ANY(COALESCE(f,ARRAY[]::text[])) OR d.tab='retail_orders' AND 'retail-purchase'=ANY(COALESCE(f,ARRAY[]::text[]))) OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=d.tab AND column_name=d.duekey) THEN CONTINUE;END IF;
  FOR r IN EXECUTE format('SELECT to_jsonb(s) AS value FROM %I s WHERE tenant_id::text=$1 AND (%I<=now()+interval ''7 days'' OR id::text IN (SELECT operation->>''sourceId'' FROM notifications WHERE tenant_id::text=$1 AND operation->>''alert''=$2 AND resolved_at IS NULL))',d.tab,d.duekey) USING t::text,'due:'||d.tab LOOP
   j:=r.value;key:='due:'||d.tab;deadline:=CASE WHEN length(j->>d.duekey)=10 THEN ((j->>d.duekey)::date+time '23:59:59') AT TIME ZONE 'Asia/Manila' ELSE (j->>d.duekey)::timestamptz END;
   needed:=deadline IS NOT NULL AND deadline<=now()+CASE WHEN d.tab='fitness_memberships' THEN interval '7 days' ELSE interval '0 days' END AND NOT COALESCE(j->>'status','')=ANY(d.terminal);
   IF d.tab='retail_orders' THEN
    IF j->>'kind'='sale' THEN SELECT balance_cents>0 INTO needed FROM retail_customer_receivables WHERE tenant_id=t AND order_id=(j->>'id')::uuid;needed:=coalesce(needed,false) AND deadline<=now();ELSE needed:=needed AND COALESCE((j->>'total')::numeric,0)>(SELECT COALESCE(sum(amount),0) FROM retail_order_settlements WHERE tenant_id::text=t::text AND order_id::text=j->>'id');END IF;
    needed:=needed AND (CASE WHEN j->>'kind'='purchase' THEN 'retail-purchase' ELSE 'retail-sales' END)=ANY(f);
   END IF;
   IF NOT needed THEN UPDATE notifications SET resolved_at=now() WHERE tenant_id::text=t::text AND operation->>'alert'=key AND operation->>'sourceId'=j->>'id' AND resolved_at IS NULL;CONTINUE;END IF;
   payload:=jsonb_build_object('module',d.mod,'block',d.block,'sourceTable',d.tab,'sourceId',j->>'id','reference',COALESCE(j->>'title',j->>'label',left(j->>'id',8)),'label',d.label,'alert',key,'status',j->>'status','priority','action','industryPriority',CASE WHEN d.mod IN ('retail','delivery-fleet','laundry','salon','services-contracting') THEN 1 ELSE 3 END,'route',d.route,'dueAt',deadline);
   IF d.tab='retail_orders' AND j->>'kind'='purchase' THEN payload:=payload||jsonb_build_object('block','retail-purchase','route','/dashboard/retail-purchase');END IF;
   FOR u IN SELECT id FROM users WHERE tenant_id::text=t::text AND role='owner' AND status='active' LOOP
    IF NOT EXISTS(SELECT 1 FROM notifications WHERE tenant_id::text=t::text AND recipient_id::text=u.id::text AND operation->>'alert'=key AND operation->>'sourceId'=j->>'id' AND resolved_at IS NULL) THEN
     INSERT INTO notifications(id,tenant_id,recipient_type,recipient_id,title,body,is_read,operation,action_required) VALUES(gen_random_uuid(),t,'staff',u.id,d.label,(payload->>'reference')||' Â· due '||to_char(deadline AT TIME ZONE 'Asia/Manila','DD Mon YYYY HH24:MI'),false,payload,true);
    ELSE UPDATE notifications SET operation=payload,body=(payload->>'reference')||' ï¿½ due '||to_char(deadline AT TIME ZONE 'Asia/Manila','DD Mon YYYY HH24:MI') WHERE tenant_id::text=t::text AND recipient_id::text=u.id::text AND operation->>'alert'=key AND operation->>'sourceId'=j->>'id' AND resolved_at IS NULL;END IF;
   END LOOP;
  END LOOP;
 END LOOP;
END $$;

CREATE TRIGGER retail_customer_credit_notice AFTER INSERT ON retail_credit_sales FOR EACH ROW EXECUTE FUNCTION operational_owner_notification('retail','retail-credit','Customer credit sale','/dashboard/customer-accounts','1');
CREATE TRIGGER retail_suki_reward_notice AFTER INSERT ON retail_reward_events FOR EACH ROW EXECUTE FUNCTION operational_owner_notification('retail','retail-loyalty','Suki rewards updated','/dashboard/customer-accounts','1');
COMMIT;

-- 074 Local license lifecycle
BEGIN;
ALTER TABLE offline_licenses ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'active';
ALTER TABLE offline_licenses ADD COLUMN IF NOT EXISTS replaces_license_id uuid REFERENCES offline_licenses(id);
ALTER TABLE offline_licenses ADD COLUMN IF NOT EXISTS retired_at timestamptz;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='offline_license_status_valid') THEN
  ALTER TABLE offline_licenses ADD CONSTRAINT offline_license_status_valid CHECK(status IN ('active','superseded') AND ((status='active' AND retired_at IS NULL) OR (status='superseded' AND retired_at IS NOT NULL)));
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS offline_license_one_replacement ON offline_licenses(replaces_license_id) WHERE replaces_license_id IS NOT NULL;
COMMIT;

-- 075 Android metadata registration
BEGIN;
ALTER TABLE desktop_registrations ADD COLUMN IF NOT EXISTS platform varchar(12) NOT NULL DEFAULT 'desktop';
ALTER TABLE desktop_registrations DROP CONSTRAINT IF EXISTS desktop_registrations_platform_valid;
ALTER TABLE desktop_registrations ADD CONSTRAINT desktop_registrations_platform_valid CHECK(platform IN ('desktop','android'));
ALTER TABLE desktop_registrations ALTER COLUMN local_trial_key DROP NOT NULL;
ALTER TABLE desktop_registrations DROP CONSTRAINT IF EXISTS desktop_registration_trial_platform;
ALTER TABLE desktop_registrations ADD CONSTRAINT desktop_registration_trial_platform CHECK((platform='desktop' AND local_trial_key IS NOT NULL) OR (platform='android' AND local_trial_key IS NULL));
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
