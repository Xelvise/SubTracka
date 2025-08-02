-- Update the calculate_renewal_and_status function to always calculate renewal_date
CREATE OR REPLACE FUNCTION calculate_renewal_and_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Always calculate renewal_date based on frequency
    NEW.renewal_date = CASE 
        WHEN NEW.frequency = 'daily' THEN NEW.start_date + INTERVAL '1 day'
        WHEN NEW.frequency = 'weekly' THEN NEW.start_date + INTERVAL '1 week'
        WHEN NEW.frequency = 'monthly' THEN NEW.start_date + INTERVAL '1 month'
        WHEN NEW.frequency = 'yearly' THEN NEW.start_date + INTERVAL '1 year'
    END;

    -- Update status to expired if renewal_date is in the past
    IF NEW.renewal_date < CURRENT_DATE AND NEW.status != 'cancelled' THEN
        NEW.status = 'expired';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert or update
CREATE TRIGGER trigger_calculate_renewal_and_status
    BEFORE INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_renewal_and_status();