BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'planner';
CREATE TABLE IF NOT EXISTS ai_analyses (id SERIAL PRIMARY KEY, user_id INTEGER, analysis_type VARCHAR(100), event_id INTEGER, content TEXT, model VARCHAR(100), created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS governed_event_plans (id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, event_id BIGINT NOT NULL, state TEXT NOT NULL DEFAULT 'draft', requirements JSONB NOT NULL, assessment JSONB NOT NULL, fallback_plan_id TEXT, contracts_approved BOOLEAN NOT NULL DEFAULT FALSE, version INTEGER NOT NULL DEFAULT 1, created_by BIGINT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(tenant_id,idempotency_key));
CREATE TABLE IF NOT EXISTS event_change_requests (id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, plan_id BIGINT REFERENCES governed_event_plans(id), idempotency_key TEXT NOT NULL, change_type TEXT NOT NULL, requested_change JSONB NOT NULL, impact_assessment JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'pending', requested_by BIGINT, approved_by BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(tenant_id,idempotency_key));
CREATE TABLE IF NOT EXISTS event_control_audit (id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, plan_id BIGINT REFERENCES governed_event_plans(id), actor_id BIGINT, action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS event_control_tenant_state_idx ON governed_event_plans(tenant_id,event_id,state);
COMMIT;
