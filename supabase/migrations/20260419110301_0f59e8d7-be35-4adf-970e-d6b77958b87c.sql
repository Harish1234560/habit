-- Create admin user in auth.users with bcrypt-hashed password
DO $$
DECLARE
  admin_uid UUID;
  existing_uid UUID;
BEGIN
  SELECT id INTO existing_uid FROM auth.users WHERE email = 'nallapareddiharishkumarereddy@gmail.com';

  IF existing_uid IS NULL THEN
    admin_uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_uid,
      'authenticated',
      'authenticated',
      'nallapareddiharishkumarereddy@gmail.com',
      crypt('Harish@939238', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Admin"}',
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      admin_uid,
      jsonb_build_object('sub', admin_uid::text, 'email', 'nallapareddiharishkumarereddy@gmail.com'),
      'email',
      admin_uid::text,
      now(), now(), now()
    );
  ELSE
    admin_uid := existing_uid;
    -- Reset password just in case
    UPDATE auth.users
    SET encrypted_password = crypt('Harish@939238', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = admin_uid;
  END IF;

  -- Ensure profile exists
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (admin_uid, 'Admin')
  ON CONFLICT DO NOTHING;

  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;