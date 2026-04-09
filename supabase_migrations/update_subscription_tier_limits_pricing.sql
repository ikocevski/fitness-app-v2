-- Update subscription tier client limits to:
-- starter: 1-5, pro: 5-10, elite: 10-15
-- Effective client_limit caps:
-- starter = 5, pro = 10, elite = 15

CREATE OR REPLACE FUNCTION update_client_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_tier = 'starter' THEN
    NEW.client_limit := 5;
  ELSIF NEW.subscription_tier = 'pro' THEN
    NEW.client_limit := 10;
  ELSIF NEW.subscription_tier = 'elite' THEN
    NEW.client_limit := 15;
  ELSIF NEW.subscription_tier IS NULL THEN
    NEW.client_limit := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-apply limits to existing users based on current tier
UPDATE users
SET client_limit = CASE
  WHEN subscription_tier = 'starter' THEN 5
  WHEN subscription_tier = 'pro' THEN 10
  WHEN subscription_tier = 'elite' THEN 15
  ELSE 0
END;