-- Update the calculate_renewal_and_status function to always calculate renewal_date
CREATE OR REPLACE FUNCTION calculate_renewal_and_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        NEW.renewal_date = CASE 
            WHEN NEW.frequency = 'daily' THEN NEW.start_date + INTERVAL '1 day'
            WHEN NEW.frequency = 'weekly' THEN NEW.start_date + INTERVAL '1 week'
            WHEN NEW.frequency = 'monthly' THEN NEW.start_date + INTERVAL '1 month'
            WHEN NEW.frequency = 'yearly' THEN NEW.start_date + INTERVAL '1 year'
        END;
    END IF;

    -- Update renewal_date to null if renewal_date is in the past
    IF NEW.renewal_date < CURRENT_DATE OR NEW.status = 'cancelled' THEN
        NEW.renewal_date = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert or update
CREATE TRIGGER trigger_calculate_renewal_and_status
    BEFORE INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_renewal_and_status();

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to expire subscriptions that have passed their renewal date
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void AS $$
BEGIN
    UPDATE subscriptions 
    SET status = 'expired', 
        renewal_date = NULL,
        updated_at = NOW()
    WHERE status = 'active' AND renewal_date IS NOT NULL AND renewal_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Schedule cron job to run daily at 11:59:59 PM to expire subscriptions
SELECT cron.schedule(
    'expire-subscriptions-daily',
    '59 23 * * *',  -- Run at 11:59:59 PM every day
    'SELECT expire_subscriptions();'
);