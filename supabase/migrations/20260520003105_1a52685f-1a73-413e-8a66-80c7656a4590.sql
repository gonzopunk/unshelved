create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  -- existing 7 books
  b1 uuid := gen_random_uuid();
  b2 uuid := gen_random_uuid();
  b3 uuid := gen_random_uuid();
  b4 uuid := gen_random_uuid();
  b5 uuid := gen_random_uuid();
  b6 uuid := gen_random_uuid();
  b7 uuid := gen_random_uuid();
  -- new 15 books
  b8  uuid := gen_random_uuid();
  b9  uuid := gen_random_uuid();
  b10 uuid := gen_random_uuid();
  b11 uuid := gen_random_uuid();
  b12 uuid := gen_random_uuid();
  b13 uuid := gen_random_uuid();
  b14 uuid := gen_random_uuid();
  b15 uuid := gen_random_uuid();
  b16 uuid := gen_random_uuid();
  b17 uuid := gen_random_uuid();
  b18 uuid := gen_random_uuid();
  b19 uuid := gen_random_uuid();
  b20 uuid := gen_random_uuid();
  b21 uuid := gen_random_uuid();
  b22 uuid := gen_random_uuid();
  -- existing reference books
  r1 uuid := gen_random_uuid();
  r2 uuid := gen_random_uuid();
  r3 uuid := gen_random_uuid();
  r4 uuid := gen_random_uuid();
  r5 uuid := gen_random_uuid();
  r6 uuid := gen_random_uuid();
  -- new reference books
  r7 uuid := gen_random_uuid();  -- Cloud Atlas
  r8 uuid := gen_random_uuid();  -- M Train
  r9 uuid := gen_random_uuid();  -- The Great Gatsby
  -- existing highlight
  h1 uuid := gen_random_uuid();
  -- new highlights
  h2  uuid := gen_random_uuid();
  h3  uuid := gen_random_uuid();
  h4  uuid := gen_random_uuid();
  h5  uuid := gen_random_uuid();
  h6  uuid := gen_random_uuid();
  h7  uuid := gen_random_uuid();
  h8  uuid := gen_random_uuid();
  h9  uuid := gen_random_uuid();
  h10 uuid := gen_random_uuid();
  h11 uuid := gen_random_uuid();
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  -- Existing 7 books (preserved exactly)
  insert into public.books (id, user_id, title, author, format, cover_color, cover_text_color, bookmark_color, is_sample) values
    (b1, new.id, 'The Overstory', 'Richard Powers', 'print', '#1F5266', '#FAFBF3', '#D17648', true),
    (b2, new.id, 'Piranesi', 'Susanna Clarke', 'ebook', '#5DA8D5', '#1F2630', '#1F5266', true),
    (b3, new.id, 'Project Hail Mary', 'Andy Weir', 'audiobook', '#D17648', '#FAFBF3', '#1F5266', true),
    (b4, new.id, 'Pachinko', 'Min Jin Lee', 'print', '#6FB37A', '#1F2630', '#D17648', true),
    (b5, new.id, 'Klara and the Sun', 'Kazuo Ishiguro', 'print', '#FAFBF3', '#1F2630', '#5DA8D5', true),
    (b6, new.id, 'Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 'ebook', '#2D6A95', '#FAFBF3', '#D17648', true),
    (b7, new.id, 'A Gentleman in Moscow', 'Amor Towles', 'audiobook', '#1F2630', '#EEEEE3', '#D17648', true);

  -- New 15 books
  insert into public.books (id, user_id, title, author, format, cover_color, cover_text_color, bookmark_color, is_sample) values
    (b8,  new.id, 'The Brothers Karamazov', 'Fyodor Dostoevsky', 'print',     '#1F2630', '#EEEEE3', '#D17648', true),
    (b9,  new.id, 'Just Kids', 'Patti Smith', 'audiobook',                    '#FAFBF3', '#1F2630', '#D17648', true),
    (b10, new.id, 'The Argonauts', 'Maggie Nelson', 'ebook',                  '#D17648', '#FAFBF3', '#1F5266', true),
    (b11, new.id, 'Sea of Tranquility', 'Emily St. John Mandel', 'ebook',     '#5DA8D5', '#1F2630', '#1F5266', true),
    (b12, new.id, 'Bluets', 'Maggie Nelson', 'print',                         '#2D6A95', '#FAFBF3', '#5DA8D5', true),
    (b13, new.id, 'The Left Hand of Darkness', 'Ursula K. Le Guin', 'print',  '#1F5266', '#FAFBF3', '#5DA8D5', true),
    (b14, new.id, 'Educated', 'Tara Westover', 'audiobook',                   '#6FB37A', '#1F2630', '#D17648', true),
    (b15, new.id, 'Trust', 'Hernan Diaz', 'ebook',                            '#1F2630', '#EEEEE3', '#D17648', true),
    (b16, new.id, 'Severance', 'Ling Ma', 'print',                            '#D17648', '#FAFBF3', '#1F2630', true),
    (b17, new.id, 'The Goldfinch', 'Donna Tartt', 'ebook',                    '#FAFBF3', '#1F2630', '#D17648', true),
    (b18, new.id, 'Bewilderment', 'Richard Powers', 'audiobook',              '#2D6A95', '#FAFBF3', '#6FB37A', true),
    (b19, new.id, 'Fates and Furies', 'Lauren Groff', 'print',                '#1F5266', '#FAFBF3', '#D17648', true),
    (b20, new.id, 'The Light Years', 'Chris Rush', 'ebook',                   '#6FB37A', '#1F2630', '#1F5266', true),
    (b21, new.id, 'The Wager', 'David Grann', 'audiobook',                    '#1F2630', '#EEEEE3', '#5DA8D5', true),
    (b22, new.id, 'A Little Life', 'Hanya Yanagihara', 'print',               '#D17648', '#FAFBF3', '#1F2630', true);

  -- Existing 7 user_books (preserved exactly)
  insert into public.user_books (user_id, book_id, status, current_page, total_pages, current_seconds, total_seconds, progress_pct, started_at, finished_at, rating, board_position) values
    (new.id, b1, 'reading', 142, 502, null, null, 28, now() - interval '5 days', null, null, 0),
    (new.id, b2, 'reading', 88, 272, null, null, 32, now() - interval '2 days', null, null, 1),
    (new.id, b3, 'reading', 0, 0, 16200, 36000, 45, now() - interval '1 day', null, null, 2),
    (new.id, b4, 'want', 0, 490, null, null, 0, null, null, null, 0),
    (new.id, b5, 'later', 0, 320, null, null, 0, null, null, null, 0),
    (new.id, b6, 'loved', 401, 401, null, null, 100, now() - interval '40 days', now() - interval '10 days', 5, 0),
    (new.id, b7, 'liked', 462, 462, null, null, 100, now() - interval '70 days', now() - interval '50 days', 4, 0);

  -- New 15 user_books
  insert into public.user_books (user_id, book_id, status, current_page, total_pages, current_seconds, total_seconds, progress_pct, started_at, finished_at, rating, board_position, paused) values
    (new.id, b8,  'reading', 220, 796, null, null, 28, now() - interval '14 days', null, null, 3, false),
    (new.id, b9,  'reading', 0, 0, 9000, 36000, 25, now() - interval '8 days', null, null, 4, false),
    (new.id, b10, 'reading', 30, 160, null, null, 19, now() - interval '25 days', null, null, 5, true),
    (new.id, b11, 'loved',   259, 259, null, null, 100, now() - interval '40 days', now() - interval '20 days', 5, 0, false),
    (new.id, b12, 'loved',   95, 95,   null, null, 100, now() - interval '120 days', now() - interval '95 days', 5, 1, false),
    (new.id, b13, 'liked',   304, 304, null, null, 100, now() - interval '170 days', now() - interval '140 days', 4, 0, false),
    (new.id, b14, 'liked',   0, 0, 36000, 36000, 100, now() - interval '210 days', now() - interval '180 days', 4, 1, false),
    (new.id, b15, 'liked',   416, 416, null, null, 100, now() - interval '250 days', now() - interval '220 days', 4, 2, false),
    (new.id, b16, 'meh',     291, 291, null, null, 100, now() - interval '290 days', now() - interval '260 days', 3, 0, false),
    (new.id, b17, 'meh',     771, 771, null, null, 100, now() - interval '350 days', now() - interval '310 days', 3, 1, false),
    (new.id, b18, 'dnf',     0, 0, 7200, 32400, 22, now() - interval '50 days', now() - interval '30 days', 2, 0, false),
    (new.id, b19, 'dnf',     112, 391, null, null, 28, now() - interval '95 days', now() - interval '75 days', 2, 1, false),
    (new.id, b20, 'want',    0, 320, null, null, 0, null, null, null, 1, false),
    (new.id, b21, 'want',    0, 0, 0, 32400, 0, null, null, null, 2, false),
    (new.id, b22, 'later',   0, 720, null, null, 0, null, null, null, 1, false);

  -- Existing highlights (preserved exactly) + 10 new
  insert into public.highlights (id, user_id, book_id, quote_text, page_number, is_sample) values
    (h1,  new.id, b1,  'The best arguments in the world won''t change a person''s mind. The only thing that can do that is a good story.', 312, true),
    (h2,  new.id, b2,  'The Beauty of the House is immeasurable; its Kindness infinite.', 5, true),
    (h3,  new.id, b8,  'The mystery of human existence lies not in just staying alive, but in finding something to live for.', 259, true),
    (h4,  new.id, b8,  'Above all, don''t lie to yourself.', 44, true),
    (h5,  new.id, b9,  'In my low periods, I wondered what was the point of creating art.', 65, true),
    (h6,  new.id, b10, 'A good empath knows what is theirs and what is not.', 41, true),
    (h7,  new.id, b11, 'No star burns forever.', 195, true),
    (h8,  new.id, b12, 'Suppose I were to begin by saying that I had fallen in love with a color.', 1, true),
    (h9,  new.id, b13, 'Light is the left hand of darkness, and darkness the right hand of light.', 233, true),
    (h10, new.id, b14, 'You can love someone and still choose to say goodbye to them.', 304, true),
    (h11, new.id, b15, 'A fortune is always a fiction.', 88, true);
  -- Goldfinch quote
  insert into public.highlights (id, user_id, book_id, quote_text, page_number, is_sample) values
    (gen_random_uuid(), new.id, b17, 'Caring too much for objects can destroy you.', 720, true);

  -- Existing 6 reference books + 3 new
  insert into public.reference_books (id, user_id, title, author, is_sample) values
    (r1, new.id, 'The Odyssey', 'Homer', true),
    (r2, new.id, 'Walden', 'Henry David Thoreau', true),
    (r3, new.id, 'The Magician''s Nephew', 'C.S. Lewis', true),
    (r4, new.id, 'East of Eden', 'John Steinbeck', true),
    (r5, new.id, 'The Martian', 'Andy Weir', true),
    (r6, new.id, 'Frankenstein', 'Mary Shelley', true),
    (r7, new.id, 'Cloud Atlas', 'David Mitchell', true),
    (r8, new.id, 'M Train', 'Patti Smith', true),
    (r9, new.id, 'The Great Gatsby', 'F. Scott Fitzgerald', true);

  -- Existing 10 connections (preserved exactly) + 8 new
  insert into public.connections (user_id, source_kind, source_id, target_kind, target_id, why, tags, is_sample) values
    (new.id, 'book', b1, 'reference_book', r2, 'Both ask whether trees and woods deserve our moral attention.', array['nature','ethics'], true),
    (new.id, 'book', b2, 'book', b5, 'Solitary narrators piecing together a world they only half understand.', array['voice','solitude'], true),
    (new.id, 'book', b2, 'reference_book', r3, 'Vast halls and statues — Piranesi feels like a grown-up Wood Between the Worlds.', array['architecture'], true),
    (new.id, 'book', b3, 'reference_book', r5, 'Weir doing Weir: one man, impossible odds, lots of math.', array['author'], true),
    (new.id, 'book', b4, 'reference_book', r4, 'Multigenerational family epics about land, identity, and inheritance.', array['family','epic'], true),
    (new.id, 'book', b5, 'reference_book', r6, 'A made being trying to understand the humans who made her.', array['ai','creation'], true),
    (new.id, 'book', b6, 'book', b5, 'Friendship and creation as the things we keep building each other into.', array['friendship'], true),
    (new.id, 'book', b7, 'reference_book', r4, 'Confined men finding the whole human comedy in a single setting.', array['confinement'], true),
    (new.id, 'highlight', h1, 'reference_book', r2, 'Powers'' line about story echoes Thoreau''s belief that we live by the tales we tell of the woods.', array['story','nature'], true),
    (new.id, 'book', b1, 'book', b4, 'Both novels braid many lives into one slow-growing whole.', array['structure'], true),
    -- 8 new connections
    (new.id, 'book', b11, 'book', b3, 'Quiet melancholic SF where one figure carries the weight of a whole timeline.', array['sf','time'], true),
    (new.id, 'book', b11, 'reference_book', r7, 'Nested timelines that rhyme rather than repeat.', array['structure','time'], true),
    (new.id, 'book', b13, 'book', b5, 'Outsider narrators decoding a culture not built for them.', array['other','voice'], true),
    (new.id, 'book', b12, 'book', b10, 'Maggie Nelson in two registers — fragment vs. fugue.', array['author','essay'], true),
    (new.id, 'book', b9, 'reference_book', r8, 'Two halves of one autobiography: youth, then grief.', array['memoir'], true),
    (new.id, 'book', b15, 'reference_book', r9, 'American capital as the unreliable narrator.', array['money','americana'], true),
    (new.id, 'book', b14, 'book', b8, 'Faith inherited and faith fought for.', array['family','belief'], true),
    (new.id, 'highlight', h8, 'book', b5, 'Both treat color and light as moral attention.', array['color','perception'], true);

  perform public.seed_tag_axes(new.id);

  -- Axis values for 12 books (pace scale, mood multi, pov single)
  -- Overstory
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b1, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 2);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b1, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['melancholy','hopeful']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b1, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['multi-POV']);

  -- Piranesi
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b2, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 3);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b2, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['dreamy','unsettling']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b2, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['1st']);

  -- Project Hail Mary
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b3, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 5);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b3, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['propulsive','hopeful']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b3, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['1st']);

  -- Pachinko
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b4, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 3);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b4, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['melancholy','tender']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b4, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['omniscient']);

  -- Klara
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b5, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 3);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b5, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['tender','melancholy']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b5, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['1st']);

  -- Tomorrow³
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b6, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 4);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b6, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['tender','propulsive']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b6, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['close 3rd']);

  -- Gentleman in Moscow
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b7, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 2);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b7, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['cozy','tender']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b7, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['close 3rd']);

  -- Karamazov
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b8, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 1);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b8, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['brutal','hopeful']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b8, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['omniscient']);

  -- Sea of Tranquility
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b11, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 4);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b11, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['dreamy','melancholy']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b11, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['multi-POV']);

  -- Left Hand of Darkness
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b13, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 2);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b13, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['dreamy','unsettling']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b13, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['1st']);

  -- Trust
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b15, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 3);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b15, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['unsettling','propulsive']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b15, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['multi-POV']);

  -- Goldfinch
  insert into public.book_axis_values (user_id, book_id, axis_id, scale_value)
    values (new.id, b17, (select id from public.tag_axes where user_id = new.id and key = 'pace'), 2);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b17, (select id from public.tag_axes where user_id = new.id and key = 'mood'), array['melancholy','brutal']);
  insert into public.book_axis_values (user_id, book_id, axis_id, values)
    values (new.id, b17, (select id from public.tag_axes where user_id = new.id and key = 'pov'), array['1st']);

  return new;
end;
$function$;
