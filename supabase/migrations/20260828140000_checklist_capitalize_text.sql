-- Padroniza textos de checklist: primeira letra alfabética em maiúscula.

create or replace function public.capitalize_checklist_text(input text)
returns text
language plpgsql
immutable
as $$
declare
  i int := 1;
  c text;
  len int;
begin
  if input is null then
    return null;
  end if;

  len := char_length(input);
  while i <= len loop
    c := substr(input, i, 1);
    if c ~ '[[:alpha:]]' then
      return substr(input, 1, i - 1) || upper(c) || substr(input, i + 1);
    end if;
    i := i + 1;
  end loop;

  return input;
end;
$$;

update public.checklist_template_items
set description = public.capitalize_checklist_text(description)
where description is not null
  and description <> public.capitalize_checklist_text(description);

update public.checklist_template_sections
set title = public.capitalize_checklist_text(title)
where title is not null
  and title <> public.capitalize_checklist_text(title);

update public.checklist_custom_items
set description = public.capitalize_checklist_text(description)
where description is not null
  and description <> public.capitalize_checklist_text(description);

update public.checklist_custom_sections
set title = public.capitalize_checklist_text(title)
where title is not null
  and title <> public.capitalize_checklist_text(title);

update public.checklist_workspace_items
set description = public.capitalize_checklist_text(description)
where description is not null
  and description <> public.capitalize_checklist_text(description);

update public.checklist_workspace_sections
set title = public.capitalize_checklist_text(title)
where title is not null
  and title <> public.capitalize_checklist_text(title);

drop function public.capitalize_checklist_text(text);
