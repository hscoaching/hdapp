-- Séances d'une cliente sans appli, enregistrées dans le compte de Hugo :
-- elles sortent de ses stats, de sa progression et de ses badges.
alter table public.sessions add column if not exists for_name text;

-- Rattrape les séances déjà saisies avec le programme « Juliette » (compte Hugo).
update public.sessions s
set for_name = 'Juliette'
from public.programs p
where p.id = s.program_id
  and s.user_id = 'bb3ca7e6-9232-44be-98c5-5acf88cb7f9c'
  and p.name = 'Juliette'
  and s.for_name is null;
