-- AI Receptionist Database Schema

-- Users/Business Owners
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business accounts
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    phone_number VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    business_hours JSONB, -- {"monday": {"open": "09:00", "close": "17:00"}, ...}
    subscription_tier VARCHAR(50) DEFAULT 'starter', -- starter, professional, enterprise
    subscription_status VARCHAR(50) DEFAULT 'active', -- active, canceled, past_due
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Configuration per business
CREATE TABLE ai_configs (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    greeting_message TEXT,
    voice_id VARCHAR(100) DEFAULT 'default', -- For ElevenLabs or similar
    voice_speed DECIMAL(3,2) DEFAULT 1.0,
    language VARCHAR(10) DEFAULT 'en-US',
    personality TEXT DEFAULT 'professional and friendly',
    custom_instructions TEXT,
    faq_knowledge_base JSONB, -- Array of Q&A pairs
    escalation_keywords TEXT[], -- ["emergency", "urgent", "complaint"]
    transfer_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call logs
CREATE TABLE calls (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    twilio_call_sid VARCHAR(100) UNIQUE,
    caller_number VARCHAR(20),
    caller_name VARCHAR(255),
    direction VARCHAR(20), -- inbound, outbound
    status VARCHAR(50), -- queued, ringing, in-progress, completed, failed
    duration INTEGER, -- seconds
    recording_url TEXT,
    transcription TEXT,
    summary TEXT,
    sentiment VARCHAR(20), -- positive, neutral, negative
    intent VARCHAR(100), -- appointment, question, complaint, etc.
    outcome VARCHAR(100), -- resolved, transferred, message_taken
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation turns (for context and training)
CREATE TABLE conversation_turns (
    id SERIAL PRIMARY KEY,
    call_id INTEGER REFERENCES calls(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    speaker VARCHAR(20), -- caller, ai
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    call_id INTEGER REFERENCES calls(id),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    service_type VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, confirmed, completed, canceled
    reminder_sent BOOLEAN DEFAULT false,
    google_calendar_event_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages taken during calls
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    call_id INTEGER REFERENCES calls(id),
    caller_name VARCHAR(255),
    caller_phone VARCHAR(20),
    message_text TEXT NOT NULL,
    urgency VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    status VARCHAR(50) DEFAULT 'unread', -- unread, read, archived
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Staff directory (for call routing)
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    department VARCHAR(100),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    available_hours JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics/Metrics
CREATE TABLE daily_metrics (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_calls INTEGER DEFAULT 0,
    answered_calls INTEGER DEFAULT 0,
    missed_calls INTEGER DEFAULT 0,
    average_duration DECIMAL(10,2),
    total_minutes DECIMAL(10,2),
    appointments_scheduled INTEGER DEFAULT 0,
    messages_taken INTEGER DEFAULT 0,
    transfers INTEGER DEFAULT 0,
    positive_sentiment_count INTEGER DEFAULT 0,
    negative_sentiment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, date)
);

-- Subscriptions and billing
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL,
    minutes_included INTEGER,
    minutes_used INTEGER DEFAULT 0,
    price_per_month DECIMAL(10,2),
    billing_cycle_start DATE,
    billing_cycle_end DATE,
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50), -- active, canceled, past_due
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Integrations (CRM, Calendar, etc.)
CREATE TABLE integrations (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    integration_type VARCHAR(50), -- google_calendar, salesforce, hubspot
    credentials JSONB, -- Encrypted credentials
    settings JSONB,
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base entries
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_calls_business_id ON calls(business_id);
CREATE INDEX idx_calls_started_at ON calls(started_at);
CREATE INDEX idx_appointments_business_id ON appointments(business_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_messages_business_id ON messages(business_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_daily_metrics_business_date ON daily_metrics(business_id, date);
