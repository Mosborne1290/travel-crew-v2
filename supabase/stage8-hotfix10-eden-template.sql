-- ============================================================
-- EDEN NSW CRUISE PORT DAY TEMPLATE
-- Safe template seed. Does NOT create a duplicate trip.
-- The owner can attach this template to the correct trip in the UI.
-- ============================================================

insert into public.cruise_port_day_templates(
  template_key,title,port_name,region,country,timezone,default_data
)
values(
  'eden-nsw-2026-12-19',
  'Eden NSW Cruise Port Day — 19 December 2026',
  'Eden',
  'NSW',
  'Australia',
  'Australia/Sydney',
  $json$
  {
    "port_date":"2026-12-19",
    "timezone":"Australia/Sydney",
    "disembark_time":"09:00",
    "required_return_time":"15:00",
    "recommended_return_time":"14:45",
    "activities":[
      {"title":"Eden Cruise Wharf & Welcome Centre","start":"09:00","end":"09:15","category":"Cruise Wharf","priority":"Must Do"},
      {"title":"Travel to Eden Town Centre","start":"09:15","end":"09:35","category":"Transport","priority":"Must Do"},
      {"title":"Eden Community Market","start":"09:35","end":"10:35","category":"Market","priority":"Must Do","address":"18–20 Chandos Street, Eden NSW","needs_confirmation":true,"notes":"Expected third-Saturday community market. Confirm December operation before travel."},
      {"title":"Imlay Street Shopping","start":"10:35","end":"11:15","category":"Shopping","priority":"Must Do","notes":"Souvenirs, local gifts, handmade products, Christmas gifts and Eden products."},
      {"title":"Eden Killer Whale Museum","start":"11:15","end":"12:15","category":"Museum","priority":"Must Do","notes":"See Old Tom and Eden's whaling and maritime history."},
      {"title":"Lunch","start":"12:15","end":"12:45","category":"Food","priority":"Recommended","notes":"Local seafood, fish and chips or casual cafe."},
      {"title":"Eden Lookout & Rotary Park","start":"12:45","end":"13:20","category":"Lookout","priority":"Recommended","estimated_cost":0},
      {"title":"Aslings Beach & Rock Pool","start":"13:20","end":"14:00","category":"Beach","priority":"Optional","weather_dependent":true,"bad_weather_alternative":"Extra Eden shopping / Killer Whale Museum / cafe"},
      {"title":"Return to Snug Cove","start":"14:00","end":"14:15","category":"Transport","priority":"Must Do"},
      {"title":"Snug Cove Waterfront & Final Shopping","start":"14:15","end":"14:45","category":"Shopping","priority":"Recommended"},
      {"title":"Return to Eden Cruise Wharf","start":"14:45","end":"14:45","category":"Cruise Wharf","priority":"Must Do","notes":"🚢 BACK AT SHIP"}
    ],
    "shopping":[
      "Old Tom / Killer Whale souvenir",
      "Eden Christmas ornament",
      "Handmade market item",
      "Local jewellery",
      "Twofold Bay artwork",
      "Sapphire Coast souvenir",
      "Local preserves or food product"
    ]
  }
  $json$::jsonb
)
on conflict (template_key) do update set
  title=excluded.title,
  default_data=excluded.default_data;


-- Optional safe auto-attach:
-- If exactly ONE existing trip clearly matches Eden and includes 19 Dec 2026,
-- attach the template automatically. Otherwise leave it as an Owner draft.
do $$
declare
  v_trip_id uuid;
  v_matches integer;
  v_owner_id uuid;
  v_day_id uuid;
  d jsonb;
  a jsonb;
  item text;
  v_sort integer := 0;
begin
  select count(*), min(t.id)
  into v_matches,v_trip_id
  from public.trips t
  where
    (
      lower(coalesce(t.name,'')) like '%eden%'
      or lower(coalesce(t.primary_destination,'')) like '%eden%'
      or exists(
        select 1 from public.destinations dst
        where dst.trip_id=t.id
          and lower(coalesce(dst.name,'')) like '%eden%'
      )
    )
    and (t.start_date is null or t.start_date <= date '2026-12-19')
    and (t.end_date is null or t.end_date >= date '2026-12-19');

  if v_matches <> 1 then
    raise notice 'Eden template left unattached because % matching trips were found.',v_matches;
    return;
  end if;

  if exists(
    select 1 from public.cruise_port_days
    where trip_id=v_trip_id
      and port_name='Eden'
      and port_date=date '2026-12-19'
  ) then
    raise notice 'Eden Cruise Port Day already exists; no duplicate created.';
    return;
  end if;

  select user_id into v_owner_id
  from public.user_roles
  where role='owner'
  order by user_id
  limit 1;

  if v_owner_id is null then
    raise notice 'Eden template left unattached because no Owner role was found.';
    return;
  end if;

  select default_data into d
  from public.cruise_port_day_templates
  where template_key='eden-nsw-2026-12-19';

  insert into public.cruise_port_days(
    trip_id,created_by,port_name,region,country,port_date,timezone,
    wharf_name,disembark_time,required_return_time,recommended_return_time,
    notes
  )
  values(
    v_trip_id,v_owner_id,'Eden','NSW','Australia',date '2026-12-19','Australia/Sydney',
    'Eden Cruise Wharf',
    time '09:00',time '15:00',time '14:45',
    'Eden itinerary attached automatically because exactly one matching existing trip was found.'
  )
  returning id into v_day_id;

  for a in select * from jsonb_array_elements(d->'activities')
  loop
    v_sort:=v_sort+1;
    insert into public.activities(
      trip_id,cruise_port_day_id,created_by,title,activity_type,
      cruise_local_start_time,cruise_local_end_time,priority,address,
      notes,estimated_cost,currency,needs_confirmation,weather_dependent,
      bad_weather_alternative,visited,sort_order,status,timezone,time_storage_version
    )
    values(
      v_trip_id,v_day_id,v_owner_id,
      a->>'title',coalesce(a->>'category','Other'),
      nullif(a->>'start','')::time,nullif(a->>'end','')::time,
      coalesce(a->>'priority','Recommended'),
      nullif(a->>'address',''),
      nullif(a->>'notes',''),
      nullif(a->>'estimated_cost','')::numeric,
      'AUD',
      coalesce((a->>'needs_confirmation')::boolean,false),
      coalesce((a->>'weather_dependent')::boolean,false),
      nullif(a->>'bad_weather_alternative',''),
      false,v_sort,'planned','Australia/Sydney',2
    );
  end loop;

  for item in select jsonb_array_elements_text(d->'shopping')
  loop
    insert into public.cruise_port_shopping_items(
      cruise_port_day_id,trip_id,item_name,currency
    )
    values(v_day_id,v_trip_id,item,'AUD');
  end loop;

  raise notice 'Eden Cruise Port Day attached to trip %.',v_trip_id;
end $$;
