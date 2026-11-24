-- Update 7: "Was this helpful?" answers on Help Centre articles, kept so the team can see which articles need work.
-- One answer per member (or per visitor's browser) per article; answering again changes it.
create table help_feedback (
  article_id text not null references help_articles (id) on delete cascade,
  voter text not null,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (article_id, voter)
);
alter table help_feedback enable row level security;
create policy "team reads help feedback" on help_feedback for select to authenticated using (is_staff());
revoke all on help_feedback from anon;
revoke insert, update, delete on help_feedback from authenticated;
grant select on help_feedback to authenticated;

create function help_vote(p_article text, p_helpful boolean, p_visitor text default null) returns void
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if auth.uid() is not null then who := auth.uid()::text;
  elsif p_visitor ~ '^[0-9a-f-]{36}$' then who := 'v:' || p_visitor;
  else return; end if;
  if not exists (select 1 from help_articles where id = p_article) then return; end if;
  insert into help_feedback (article_id, voter, helpful) values (p_article, who, p_helpful)
  on conflict (article_id, voter) do update set helpful = excluded.helpful, updated_at = now();
end $$;

-- for the team: yes and no answers per article, most "no" first
create function help_feedback_summary() returns table (article_id text, title text, yes int, no int)
language sql stable security definer set search_path = public as $$
  select a.id, a.title, count(*) filter (where f.helpful)::int, count(*) filter (where not f.helpful)::int
  from help_feedback f join help_articles a on a.id = f.article_id
  where is_staff()
  group by a.id, a.title order by 4 desc, 3;
$$;

revoke execute on function help_vote(text, boolean, text), help_feedback_summary() from public, anon, authenticated;
grant execute on function help_vote(text, boolean, text) to anon, authenticated;
grant execute on function help_feedback_summary() to authenticated;
