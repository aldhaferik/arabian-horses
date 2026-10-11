-- Apply once to the chosen Supabase project. No data API access to raw events.
create schema if not exists library_private;
revoke all on schema library_private from public, anon, authenticated;
grant usage on schema library_private to service_role;
create table library_private.book_stats (
 book_id text primary key,
 reader_opens bigint not null default 0 check (reader_opens >= 0),
 download_requests bigint not null default 0 check (download_requests >= 0),
 direct_opens bigint not null default 0 check (direct_opens >= 0),
 started_at timestamptz not null default now()
);
insert into library_private.book_stats(book_id) values ('horses'),('proverbs-words-1'),('hare'),('hida-bedu'),('hida'),('dhabb'),('jerboas'),('proverbs-2'),('proverbs-words-2'),('desert-literature');
create table library_private.activity_events (
 event_id uuid primary key,
 book_id text not null references library_private.book_stats,
 kind text not null check(kind in ('read','download','open')),
 visitor_hash text not null,
 created_at timestamptz not null default now()
);
create index activity_dedup on library_private.activity_events(visitor_hash,book_id,kind,created_at desc);
create table library_private.request_limits (
 actor_hash text primary key,
 window_start timestamptz not null,
 requests integer not null
);
alter table library_private.book_stats enable row level security;
alter table library_private.activity_events enable row level security;
alter table library_private.request_limits enable row level security;
revoke all on all tables in schema library_private from public, anon, authenticated;
grant select,insert,update,delete on all tables in schema library_private to service_role;
create or replace function public.library_activity(p_book text,p_kind text default 'get',p_visitor text default null,p_actor text default null,p_event uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare s library_private.book_stats; n integer; accepted boolean := false; t timestamptz := now();
begin
 select * into s from library_private.book_stats where book_id=p_book;
 if not found then raise exception 'unknown book'; end if;
 if p_actor is null then raise exception 'invalid actor'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor,0));
  insert into library_private.request_limits values(p_actor,t,1)
   on conflict(actor_hash) do update set
    requests=case when request_limits.window_start < t-interval '1 minute' then 1 else request_limits.requests+1 end,
    window_start=case when request_limits.window_start < t-interval '1 minute' then t else request_limits.window_start end
   returning requests into n;
  if n > 120 then return jsonb_build_object('limited',true); end if;
 if p_kind <> 'get' then
  if p_kind not in ('read','download','open') or p_event is null or p_visitor is null or p_actor is null then raise exception 'invalid event'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_visitor||p_book||p_kind,0));
  if not exists(select 1 from library_private.activity_events where visitor_hash=p_visitor and book_id=p_book and kind=p_kind and created_at > t-case when p_kind='read' then interval '30 minutes' else interval '5 seconds' end) then
   insert into library_private.activity_events(event_id,book_id,kind,visitor_hash) values(p_event,p_book,p_kind,p_visitor) on conflict do nothing;
   get diagnostics n = row_count;
   if n=1 then
    update library_private.book_stats set reader_opens=reader_opens+case when p_kind='read' then 1 else 0 end,
     download_requests=download_requests+case when p_kind='download' then 1 else 0 end,
     direct_opens=direct_opens+case when p_kind='open' then 1 else 0 end where book_id=p_book;
    accepted := true;
   end if;
  end if;
  delete from library_private.activity_events where created_at < t-interval '2 days';
  delete from library_private.request_limits where window_start < t-interval '2 days';
  select * into s from library_private.book_stats where book_id=p_book;
 end if;
 return jsonb_build_object('book_id',s.book_id,'reader_opens',s.reader_opens,'download_requests',s.download_requests,'direct_opens',s.direct_opens,'started_at',s.started_at,'counted',accepted);
end; $$;
revoke all on function public.library_activity(text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.library_activity(text,text,text,text,uuid) to service_role;
