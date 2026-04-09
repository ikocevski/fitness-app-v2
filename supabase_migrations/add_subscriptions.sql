-- Add subscription fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('starter', 'pro', 'elite'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'expired', 'trial'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_limit INTEGER DEFAULT 0;

-- Create subscriptions table for tracking payment history
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'pro', 'elite')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  price DECIMAL(10,2) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  receipt_data TEXT, -- Store App Store/Google Play receipt
  transaction_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Function to automatically update client_limit based on subscription_tier
CREATE OR REPLACE FUNCTION update_client_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_tier = 'starter' THEN
    NEW.client_limit := 5;
  ELSIF NEW.subscription_tier = 'pro' THEN
    NEW.client_limit := 15;
  ELSIF NEW.subscription_tier = 'elite' THEN
    NEW.client_limit := 999999; -- Essentially unlimited
  ELSIF NEW.subscription_tier IS NULL THEN
    NEW.client_limit := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update client_limit when subscription_tier changes
DROP TRIGGER IF EXISTS trigger_update_client_limit ON users;
CREATE TRIGGER trigger_update_client_limit
  BEFORE INSERT OR UPDATE OF subscription_tier ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_client_limit();

-- Set default values for existing admin users (coaches)
UPDATE users 
SET subscription_tier = NULL, 
    subscription_status = NULL, 
    client_limit = 0
WHERE role = 'admin' AND subscription_tier IS NULL;

-- Comments for documentation
COMMENT ON COLUMN users.subscription_tier IS 'Coach subscription tier: starter (5 clients), pro (15 clients), elite (unlimited)';
COMMENT ON COLUMN users.subscription_status IS 'Current subscription status';
COMMENT ON COLUMN users.subscription_expires_at IS 'When the subscription expires';
COMMENT ON COLUMN users.client_limit IS 'Maximum number of clients coach can have';
COMMENT ON TABLE subscriptions IS 'Tracks subscription payment history and receipts';

-- Enable Row Level Security on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own subscription records
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscription records
CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subscription records
CREATE POLICY "Users can update own subscriptions"
  ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Service role can do anything (for backend operations)
CREATE POLICY "Service role has full access"
  ON subscriptions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
