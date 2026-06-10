alter table novels
  add column if not exists novelupdates_url text check (
    novelupdates_url is null
    or (
      novelupdates_url ~ '^https?://(www\.)?novelupdates\.com/'
      and length(novelupdates_url) <= 2048
    )
  );
