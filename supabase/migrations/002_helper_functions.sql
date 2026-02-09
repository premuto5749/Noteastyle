-- Helper function for incrementing customer visit count
-- Called from treatments API route when creating a new treatment
create or replace function increment_visit_count(cid uuid)
returns void as $$
begin
  update customers
  set visit_count = visit_count + 1,
      last_visit = now()
  where id = cid;
end;
$$ language plpgsql;
