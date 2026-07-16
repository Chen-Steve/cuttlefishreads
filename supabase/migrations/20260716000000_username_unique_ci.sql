-- Case-insensitive uniqueness for usernames (Alice / alice collide).
update public.profiles
set username = lower(username)
where username is not null and username <> lower(username);

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username))
  where username is not null;
