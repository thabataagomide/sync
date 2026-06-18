ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, username)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NULLIF(lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', ''), '\s+', '', 'g')), '')
  );
  RETURN NEW;
END;
$$;
