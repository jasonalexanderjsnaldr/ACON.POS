create table products (
  id bigint primary key,
  merek text not null,
  nama text not null,
  stok integer not null default 0,
  harga_supp numeric not null default 0,
  diskon1 numeric not null default 0,
  diskon2 numeric not null default 0,
  diskon3 numeric not null default 0,
  modal_akhir numeric not null default 0,
  jual numeric not null default 0
);

create table sales (
  id text primary key,
  tgl timestamptz not null default now(),
  customer text,
  items jsonb not null,
  total_modal numeric not null default 0,
  total_pemasukan numeric not null default 0,
  status text not null default 'LUNAS',
  dibayar numeric not null default 0,
  sisa_hutang numeric not null default 0
);

create table returns (
  id bigint primary key,
  tgl timestamptz not null default now(),
  nota_id text,
  nama_barang text,
  qty numeric not null,
  nilai_dikembalikan numeric not null default 0,
  modal_dikembalikan numeric not null default 0
);

create table expenses (
  id bigint primary key,
  tgl timestamptz not null default now(),
  ket text,
  nominal numeric not null default 0
);


alter table products enable row level security;
alter table sales enable row level security;
alter table returns enable row level security;
alter table expenses enable row level security;

create policy "public_all_products" on products for all using (true) with check (true);
create policy "public_all_sales" on sales for all using (true) with check (true);
create policy "public_all_returns" on returns for all using (true) with check (true);
create policy "public_all_expenses" on expenses for all using (true) with check (true);
