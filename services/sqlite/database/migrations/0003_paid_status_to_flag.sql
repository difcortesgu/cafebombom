UPDATE sales
SET status = 'completed'
WHERE status = 'paid'
  AND ready_at IS NOT NULL;

UPDATE sales
SET status = 'in-progress'
WHERE status = 'paid'
  AND ready_at IS NULL;
