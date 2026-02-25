-- Improve customer search performance for reservation page
-- Problem: phone search does full table scan (no index on phone column)

-- Enable pg_trgm for faster ILIKE/pattern matching
create extension if not exists pg_trgm;

-- B-tree composite indexes: shop_id filter + phone/name sort/prefix
create index if not exists idx_customers_shop_phone
  on customers(shop_id, phone);

create index if not exists idx_customers_shop_name
  on customers(shop_id, name);

-- GIN trgm indexes for ILIKE '%substring%' pattern matching
create index if not exists idx_customers_phone_trgm
  on customers using gin (phone gin_trgm_ops);

create index if not exists idx_customers_name_trgm
  on customers using gin (name gin_trgm_ops);
