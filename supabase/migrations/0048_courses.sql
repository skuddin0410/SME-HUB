-- Update 4: Courses. Catalogue, lessons (video, reading, assignment, quiz), enrolment (free and paid),
-- progress, assignments with grading, server-scored quizzes, reviews (with Moderation), saved courses,
-- classmates privacy, the course editor and team publishing.
-- Every lesson, video, file and quiz is checked here on the server: locked content can't be read by URL.

-- ---------- courses ----------
create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$' and slug not in ('my-learning', 'saved', 'teaching', 'manage', 'edit', 'media', 'new')),
  title text not null default '' check (char_length(title) <= 80),
  topic text not null default 'Cash flow & finance' check (topic in ('Cash flow & finance', 'Marketing', 'Hiring & people', 'AI for small business', 'Exporting')),
  level text not null default 'Beginner' check (level in ('Beginner', 'Intermediate', 'Advanced')),
  language text not null default 'English' check (language in ('English', 'French')),
  summary text not null default '' check (char_length(summary) <= 300),
  description text[] not null default '{}' check (char_length(array_to_string(description, ' ')) <= 6000),
  suits text[] not null default '{}' check (cardinality(suits) <= 12),
  outcomes text[] not null default '{}' check (cardinality(outcomes) <= 12),
  prereq text[] not null default '{}' check (cardinality(prereq) <= 12),
  materials text[] not null default '{}' check (cardinality(materials) <= 12),
  cover_url text not null default '' check (cover_url = '' or cover_url like '/sample/courses/%' or cover_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'),
  preview_video text not null default '' check (char_length(preview_video) <= 300),
  preview_captions text not null default '' check (char_length(preview_captions) <= 300),
  preview_poster text not null default '' check (preview_poster = '' or preview_poster like '/sample/courses/%' or preview_poster like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'),
  group_id uuid references groups (id) on delete set null,
  access text not null default 'free' check (access in ('free', 'paid')),
  price int not null default 0 check (price between 0 and 10000),
  order_rule text not null default 'seq' check (order_rule in ('seq', 'any')),
  asg_rule text not null default 'submit' check (asg_rule in ('submit', 'pass')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_sample boolean not null default false,
  publish_asked_at timestamptz,
  publish_asked_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table course_instructors (
  course_id uuid not null references courses (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  position int not null default 0,
  primary key (course_id, member_id)
);
create index course_instructors_member on course_instructors (member_id);

create table course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  position int not null default 0
);
create index course_sections_course on course_sections (course_id, position);

-- the outline: open to anyone who can see the course
create table lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  section_id uuid not null references course_sections (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  type text not null check (type in ('video', 'text', 'assignment', 'quiz')),
  minutes int not null default 5 check (minutes between 0 and 600),
  free_preview boolean not null default false,
  drip_days int not null default 0 check (drip_days between 0 and 365),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index lessons_course on lessons (course_id);
create index lessons_section on lessons (section_id, position);

-- what's inside a lesson: only for people who may open it
create table lesson_content (
  lesson_id uuid primary key references lessons (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  body text[] not null default '{}' check (char_length(array_to_string(body, ' ')) <= 40000),
  video_path text not null default '' check (char_length(video_path) <= 300),
  captions_path text not null default '' check (char_length(captions_path) <= 300),
  poster_url text not null default '' check (char_length(poster_url) <= 300)
);

create table lesson_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  path text not null check (char_length(path) <= 300),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  position int not null default 0
);
create index lesson_files_lesson on lesson_files (lesson_id, position);

create table assignments (
  lesson_id uuid primary key references lessons (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  brief text not null default '' check (char_length(brief) <= 4000),
  due_days int not null default 7 check (due_days between 0 and 365),
  due_time time not null default '23:59',
  time_zone text not null default 'America/Toronto' check (time_zone in ('America/Toronto', 'America/Halifax', 'America/St_Johns', 'America/Winnipeg', 'America/Edmonton', 'America/Vancouver')),
  marks int not null default 10 check (marks between 1 and 1000),
  pass_mark int not null default 6 check (pass_mark >= 0),
  submission_type text not null default 'both' check (submission_type in ('both', 'file', 'text')),
  rubric text[] not null default '{}' check (cardinality(rubric) <= 20)
);

create table quizzes (
  lesson_id uuid primary key references lessons (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  pass_pct int not null default 80 check (pass_pct between 0 and 100),
  time_limit_min int not null default 0 check (time_limit_min between 0 and 600),
  attempts int not null default 3 check (attempts between 1 and 50)
);

-- the correct answers never leave the database for learners
create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references quizzes (lesson_id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  position int not null default 0,
  question text not null default '' check (char_length(question) <= 500),
  options text[] not null default array['', '', '', ''] check (cardinality(options) between 2 and 6),
  correct_index int not null default 0 check (correct_index >= 0 and correct_index < cardinality(options))
);
create index quiz_questions_lesson on quiz_questions (lesson_id, position);

create sequence course_receipt_seq start 10001;

create table enrolments (
  member_id uuid not null references profiles (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  payment_id text check (payment_id is null or char_length(payment_id) <= 200),
  amount_cents int not null default 0,
  tax_cents int not null default 0,
  tax_label text not null default '',
  receipt_no text unique,
  completed_at timestamptz,
  last_lesson_id uuid references lessons (id) on delete set null,
  last_opened_at timestamptz,
  reminders_sent int not null default 0,
  last_reminder_at timestamptz,
  completed_mailed_at timestamptz,
  primary key (member_id, course_id)
);
create index enrolments_course on enrolments (course_id, enrolled_at desc);
create unique index enrolments_payment on enrolments (payment_id) where payment_id is not null;

create table lesson_progress (
  member_id uuid not null references profiles (id) on delete cascade,
  lesson_id uuid not null references lessons (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  done_at timestamptz,
  video_pos numeric(10, 1) not null default 0 check (video_pos >= 0),
  updated_at timestamptz not null default now(),
  primary key (member_id, lesson_id)
);
create index lesson_progress_course on lesson_progress (course_id, member_id);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references profiles (id) on delete cascade,
  lesson_id uuid not null references lessons (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  started_at timestamptz not null default now(),
  answers jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  submitted_at timestamptz,
  score int,
  total int,
  passed boolean,
  wrong int[],
  timed_out boolean not null default false
);
create index quiz_attempts_member on quiz_attempts (member_id, lesson_id, started_at);
create unique index quiz_attempts_one_open on quiz_attempts (member_id, lesson_id) where submitted_at is null;

create table submissions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references profiles (id) on delete cascade,
  lesson_id uuid not null references lessons (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 10000),
  file_path text not null default '' check (char_length(file_path) <= 300),
  file_name text not null default '' check (char_length(file_name) <= 160),
  file_size bigint not null default 0 check (file_size between 0 and 10485760),
  submitted_at timestamptz not null default now(),
  late boolean not null default false,
  grade_marks int,
  feedback text not null default '' check (char_length(feedback) <= 4000),
  graded_by uuid references profiles (id) on delete set null,
  graded_at timestamptz,
  seen_at timestamptz,
  mailed_at timestamptz,
  unique (member_id, lesson_id)
);
create index submissions_course on submissions (course_id, submitted_at);

create table course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  body text not null check (char_length(btrim(body)) between 10 and 2000),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, member_id)
);

create table saved_courses (
  member_id uuid not null references profiles (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (member_id, course_id)
);

create table course_prefs (
  member_id uuid primary key references profiles (id) on delete cascade,
  hide_from_classmates boolean not null default false
);

-- one row per course email sent, so drip and reminder emails go once
create table course_mail_log (
  member_id uuid not null references profiles (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  kind text not null check (kind in ('lesson-open', 'reminder', 'completed', 'enrolled')),
  ref text not null default '',
  sent_at timestamptz not null default now(),
  primary key (member_id, course_id, kind, ref)
);

-- ---------- who may do what ----------
create function course_can_edit(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() or exists (select 1 from course_instructors i where i.course_id = cid and i.member_id = auth.uid());
$$;

create function course_visible(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from courses c where c.id = cid and c.status = 'published') or course_can_edit(cid);
$$;

-- is this lesson complete for this member (videos/readings marked, quizzes passed, assignments by the course rule)
create function course_lesson_done(p_member uuid, p_lesson uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from lessons l join enrolments e on e.course_id = l.course_id and e.member_id = p_member where l.id = p_lesson)
    and case (select type from lessons where id = p_lesson)
      when 'quiz' then exists (select 1 from quiz_attempts a where a.member_id = p_member and a.lesson_id = p_lesson and a.passed)
      when 'assignment' then exists (
        select 1 from submissions s join courses c on c.id = s.course_id join assignments a on a.lesson_id = s.lesson_id
        where s.member_id = p_member and s.lesson_id = p_lesson and (c.asg_rule = 'submit' or coalesce(s.grade_marks, -1) >= a.pass_mark))
      else exists (select 1 from lesson_progress p where p.member_id = p_member and p.lesson_id = p_lesson and p.done_at is not null)
    end;
$$;

-- the lessons of a course in order (section order, then lesson order)
create function course_lesson_order(cid uuid) returns table (lesson_id uuid, n int)
language sql stable security definer set search_path = public as $$
  select l.id, (row_number() over (order by s.position, s.id, l.position, l.created_at, l.id))::int
  from lessons l join course_sections s on s.id = l.section_id where l.course_id = cid;
$$;

-- Can the viewer open this lesson? {ok, why: enrol|drip|order|hidden, at, need, prev, staff}
create function lesson_access(p_lesson uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare l lessons; e enrolments; me uuid := auth.uid(); need uuid; opens timestamptz;
begin
  select * into l from lessons where id = p_lesson;
  if not found or not course_visible(l.course_id) then return jsonb_build_object('ok', false, 'why', 'hidden'); end if;
  if me is not null and course_can_edit(l.course_id) then return jsonb_build_object('ok', true, 'staff', true); end if;
  if me is not null then select * into e from enrolments where member_id = me and course_id = l.course_id; end if;
  if e.member_id is null then
    if l.free_preview then return jsonb_build_object('ok', true, 'prev', true); end if;
    return jsonb_build_object('ok', false, 'why', 'enrol');
  end if;
  if l.drip_days > 0 then
    opens := e.enrolled_at + make_interval(days => l.drip_days);
    if now() < opens then return jsonb_build_object('ok', false, 'why', 'drip', 'at', opens); end if;
  end if;
  if (select order_rule from courses where id = l.course_id) = 'seq' then
    select o.lesson_id into need from course_lesson_order(l.course_id) o
    where o.n < (select n from course_lesson_order(l.course_id) where lesson_id = p_lesson) and not course_lesson_done(me, o.lesson_id)
    order by o.n limit 1;
    if need is not null then return jsonb_build_object('ok', false, 'why', 'order', 'need', need); end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create function lesson_open_ok(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public as $$ select coalesce((lesson_access(p_lesson) ->> 'ok')::boolean, false) $$;

-- downloads need an enrolment (or the course team); a free preview is not enough
create function lesson_download_ok(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((a ->> 'ok')::boolean and (coalesce((a ->> 'staff')::boolean, false) or not coalesce((a ->> 'prev')::boolean, false)), false)
  from lesson_access(p_lesson) a;
$$;

create function course_progress(cid uuid, p_member uuid default auth.uid()) returns table (done int, total int)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where course_lesson_done(p_member, l.id))::int, count(*)::int from lessons l where l.course_id = cid
    and (p_member = auth.uid() or course_can_edit(cid));
$$;

-- marks the course complete the first time every lesson is done; true when that just happened
create function course_check_complete(cid uuid, p_member uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare d int; t int;
begin
  select count(*) filter (where course_lesson_done(p_member, l.id)), count(*) into d, t from lessons l where l.course_id = cid;
  if t > 0 and d = t then
    update enrolments set completed_at = now() where member_id = p_member and course_id = cid and completed_at is null;
    return found;
  end if;
  return false;
end $$;

-- ---------- row security ----------
alter table courses enable row level security;
create policy "courses readable" on courses for select using (status = 'published' or course_can_edit(id));
create policy "team creates courses" on courses for insert to authenticated with check (is_staff());
create policy "team and instructors edit" on courses for update to authenticated using (course_can_edit(id)) with check (course_can_edit(id));
create policy "team deletes empty drafts" on courses for delete to authenticated
  using (is_staff() and status = 'draft' and not exists (select 1 from enrolments e where e.course_id = courses.id));
grant select on courses to anon, authenticated;
grant insert, update, delete on courses to authenticated;

-- only the team publishes; instructors can't change status, sample flag or who asked
create function protect_course_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_staff() then
    new.status := old.status; new.published_at := old.published_at; new.is_sample := old.is_sample;
    if new.publish_asked_at is distinct from old.publish_asked_at and coalesce(current_setting('app.course_ask', true), '') <> '1' then
      new.publish_asked_at := old.publish_asked_at; new.publish_asked_by := old.publish_asked_by;
    end if;
  end if;
  if old.status = 'published' and new.status = 'published' then new.slug := old.slug; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger protect_course_fields before update on courses for each row execute function protect_course_fields();

alter table course_instructors enable row level security;
create policy "instructors readable" on course_instructors for select using (course_visible(course_id));
create policy "team adds instructors" on course_instructors for insert to authenticated with check (is_staff());
create policy "team removes instructors" on course_instructors for delete to authenticated using (is_staff());
grant select on course_instructors to anon, authenticated;
grant insert, delete on course_instructors to authenticated;

alter table course_sections enable row level security;
create policy "sections readable" on course_sections for select using (course_visible(course_id));
create policy "sections edited" on course_sections for all to authenticated using (course_can_edit(course_id)) with check (course_can_edit(course_id));
grant select on course_sections to anon, authenticated;
grant insert, update, delete on course_sections to authenticated;

alter table lessons enable row level security;
create policy "lessons readable" on lessons for select using (course_visible(course_id));
create policy "lessons edited" on lessons for all to authenticated using (course_can_edit(course_id)) with check (course_can_edit(course_id));
grant select on lessons to anon, authenticated;
grant insert, update, delete on lessons to authenticated;

alter table lesson_content enable row level security;
create policy "content for who may open it" on lesson_content for select using (course_can_edit(course_id) or lesson_open_ok(lesson_id));
create policy "content edited" on lesson_content for all to authenticated using (course_can_edit(course_id)) with check (course_can_edit(course_id));
grant select on lesson_content to anon, authenticated;
grant insert, update, delete on lesson_content to authenticated;

alter table lesson_files enable row level security;
create policy "file names readable" on lesson_files for select using (course_visible(course_id));
create policy "files edited" on lesson_files for all to authenticated using (course_can_edit(course_id)) with check (course_can_edit(course_id));
grant select on lesson_files to anon, authenticated;
grant insert, update, delete on lesson_files to authenticated;

alter table assignments enable row level security;
create policy "assignment for who may open it" on assignments for select using (course_can_edit(course_id) or lesson_open_ok(lesson_id));
create policy "assignment edited" on assignments for all to authenticated using (course_can_edit(course_id)) with check (course_can_edit(course_id));
grant select on assignments to anon, authenticated;
grant insert, update, delete on assignments to authenticated;

alter table quizzes enable row level security;
create policy "quiz settings readable" on quizzes for select using (course_visible(course_id));
create policy "quiz edited" on quizzes for all to authenticated using (course_can_edit(course_id)) with check (course_can_edit(course_id));
grant select on quizzes to anon, authenticated;
grant insert, update, delete on quizzes to authenticated;

alter table quiz_questions enable row level security;
create policy "questions for the course team" on quiz_questions for all to authenticated using (course_can_edit(course_id)) with check (course_can_edit(course_id));
grant select, insert, update, delete on quiz_questions to authenticated;

alter table enrolments enable row level security;
create policy "own enrolments and the course team" on enrolments for select to authenticated using (member_id = auth.uid() or course_can_edit(course_id));
create policy "team removes an enrolment (refund)" on enrolments for delete to authenticated using (is_staff());
grant select, delete on enrolments to authenticated;

alter table lesson_progress enable row level security;
create policy "own progress and the course team" on lesson_progress for select to authenticated using (member_id = auth.uid() or course_can_edit(course_id));
grant select on lesson_progress to authenticated;

alter table quiz_attempts enable row level security;
create policy "own attempts and the course team" on quiz_attempts for select to authenticated using (member_id = auth.uid() or course_can_edit(course_id));
grant select on quiz_attempts to authenticated;

alter table submissions enable row level security;
create policy "own work and the course team" on submissions for select to authenticated using (member_id = auth.uid() or course_can_edit(course_id));
grant select on submissions to authenticated;

alter table course_reviews enable row level security;
create policy "reviews readable" on course_reviews for select using ((hidden_at is null and course_visible(course_id)) or member_id = auth.uid() or is_staff());
create function course_can_review(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and course_visible(cid) and exists (select 1 from lessons l where l.course_id = cid and course_lesson_done(auth.uid(), l.id));
$$;
create policy "review after a finished lesson" on course_reviews for insert to authenticated with check (
  member_id = auth.uid() and hidden_at is null and course_can_review(course_id));
create policy "edit own review" on course_reviews for update to authenticated using (member_id = auth.uid() or is_staff()) with check (member_id = auth.uid() or is_staff());
create policy "delete own review" on course_reviews for delete to authenticated using (member_id = auth.uid() or is_staff());
grant select on course_reviews to anon, authenticated;
grant insert, update, delete on course_reviews to authenticated;

create function protect_review_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_staff() and coalesce(current_setting('app.system', true), '') <> '1' then new.hidden_at := old.hidden_at; end if;
  new.course_id := old.course_id; new.member_id := old.member_id;
  if new.stars is distinct from old.stars or new.body is distinct from old.body then new.updated_at := now(); end if;
  return new;
end $$;
create trigger protect_review_fields before update on course_reviews for each row execute function protect_review_fields();

alter table saved_courses enable row level security;
create policy "own saved courses" on saved_courses for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid() and course_visible(course_id));
grant select, insert, delete on saved_courses to authenticated;

alter table course_prefs enable row level security;
create policy "own course settings" on course_prefs for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
grant select, insert, update on course_prefs to authenticated;

alter table course_mail_log enable row level security;

-- ---------- learner actions ----------
create function enrol_free(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c courses;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if not is_active() then raise exception 'account not active'; end if;
  select * into c from courses where id = cid;
  if not found or c.status <> 'published' then raise exception 'This course isn’t available'; end if;
  if c.access <> 'free' then raise exception 'This course needs to be bought'; end if;
  insert into enrolments (member_id, course_id) values (auth.uid(), cid) on conflict do nothing;
end $$;

-- paid enrolment: only the payment webhook (service role) may call it
create function enrol_paid(p_member uuid, cid uuid, p_payment text, p_amount int, p_tax int, p_tax_label text) returns text
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  select receipt_no into r from enrolments where payment_id = p_payment;
  if found then return r; end if;
  r := 'SME-C-' || nextval('course_receipt_seq');
  insert into enrolments (member_id, course_id, payment_id, amount_cents, tax_cents, tax_label, receipt_no)
  values (p_member, cid, p_payment, p_amount, p_tax, left(p_tax_label, 80), r)
  on conflict (member_id, course_id) do update set payment_id = coalesce(enrolments.payment_id, excluded.payment_id),
    amount_cents = excluded.amount_cents, tax_cents = excluded.tax_cents, tax_label = excluded.tax_label, receipt_no = coalesce(enrolments.receipt_no, excluded.receipt_no)
  returning receipt_no into r;
  return r;
end $$;

-- remembers the last lesson opened (Continue learning goes on from there)
create function open_lesson(p_lesson uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := (select course_id from lessons where id = p_lesson);
begin
  if auth.uid() is null or not lesson_open_ok(p_lesson) then return; end if;
  update enrolments set last_lesson_id = p_lesson, last_opened_at = now(), reminders_sent = 0
  where member_id = auth.uid() and course_id = cid;
end $$;

create function save_video_pos(p_lesson uuid, p_sec numeric) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := (select course_id from lessons where id = p_lesson);
begin
  if auth.uid() is null or not lesson_open_ok(p_lesson) or not exists (select 1 from enrolments where member_id = auth.uid() and course_id = cid) then return; end if;
  insert into lesson_progress (member_id, lesson_id, course_id, video_pos) values (auth.uid(), p_lesson, cid, greatest(0, least(p_sec, 86400)))
  on conflict (member_id, lesson_id) do update set video_pos = excluded.video_pos, updated_at = now();
  update enrolments set last_lesson_id = p_lesson, last_opened_at = now() where member_id = auth.uid() and course_id = cid;
end $$;

-- videos and readings; returns true when this finished the whole course
create function mark_lesson_done(p_lesson uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare l lessons;
begin
  select * into l from lessons where id = p_lesson;
  if not found or l.type not in ('video', 'text') then raise exception 'This lesson can’t be marked complete'; end if;
  if not lesson_open_ok(p_lesson) or not exists (select 1 from enrolments where member_id = auth.uid() and course_id = l.course_id) then
    raise exception 'This lesson is locked';
  end if;
  insert into lesson_progress (member_id, lesson_id, course_id, done_at, video_pos) values (auth.uid(), p_lesson, l.course_id, now(), 0)
  on conflict (member_id, lesson_id) do update set done_at = coalesce(lesson_progress.done_at, now()), video_pos = 0, updated_at = now();
  return course_check_complete(l.course_id, auth.uid());
end $$;

-- the deadline: enrolment day + N days, at the set time, in the set time zone
create function assignment_due(p_member uuid, p_lesson uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  select (((e.enrolled_at at time zone a.time_zone)::date + a.due_days) + a.due_time) at time zone a.time_zone
  from assignments a join lessons l on l.id = a.lesson_id join enrolments e on e.course_id = l.course_id and e.member_id = p_member
  where a.lesson_id = p_lesson;
$$;

create function submit_assignment(p_lesson uuid, p_body text, p_file_path text, p_file_name text, p_file_size bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare a assignments; me uuid := auth.uid(); old submissions; body text := btrim(coalesce(p_body, '')); fp text := coalesce(p_file_path, ''); cid uuid;
begin
  select * into a from assignments where lesson_id = p_lesson;
  if not found then raise exception 'Not an assignment'; end if;
  cid := a.course_id;
  if not lesson_open_ok(p_lesson) or not exists (select 1 from enrolments where member_id = me and course_id = cid) then raise exception 'This lesson is locked'; end if;
  if fp <> '' and fp not like 'submissions/' || me || '/' || p_lesson || '/%' then raise exception 'Upload the file again'; end if;
  if coalesce(p_file_size, 0) > 10485760 then raise exception 'That file is over 10 MB.'; end if;
  select * into old from submissions where member_id = me and lesson_id = p_lesson;
  if old.id is not null and old.grade_marks is not null and old.grade_marks >= a.pass_mark then raise exception 'This assignment has passed and can’t be changed'; end if;
  -- keep the earlier file when only the text changes
  if fp = '' and old.id is not null and body = '' then fp := old.file_path; end if;
  if a.submission_type = 'file' and fp = '' then raise exception 'Upload your file first'; end if;
  if a.submission_type = 'text' and body = '' then raise exception 'Write your answer first'; end if;
  if fp = '' and body = '' then raise exception 'Upload a file or paste your answer first'; end if;
  insert into submissions (member_id, lesson_id, course_id, body, file_path, file_name, file_size, late)
  values (me, p_lesson, cid, left(body, 10000), fp,
          case when fp = coalesce(old.file_path, '') and coalesce(p_file_path, '') = '' then coalesce(old.file_name, '') else left(coalesce(p_file_name, ''), 160) end,
          case when fp = coalesce(old.file_path, '') and coalesce(p_file_path, '') = '' then coalesce(old.file_size, 0) else coalesce(p_file_size, 0) end,
          now() > coalesce(assignment_due(me, p_lesson), 'infinity'))
  on conflict (member_id, lesson_id) do update set body = excluded.body, file_path = excluded.file_path, file_name = excluded.file_name, file_size = excluded.file_size,
    submitted_at = now(), late = excluded.late, grade_marks = null, feedback = '', graded_by = null, graded_at = null, seen_at = null, mailed_at = null;
  return course_check_complete(cid, me);
end $$;

create function grade_submission(p_sub uuid, p_marks int, p_feedback text) returns void
language plpgsql security definer set search_path = public as $$
declare s submissions; a assignments;
begin
  select * into s from submissions where id = p_sub;
  if not found or not course_can_edit(s.course_id) then raise exception 'Only this course’s instructors can grade it'; end if;
  select * into a from assignments where lesson_id = s.lesson_id;
  if p_marks is null or p_marks < 0 or p_marks > a.marks then raise exception 'Enter marks from 0 to %', a.marks; end if;
  if btrim(coalesce(p_feedback, '')) = '' then raise exception 'Add a line of feedback'; end if;
  update submissions set grade_marks = p_marks, feedback = left(btrim(p_feedback), 4000), graded_by = auth.uid(), graded_at = now(), seen_at = null
  where id = p_sub;
  insert into notifications (user_id, actor_id, type, course_id, href)
  values (s.member_id, auth.uid(), 'course_feedback', s.course_id,
          '/courses/' || (select slug from courses where id = s.course_id) || '/learn/' || s.lesson_id);
  perform course_check_complete(s.course_id, s.member_id);
end $$;

create function feedback_seen(p_sub uuid) returns void
language sql security definer set search_path = public as $$
  update submissions set seen_at = now() where id = p_sub and member_id = auth.uid() and graded_at is not null and seen_at is null;
$$;

-- ---------- quizzes, scored here ----------
create function quiz_score(p_attempt uuid, p_timed boolean) returns void
language plpgsql security definer set search_path = public as $$
declare at quiz_attempts; q quizzes; sc int := 0; tot int := 0; wr int[] := '{}'; r record; i int := 0;
begin
  select * into at from quiz_attempts where id = p_attempt for update;
  if at.submitted_at is not null then return; end if;
  select * into q from quizzes where lesson_id = at.lesson_id;
  for r in select correct_index from quiz_questions where lesson_id = at.lesson_id order by position, id loop
    tot := tot + 1;
    if (at.answers ->> i::text)::int is not distinct from r.correct_index then sc := sc + 1; else wr := wr || i; end if;
    i := i + 1;
  end loop;
  update quiz_attempts set submitted_at = now(), score = sc, total = tot, wrong = wr, timed_out = p_timed,
    passed = tot > 0 and 100.0 * sc / tot >= q.pass_pct
  where id = p_attempt;
  perform course_check_complete(at.course_id, at.member_id);
end $$;

-- submits any attempt whose time ran out, with the answers so far
create function quiz_expire(p_member uuid, p_lesson uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  for a in select qa.id from quiz_attempts qa join quizzes q on q.lesson_id = qa.lesson_id
    where qa.member_id = p_member and qa.lesson_id = p_lesson and qa.submitted_at is null and q.time_limit_min > 0
      and now() >= qa.started_at + make_interval(mins => q.time_limit_min) loop
    perform quiz_score(a.id, true);
  end loop;
end $$;

-- what a learner sees: the questions without the answers, their attempts, and the open attempt with its time
create function quiz_view(p_lesson uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q quizzes; me uuid := auth.uid(); op quiz_attempts; staff boolean;
begin
  select * into q from quizzes where lesson_id = p_lesson;
  if not found or not lesson_open_ok(p_lesson) then raise exception 'This lesson is locked'; end if;
  staff := course_can_edit(q.course_id);
  if me is not null then perform quiz_expire(me, p_lesson); end if;
  select * into op from quiz_attempts where member_id = me and lesson_id = p_lesson and submitted_at is null;
  return jsonb_build_object(
    'pass_pct', q.pass_pct, 'limit', q.time_limit_min, 'attempts', q.attempts, 'now', now(),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('q', question, 'o', to_jsonb(options)) order by position, id) from quiz_questions where lesson_id = p_lesson), '[]'),
    'done', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'score', score, 'total', total, 'passed', passed, 'wrong', to_jsonb(wrong), 'timed_out', timed_out, 'at', submitted_at) order by started_at)
                      from quiz_attempts where member_id = me and lesson_id = p_lesson and submitted_at is not null), '[]'),
    'used', (select count(*) from quiz_attempts where member_id = me and lesson_id = p_lesson),
    'open', case when op.id is null then null else jsonb_build_object('id', op.id, 'answers', op.answers, 'started_at', op.started_at,
             'ends_at', case when q.time_limit_min > 0 then op.started_at + make_interval(mins => q.time_limit_min) end) end,
    'staff', staff);
end $$;

create function quiz_start(p_lesson uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare q quizzes; me uuid := auth.uid(); id uuid;
begin
  select * into q from quizzes where lesson_id = p_lesson;
  if not found or not lesson_open_ok(p_lesson) or not exists (select 1 from enrolments where member_id = me and course_id = q.course_id) then
    raise exception 'This lesson is locked';
  end if;
  perform quiz_expire(me, p_lesson);
  select qa.id into id from quiz_attempts qa where member_id = me and lesson_id = p_lesson and submitted_at is null;
  if id is not null then return id; end if;
  if exists (select 1 from quiz_attempts where member_id = me and lesson_id = p_lesson and passed) then raise exception 'You already passed this quiz'; end if;
  if (select count(*) from quiz_attempts where member_id = me and lesson_id = p_lesson) >= q.attempts then raise exception 'No attempts left'; end if;
  insert into quiz_attempts (member_id, lesson_id, course_id) values (me, p_lesson, q.course_id) returning quiz_attempts.id into id;
  return id;
end $$;

create function quiz_answer(p_attempt uuid, p_q int, p_option int) returns void
language plpgsql security definer set search_path = public as $$
declare at quiz_attempts; q quizzes; n int;
begin
  select * into at from quiz_attempts where id = p_attempt and member_id = auth.uid();
  if not found or at.submitted_at is not null then raise exception 'This attempt is closed'; end if;
  select * into q from quizzes where lesson_id = at.lesson_id;
  if q.time_limit_min > 0 and now() >= at.started_at + make_interval(mins => q.time_limit_min) then
    perform quiz_score(p_attempt, true); raise exception 'Time ran out';
  end if;
  select cardinality(options) into n from quiz_questions where lesson_id = at.lesson_id order by position, id offset p_q limit 1;
  if n is null or p_option < 0 or p_option >= n then raise exception 'Unknown answer'; end if;
  update quiz_attempts set answers = answers || jsonb_build_object(p_q::text, p_option) where id = p_attempt;
end $$;

create function quiz_submit(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare at quiz_attempts; q quizzes; timed boolean;
begin
  select * into at from quiz_attempts where id = p_attempt and member_id = auth.uid();
  if not found then raise exception 'Unknown attempt'; end if;
  select * into q from quizzes where lesson_id = at.lesson_id;
  timed := q.time_limit_min > 0 and now() >= at.started_at + make_interval(mins => q.time_limit_min);
  perform quiz_score(p_attempt, timed);
  select * into at from quiz_attempts where id = p_attempt;
  return jsonb_build_object('score', at.score, 'total', at.total, 'passed', at.passed, 'wrong', to_jsonb(at.wrong), 'timed_out', at.timed_out,
    'completed', exists (select 1 from enrolments where member_id = auth.uid() and course_id = at.course_id and completed_at > now() - interval '5 seconds'));
end $$;

-- the course team previewing a quiz as a learner: scored, never saved
create function quiz_preview_score(p_lesson uuid, p_answers jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q quizzes; sc int := 0; tot int := 0; wr int[] := '{}'; r record; i int := 0;
begin
  select * into q from quizzes where lesson_id = p_lesson;
  if not found or not course_can_edit(q.course_id) then raise exception 'For the course team only'; end if;
  for r in select correct_index from quiz_questions where lesson_id = p_lesson order by position, id loop
    tot := tot + 1;
    if (p_answers ->> i::text)::int is not distinct from r.correct_index then sc := sc + 1; else wr := wr || i; end if;
    i := i + 1;
  end loop;
  return jsonb_build_object('score', sc, 'total', tot, 'wrong', to_jsonb(wr), 'passed', tot > 0 and 100.0 * sc / tot >= q.pass_pct);
end $$;

-- ---------- classmates: name and photo only, never progress ----------
create function course_classmates(cid uuid) returns table (id uuid, full_name text, avatar_url text, enrolled_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, e.enrolled_at from enrolments e join profiles p on p.id = e.member_id
  where e.course_id = cid and auth.uid() is not null and course_visible(cid) and p.status = 'active'
    and e.member_id <> auth.uid()
    and not exists (select 1 from course_instructors i where i.course_id = cid and i.member_id = e.member_id)
    and not exists (select 1 from course_prefs cp where cp.member_id = e.member_id and cp.hide_from_classmates)
    and not blocked_between(auth.uid(), e.member_id)
  order by e.enrolled_at desc limit 24;
$$;

create function course_learner_count(cid uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from enrolments e join profiles p on p.id = e.member_id
  where e.course_id = cid and course_visible(cid) and p.status = 'active'
    and not exists (select 1 from course_instructors i where i.course_id = cid and i.member_id = e.member_id)
    and not exists (select 1 from course_prefs cp where cp.member_id = e.member_id and cp.hide_from_classmates);
$$;

-- ---------- publishing ----------
create function course_publish_check(cid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_array(
    jsonb_build_array(btrim(c.title) <> '', 'Course title'),
    jsonb_build_array(btrim(c.summary) <> '', 'Short summary'),
    jsonb_build_array(c.cover_url <> '', 'Cover image'),
    jsonb_build_array(exists (select 1 from course_instructors i where i.course_id = c.id), 'At least one instructor'),
    jsonb_build_array(exists (select 1 from lessons l where l.course_id = c.id), 'At least one lesson'),
    jsonb_build_array(exists (select 1 from lessons l where l.course_id = c.id and l.free_preview), 'One free preview lesson (recommended)', true),
    jsonb_build_array(not exists (
      select 1 from lessons l left join lesson_content lc on lc.lesson_id = l.id left join assignments a on a.lesson_id = l.id
      where l.course_id = c.id and (btrim(l.title) = ''
        or (l.type = 'video' and (coalesce(lc.video_path, '') = '' or coalesce(lc.captions_path, '') = ''))
        or (l.type = 'assignment' and btrim(coalesce(a.brief, '')) = '')
        or (l.type = 'quiz' and (not exists (select 1 from quiz_questions qq where qq.lesson_id = l.id)
             or exists (select 1 from quiz_questions qq where qq.lesson_id = l.id and (btrim(qq.question) = '' or exists (select 1 from unnest(qq.options) o where btrim(o) = '')))))
      )), 'Every lesson has a title and its content'))
  || case when c.access = 'paid' then jsonb_build_array(jsonb_build_array(c.price > 0, 'A price for the paid course')) else '[]'::jsonb end
  from courses c where c.id = cid and course_can_edit(cid);
$$;

create function course_publish_ok(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from jsonb_array_elements(course_publish_check(cid)) x where not (x ->> 0)::boolean and coalesce(x ->> 2, 'false') <> 'true');
$$;

create function publish_course(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Only the Hub team can publish courses'; end if;
  if not course_publish_ok(cid) then raise exception 'Fix the items marked with a cross first'; end if;
  update courses set status = 'published', published_at = coalesce(published_at, now()), is_sample = false, publish_asked_at = null where id = cid;
end $$;

create function unpublish_course(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Only the Hub team can unpublish courses'; end if;
  update courses set status = 'draft' where id = cid;
end $$;

create function ask_publish_course(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not course_can_edit(cid) then raise exception 'Only this course’s instructors can ask'; end if;
  if not course_publish_ok(cid) then raise exception 'Fix the items marked with a cross first'; end if;
  perform set_config('app.course_ask', '1', true);
  update courses set publish_asked_at = now(), publish_asked_by = auth.uid() where id = cid;
  perform set_config('app.course_ask', '', true);
end $$;

-- ---------- course emails: who to tell, once ----------
-- drip lessons that opened in the last day, not mailed yet (run by a scheduled job with the service key)
create function course_mail_claim(p_member uuid, cid uuid, p_kind text, p_ref text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and p_member <> auth.uid() and not course_can_edit(cid) then return false; end if;
  insert into course_mail_log (member_id, course_id, kind, ref) values (p_member, cid, p_kind, coalesce(p_ref, ''));
  return true;
exception when unique_violation then return false;
end $$;

-- ---------- Moderation: course reviews ----------
alter table reports add column if not exists course_review_id uuid references course_reviews (id) on delete cascade;
alter table reports drop constraint if exists reports_check;
alter table reports add constraint reports_check check (post_id is not null or profile_id is not null or course_review_id is not null);
alter table reports add column if not exists note text not null default '' check (char_length(note) <= 1000);
update mod_settings set types = types || '{"creview":{"on":true,"auto":true,"hide":3}}'::jsonb where not types ? 'creview';

create function mod_after_course_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare s mod_settings; n int; t jsonb;
begin
  if new.course_review_id is null then return null; end if;
  select * into s from mod_settings limit 1;
  t := coalesce(s.types -> 'creview', '{"on":true,"auto":true,"hide":3}'::jsonb);
  if (t ->> 'on')::boolean and (t ->> 'auto')::boolean then
    select count(*) into n from reports where course_review_id = new.course_review_id and status = 'open';
    if n >= (t ->> 'hide')::int then
      perform set_config('app.system', '1', true);
      update course_reviews set hidden_at = now() where id = new.course_review_id and hidden_at is null;
      perform set_config('app.system', '', true);
    end if;
  end if;
  return null;
end $$;
create trigger mod_after_course_report after insert on reports for each row execute function mod_after_course_report();

-- a member can report a review they can see, and not their own
create function course_review_reportable(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from course_reviews r where r.id = rid and r.member_id <> auth.uid() and r.hidden_at is null and course_visible(r.course_id))
    and coalesce(((select types from mod_settings limit 1) -> 'creview' ->> 'on')::boolean, true);
$$;
create policy "report a course review" on reports as restrictive for insert to authenticated with check (course_review_id is null or course_review_reportable(course_review_id));

-- ---------- notifications for course work ----------
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('like', 'comment', 'connection_request', 'connection_accepted', 'course_feedback', 'course_submission'));
alter table notifications add column if not exists course_id uuid references courses (id) on delete cascade;
alter table notifications add column if not exists href text check (href is null or href ~ '^/[A-Za-z0-9/_-]*$');

-- instructors hear about new work straight away in the app (the email is grouped once a day)
create function notify_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, actor_id, type, course_id, href)
  select i.member_id, new.member_id, 'course_submission', new.course_id, '/courses/teaching'
  from course_instructors i where i.course_id = new.course_id and i.member_id <> new.member_id;
  return null;
end $$;
create trigger notify_submission after insert or update of submitted_at on submissions for each row execute function notify_submission();

-- ---------- private files: lesson videos, captions, downloads and learners' work ----------
insert into storage.buckets (id, name, public, file_size_limit) values ('course-files', 'course-files', false, null) on conflict (id) do nothing;

-- paths: <course>/preview/<file> · <course>/<lesson>/v/<file> (video, captions) · <course>/<lesson>/f/<file> (downloads)
--        submissions/<member>/<lesson>/<file>
create function course_object_ok(p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare parts text[] := string_to_array(p_name, '/'); cid uuid; lid uuid;
begin
  if cardinality(parts) < 3 then return false; end if;
  if parts[1] = 'submissions' then
    if cardinality(parts) < 4 then return false; end if;
    begin lid := parts[3]::uuid; exception when others then return false; end;
    return parts[2] = auth.uid()::text
      or exists (select 1 from lessons l where l.id = lid and course_can_edit(l.course_id) and exists (select 1 from submissions s where s.lesson_id = lid and s.file_path = p_name));
  end if;
  begin cid := parts[1]::uuid; exception when others then return false; end;
  if parts[2] = 'preview' then return course_visible(cid); end if;
  begin lid := parts[2]::uuid; exception when others then return false; end;
  if not exists (select 1 from lessons where id = lid and course_id = cid) then return course_can_edit(cid); end if;
  if parts[3] = 'v' then return lesson_open_ok(lid); end if;
  if parts[3] = 'f' then return lesson_download_ok(lid); end if;
  return course_can_edit(cid);
end $$;

create function course_object_writable(p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare parts text[] := string_to_array(p_name, '/'); cid uuid;
begin
  if cardinality(parts) < 3 then return false; end if;
  if parts[1] = 'submissions' then return cardinality(parts) >= 4 and parts[2] = auth.uid()::text; end if;
  begin cid := parts[1]::uuid; exception when others then return false; end;
  return course_can_edit(cid);
end $$;

create policy "course files read" on storage.objects for select to anon, authenticated using (bucket_id = 'course-files' and course_object_ok(name));
create policy "course files upload" on storage.objects for insert to authenticated with check (bucket_id = 'course-files' and course_object_writable(name));
create policy "course files replace" on storage.objects for update to authenticated using (bucket_id = 'course-files' and course_object_writable(name));
create policy "course files delete" on storage.objects for delete to authenticated using (bucket_id = 'course-files' and course_object_writable(name));

-- ---------- grants ----------
revoke execute on function course_lesson_done(uuid, uuid), course_check_complete(uuid, uuid), enrol_paid(uuid, uuid, text, int, int, text),
  quiz_score(uuid, boolean), quiz_expire(uuid, uuid), protect_course_fields(), protect_review_fields(),
  mod_after_course_report(), notify_submission(), course_lesson_order(uuid), assignment_due(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function enrol_free(uuid), open_lesson(uuid), save_video_pos(uuid, numeric), mark_lesson_done(uuid),
  submit_assignment(uuid, text, text, text, bigint), grade_submission(uuid, int, text), feedback_seen(uuid), quiz_start(uuid), quiz_answer(uuid, int, int),
  quiz_submit(uuid), quiz_preview_score(uuid, jsonb), course_classmates(uuid), publish_course(uuid), unpublish_course(uuid), ask_publish_course(uuid),
  course_mail_claim(uuid, uuid, text, text)
  from public, anon;
grant execute on function enrol_free(uuid), open_lesson(uuid), save_video_pos(uuid, numeric), mark_lesson_done(uuid),
  submit_assignment(uuid, text, text, text, bigint), grade_submission(uuid, int, text), feedback_seen(uuid), quiz_start(uuid), quiz_answer(uuid, int, int),
  quiz_submit(uuid), quiz_preview_score(uuid, jsonb), course_classmates(uuid), publish_course(uuid), unpublish_course(uuid), ask_publish_course(uuid),
  course_mail_claim(uuid, uuid, text, text)
  to authenticated;
