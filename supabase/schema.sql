create extension if not exists pgcrypto;
create extension if not exists unaccent;

create table employees(
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 3 and 120),
  sector text not null check (length(trim(sector)) between 2 and 60),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table settings(id int primary key default 1 check (id=1), unit_price numeric(10,2) not null default 10 check (unit_price>0));
insert into settings default values;
create table flavors(id serial primary key, name text unique not null, active boolean not null default true);
insert into flavors(name) values ('Ninho'),('Brigadeiro'),('Prestígio'),('Morango'),('Outros');

create table stock_days(
  id uuid primary key default gen_random_uuid(),
  stock_date date unique not null,
  status text not null default 'open' check (status in ('open','closed')),
  closed_at timestamptz
);
create table stock_items(
  stock_day_id uuid references stock_days(id) on delete cascade,
  flavor_id int references flavors(id),
  initial_qty int not null check (initial_qty>=0),
  counted_qty int check (counted_qty>=0),
  primary key (stock_day_id, flavor_id)
);
create table payments(
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  amount numeric(10,2) not null,
  paid_at timestamptz not null default now()
);
create table withdrawals(
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  flavor_id int not null references flavors(id),
  stock_day_id uuid not null references stock_days(id),
  quantity int not null check (quantity between 1 and 50),
  unit_price numeric(10,2) not null,
  created_at timestamptz not null default now(),
  payment_id uuid references payments(id)
);
create index on withdrawals(employee_id) where payment_id is null;
create index on withdrawals(stock_day_id, flavor_id);
create index on withdrawals(created_at);
create index on employees(active);

-- RLS: público (anon) não lê nada direto; só admin logado e RPCs
alter table employees enable row level security;
alter table settings enable row level security;
alter table flavors enable row level security;
alter table stock_days enable row level security;
alter table stock_items enable row level security;
alter table payments enable row level security;
alter table withdrawals enable row level security;
do $$ declare t text; begin
  foreach t in array array['employees','settings','flavors','stock_days','stock_items','payments','withdrawals'] loop
    execute format('create policy admin_all on %I for all to authenticated using (true) with check (true)', t);
  end loop; end $$;
create policy flavors_public on flavors for select to anon using (active);

-- RPCs da tela pública (security definer, sem expor telefone)
create function today_br() returns date language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

create function search_employees(q text) returns table(id uuid, full_name text, sector text)
language sql stable security definer set search_path=public as $$
  select e.id, e.full_name, e.sector from employees e
  where e.active and length(trim(q))>=2 and unaccent(e.full_name) ilike '%'||unaccent(trim(q))||'%'
  order by (unaccent(e.full_name) ilike unaccent(trim(q))||'%') desc, e.full_name limit 8 $$;

create function get_summary(p_employee uuid) returns json
language sql stable security definer set search_path=public as $$
  select json_build_object(
    'open_qty', coalesce(sum(quantity),0),
    'open_amount', coalesce(sum(quantity*unit_price),0),
    'price', (select unit_price from settings)) 
  from withdrawals where employee_id=p_employee and payment_id is null $$;

create function register_withdrawal(p_employee uuid, p_flavor int, p_qty int) returns json
language plpgsql security definer set search_path=public as $$
declare d uuid; price numeric;
begin
  if p_qty<1 or p_qty>50 then raise exception 'Quantidade inválida'; end if;
  if not exists(select 1 from employees where id=p_employee and active) then raise exception 'Funcionário inválido'; end if;
  select id into d from stock_days where stock_date=today_br() and status='open';
  if d is null then raise exception 'Vendas de hoje ainda não foram iniciadas'; end if;
  select unit_price into price from settings;
  insert into withdrawals(employee_id,flavor_id,stock_day_id,quantity,unit_price) values(p_employee,p_flavor,d,p_qty,price);
  return get_summary(p_employee);
end $$;

create function pay_employee(p_employee uuid) returns void
language plpgsql security invoker as $$
declare pid uuid; total numeric;
begin
  select coalesce(sum(quantity*unit_price),0) into total from withdrawals where employee_id=p_employee and payment_id is null;
  if total=0 then return; end if;
  insert into payments(employee_id,amount) values(p_employee,total) returning id into pid;
  update withdrawals set payment_id=pid where employee_id=p_employee and payment_id is null;
end $$;

revoke all on function search_employees, get_summary, register_withdrawal, pay_employee from public;
grant execute on function search_employees, get_summary, register_withdrawal to anon, authenticated;
grant execute on function pay_employee to authenticated;

-- Views do admin (respeitam RLS)
create view open_balances with (security_invoker=true) as
  select e.id, e.full_name, e.sector, sum(w.quantity)::int qty, sum(w.quantity*w.unit_price) amount
  from withdrawals w join employees e on e.id=w.employee_id where w.payment_id is null group by e.id;
create view stock_panel with (security_invoker=true) as
  select i.stock_day_id, f.id flavor_id, f.name flavor, i.initial_qty, i.counted_qty,
    coalesce((select sum(quantity) from withdrawals w where w.stock_day_id=i.stock_day_id and w.flavor_id=i.flavor_id),0)::int sold
  from stock_items i join flavors f on f.id=i.flavor_id;
create view day_summary with (security_invoker=true) as
  select d.id, d.stock_date, d.status, sum(p.initial_qty)::int initial, sum(p.sold)::int sold,
    sum(p.counted_qty)::int counted,
    case when d.status='closed' then (sum(p.initial_qty)-sum(p.sold)-sum(p.counted_qty))::int end lost
  from stock_days d join stock_panel p on p.stock_day_id=d.id group by d.id;
