-- Reorder positions for existing users
UPDATE public.tag_axes SET position = 0 WHERE key = 'weight'  AND built_in;
UPDATE public.tag_axes SET position = 1 WHERE key = 'pace'    AND built_in;
UPDATE public.tag_axes SET position = 2 WHERE key = 'spice'   AND built_in;
UPDATE public.tag_axes SET position = 3 WHERE key = 'genre'   AND built_in;
UPDATE public.tag_axes SET position = 4 WHERE key = 'mood'    AND built_in;
UPDATE public.tag_axes SET position = 5 WHERE key = 'pov'     AND built_in;
UPDATE public.tag_axes SET position = 6 WHERE key = 'tense'   AND built_in;
UPDATE public.tag_axes SET position = 7 WHERE key = 'content_warnings' AND built_in;
UPDATE public.tag_axes SET position = 8 WHERE key = 'tropes'  AND built_in;
UPDATE public.tag_axes SET position = 9 WHERE key = 'setting_era' AND built_in;
UPDATE public.tag_axes SET position = 10 WHERE key = 'form'   AND built_in;

-- Update seed function to use new ordering
CREATE OR REPLACE FUNCTION public.seed_tag_axes(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.tag_axes (user_id, key, label, kind, scale_min, scale_max, values, open, position, built_in) VALUES
    (_user_id, 'weight', 'Weight', 'scale', 1, 5, '{}', false, 0, true),
    (_user_id, 'pace', 'Pace', 'scale', 1, 5, '{}', false, 1, true),
    (_user_id, 'spice', 'Spice', 'scale', 0, 5, '{}', false, 2, true),
    (_user_id, 'genre', 'Genre', 'multi', null, null,
      array['Fiction','Nonfiction','Literary Fiction','Science Fiction','Fantasy','Mystery','Thriller','Historical Fiction','Biography','Short Stories','Poetry','Essays'], true, 3, true),
    (_user_id, 'mood', 'Mood', 'multi', null, null,
      array['cozy','melancholy','propulsive','dreamy','brutal','hopeful','weird','comforting','unsettling','tender'], true, 4, true),
    (_user_id, 'pov', 'POV', 'single', null, null,
      array['1st','close 3rd','omniscient','multi-POV','2nd','epistolary'], false, 5, true),
    (_user_id, 'tense', 'Tense', 'single', null, null,
      array['past','present','mixed'], false, 6, true),
    (_user_id, 'content_warnings', 'Content warnings', 'multi', null, null,
      array['sexual assault','overdose','suicide','animal harm','child harm','graphic violence','eating disorders'], true, 7, true),
    (_user_id, 'tropes', 'Tropes', 'multi', null, null,
      array['enemies-to-lovers','found family','locked room','chosen one','slow burn','heist','quest','portal fantasy'], true, 8, true),
    (_user_id, 'setting_era', 'Setting era', 'single', null, null,
      array['contemporary','near-future','far-future','historical','secondary-world','ahistorical'], false, 9, true),
    (_user_id, 'form', 'Form', 'single', null, null,
      array['novel','novella','short stories','essays','poetry','memoir','hybrid'], false, 10, true)
  ON CONFLICT (user_id, key) DO NOTHING;
END;
$function$;