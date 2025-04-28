
BEGIN;

-- Scheduled Payments
ALTER TABLE scheduled_payments
  ALTER COLUMN amount TYPE numeric(12,2)
    USING amount / 100.0;

-- Transactions
ALTER TABLE transactions
  ALTER COLUMN amount TYPE numeric(12,2)
    USING amount / 100.0;

-- Quote Items (prezzi)
ALTER TABLE quote_items
  ALTER COLUMN price TYPE numeric(12,2)
    USING price / 100.0;

COMMIT;
