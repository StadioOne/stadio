-- Add foreign key constraint from user_roles to profiles for PostgREST joins
ALTER TABLE public.user_roles
ADD CONSTRAINT fk_user_roles_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;