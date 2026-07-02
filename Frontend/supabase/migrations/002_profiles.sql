create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  whatsapp_phone text,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users manage own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
