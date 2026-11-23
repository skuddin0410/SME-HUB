-- Help Centre: topics, articles and video tours. Public to read; written only by the service role (CMS admin / seed).
create table if not exists help_topics (
  id text primary key,
  title text not null,
  description text not null default '',
  icon text not null default 'spark',
  position int not null default 0
);
create table if not exists help_articles (
  id text primary key,
  topic text not null references help_topics(id) on delete cascade,
  title text not null,
  summary text not null default '',
  tags text not null default '',
  popular boolean not null default false,
  html text not null default '',
  position int not null default 0,
  updated_on date not null default current_date,
  -- plain text of the article, for search and result snippets (tags removed, common entities decoded)
  body_text text generated always as (
    btrim(regexp_replace(
      replace(replace(replace(replace(replace(regexp_replace(html, '<[^>]+>', ' ', 'g'), '&amp;', '&'), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', ''''),
      '\s+', ' ', 'g'))
  ) stored
);
create index if not exists help_articles_topic_idx on help_articles (topic, position);
create table if not exists help_videos (
  article_id text primary key references help_articles(id) on delete cascade,
  file text not null,
  caption text not null default '',
  title text not null default '',
  position int not null default 0
);
alter table help_topics enable row level security;
alter table help_articles enable row level security;
alter table help_videos enable row level security;
drop policy if exists help_topics_read on help_topics;
drop policy if exists help_articles_read on help_articles;
drop policy if exists help_videos_read on help_videos;
create policy help_topics_read on help_topics for select using (true);
create policy help_articles_read on help_articles for select using (true);
create policy help_videos_read on help_videos for select using (true);
revoke insert, update, delete on help_topics, help_articles, help_videos from anon, authenticated;
