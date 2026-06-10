alter table novels
  add column if not exists language text
    not null
    default 'Chinese'
    check (language in ('Chinese', 'Japanese', 'Korean'));
