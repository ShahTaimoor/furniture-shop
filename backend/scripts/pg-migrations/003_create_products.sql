create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  name text,
  slug text unique,
  description text default '',
  brand text,
  vendor text,
  short_description text,
  sku text,
  barcode text,
  price numeric not null,
  cost_price numeric default 0,
  sale_price numeric default 0,
  discount numeric default 0,
  compare_at_price numeric,
  stock integer default 0,
  stock_status text default 'in-stock' check (stock_status in ('in-stock','out-of-stock','backorder','preorder')),
  allow_backorder boolean default false,
  low_stock_threshold integer default 0,
  primary_category_id uuid references categories(id),
  category_id uuid references categories(id),
  picture_secure_url text,
  picture_public_id text,
  status text default 'active' check (status in ('active','inactive','draft','archived')),
  visibility text default 'public' check (visibility in ('public','private','hidden')),
  is_featured boolean default false,
  is_bestseller boolean default false,
  is_on_sale boolean default false,
  sale_start_date timestamptz,
  sale_end_date timestamptz,
  images jsonb default '[]',
  attributes jsonb default '[]',
  variation_attributes text[] default '{}',
  variations jsonb default '[]',
  shipping_weight numeric,
  shipping_width numeric,
  shipping_height numeric,
  shipping_depth numeric,
  shipping_requires_shipping boolean default true,
  seo jsonb default '{}',
  custom_fields jsonb default '{}',
  flags text[] default '{}',
  min_purchase_quantity integer default 1,
  max_purchase_quantity integer,
  created_by_user text,
  rating_average numeric default 0,
  rating_count integer default 0,
  total_sales integer default 0,
  inventory_history jsonb default '[]',
  is_deleted boolean default false,
  deleted_at timestamptz,
  deleted_by text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_products_sku on products(sku) where sku is not null;
create index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_status on products(status);
create index if not exists idx_products_visibility on products(visibility);
create index if not exists idx_products_is_deleted on products(is_deleted);
create index if not exists idx_products_stock on products(stock);
create index if not exists idx_products_stock_status on products(stock_status);
create index if not exists idx_products_price on products(price);
create index if not exists idx_products_is_featured on products(is_featured);
create index if not exists idx_products_is_bestseller on products(is_bestseller);
create index if not exists idx_products_is_on_sale on products(is_on_sale);
create index if not exists idx_products_created_at on products(created_at desc);
create index if not exists idx_products_brand on products(brand);
create index if not exists idx_products_category_id on products(category_id);
create index if not exists idx_products_primary_category_id on products(primary_category_id);

-- Full-text search across the core searchable fields (title, name, description, sku, brand)
alter table products add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(sku, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored;

create index if not exists idx_products_search_vector on products using gin(search_vector);

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row
  execute function set_updated_at();

create table if not exists product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index if not exists idx_product_categories_category on product_categories(category_id);

create table if not exists product_tags (
  product_id uuid not null references products(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (product_id, tag_id)
);
create index if not exists idx_product_tags_tag on product_tags(tag_id);
