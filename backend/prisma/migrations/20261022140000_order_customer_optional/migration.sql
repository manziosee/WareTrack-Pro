-- Orders taken by staff, the API or import have no portal customer.
ALTER TABLE "delivery_orders" ALTER COLUMN "customer_id" DROP NOT NULL;

-- Order creation used to fill in customer #1 when there was none, which showed
-- those orders to that customer in the portal. Keep the link only where the
-- order's email or phone really is that customer's.
UPDATE "delivery_orders" o
SET "customer_id" = NULL
WHERE o."customer_id" = 1
  AND NOT EXISTS (
    SELECT 1 FROM "customers" c
    WHERE c."id" = 1
      AND c."company_id" = o."company_id"
      AND (
        (o."customer_email" IS NOT NULL AND lower(o."customer_email") = lower(c."email"))
        OR (c."phone" IS NOT NULL AND o."contact_number" = c."phone")
      )
  );
