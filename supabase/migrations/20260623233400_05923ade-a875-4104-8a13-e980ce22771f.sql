UPDATE public.tag_axes
SET label = 'Spice'
WHERE key = 'spice' AND label LIKE '%🌶%';

CREATE OR REPLACE FUNCTION public.seed_tag_axes(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tag_axes (user_id, key, label, kind, scale_min, scale_max, values, open, position, built_in) VALUES
    (_user_id, 'spice', 'Spice', 'scale', 0, 5, '{}', false, 0, true),
    (_user_id, 'pace', 'Pace', 'scale', 1, 5, '{}', false, 1, true),
    (_user_id, 'mood', 'Mood', 'multi', null, null,
      array['cozy','melancholy','propulsive','dreamy','brutal','hopeful','weird','comforting','unsettling','tender'], true, 2, true),
    (_user_id, 'pov', 'POV', 'single', null, null,
      array['1st','close 3rd','omniscient','multi-POV','2nd','epistolary'], false, 3, true),
    (_user_id, 'tense', 'Tense', 'single', null, null,
      array['past','present','mixed'], false, 4, true),
    (_user_id, 'content_warnings', 'Content warnings', 'multi', null, null,
      array['sexual assault','overdose','suicide','animal harm','child harm','graphic violence','eating disorders'], true, 5, true),
    (_user_id, 'tropes', 'Tropes', 'multi', null, null,
      array['enemies-to-lovers','found family','locked room','chosen one','slow burn','heist','quest','portal fantasy'], true, 6, true),
    (_user_id, 'setting_era', 'Setting era', 'single', null, null,
      array['contemporary','near-future','far-future','historical','secondary-world','ahistorical'], false, 7, true),
    (_user_id, 'form', 'Form', 'single', null, null,
      array['novel','novella','short stories','essays','poetry','memoir','hybrid'], false, 8, true)
  ON CONFLICT (user_id, key) DO NOTHING;
END;
$$;