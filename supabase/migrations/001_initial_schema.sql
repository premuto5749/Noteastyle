-- Note-a-Style Initial Schema
-- Migrated from SQLAlchemy/Alembic models

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Shops
create table shops (
  id uuid primary key default uuid_generate_v4(),
  name varchar(200) not null,
  shop_type varchar(50) not null, -- hair, nail, skin, scalp
  address varchar(500),
  phone varchar(20),
  subscription_plan varchar(20) not null default 'basic', -- basic, premium
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Designers
create table designers (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references shops(id) on delete cascade,
  name varchar(100) not null,
  role varchar(50) not null default 'designer', -- owner, designer, assistant
  phone varchar(20),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_designers_shop_id on designers(shop_id);

-- Customers
create table customers (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references shops(id) on delete cascade,
  name varchar(100) not null,
  phone varchar(20),
  gender varchar(10),
  birth_date varchar(10),
  notes text,
  naver_booking_id varchar(100),
  visit_count integer not null default 0,
  last_visit timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customers_shop_id on customers(shop_id);
create index idx_customers_name on customers(name);

-- Treatments (core entity)
create table treatments (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id),
  designer_id uuid references designers(id),
  shop_id uuid not null references shops(id),
  service_type varchar(50) not null, -- cut, color, perm, treatment, bleach, scalp
  service_detail varchar(200),
  products_used jsonb, -- [{"brand": "로레알", "code": "7.1", "area": "뿌리"}]
  area varchar(100),
  duration_minutes integer,
  price integer,
  satisfaction varchar(20), -- high, medium, low
  customer_notes text,
  voice_memo_url varchar(500),
  ai_summary text,
  next_visit_recommendation varchar(100),
  created_at timestamptz not null default now()
);

create index idx_treatments_shop_id on treatments(shop_id);
create index idx_treatments_customer_id on treatments(customer_id);
create index idx_treatments_created_at on treatments(created_at desc);

-- Treatment Photos
create table treatment_photos (
  id uuid primary key default uuid_generate_v4(),
  treatment_id uuid not null references treatments(id) on delete cascade,
  photo_url varchar(500) not null,
  photo_type varchar(20) not null, -- before, during, after
  face_swapped_url varchar(500),
  is_portfolio boolean not null default false,
  caption varchar(300),
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_treatment_photos_treatment_id on treatment_photos(treatment_id);

-- Portfolios
create table portfolios (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references shops(id),
  photo_id uuid not null references treatment_photos(id),
  title varchar(200),
  description text,
  tags jsonb, -- ["염색", "로레알", "뿌리"]
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_portfolios_shop_id on portfolios(shop_id);

-- Auto-update updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger shops_updated_at
  before update on shops
  for each row execute function update_updated_at();

create trigger customers_updated_at
  before update on customers
  for each row execute function update_updated_at();
