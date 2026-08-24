-- Pin search_path so the word-count trigger cannot be redirected via a
-- caller-controlled schema (lint 0011_function_search_path_mutable).
create or replace function public.chapters_set_word_count()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.word_count := case
    when length(trim(new.content)) = 0 then 0
    else cardinality(regexp_split_to_array(trim(new.content), '\s+'))
  end;
  return new;
end;
$$;
