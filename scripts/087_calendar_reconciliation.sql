BEGIN;
CREATE TABLE IF NOT EXISTS operations_calendar_events (
 tenant_id uuid NOT NULL,recipient_id uuid NOT NULL,event_key varchar(100) NOT NULL,
 event_date date NOT NULL,event jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,recipient_id,event_key),
 FOREIGN KEY(tenant_id,recipient_id) REFERENCES users(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS operations_calendar_events_month ON operations_calendar_events(tenant_id,recipient_id,event_date);
COMMIT;
