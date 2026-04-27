do $$
begin
  if to_regclass('public.collections') is null
     or to_regclass('public.collection_items') is null
     or to_regclass('public.items') is null then
    raise notice 'Skipping collection_items backfill because collections/items tables do not exist.';
    return;
  end if;
end;
$$;

insert into public.collection_items (
  collection_id,
  item_id,
  is_required,
  sort_order
)
select
  c.id,
  i.id,
  true,
  100
from public.collections c
join public.items i
  on i.collection_name = c.name
where not exists (
  select 1
  from public.collection_items ci
  where ci.collection_id = c.id
    and ci.item_id = i.id
);
