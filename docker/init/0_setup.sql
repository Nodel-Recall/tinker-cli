-- Tinker DB setup
CREATE SCHEMA auth;

-- projects table where the secret is the same as the admin app db
CREATE TABLE projects (
    PRIMARY KEY (id),
    id     serial,
    name   VARCHAR(128) CONSTRAINT only_alphanumeric CHECK (name ~ '^[a-zA-Z][a-zA-Z0-9-]+$'),
    domain VARCHAR(255) NOT NULL UNIQUE
);

--private users table for Tinker backend
CREATE TABLE auth.users (
  email text PRIMARY KEY CHECK (email ~* '^.+@.+\..+$'::text),
  password text NOT NULL CHECK (length(password) < 512),
  username text UNIQUE NOT NULL,
  role  text NOT NULL
);

-- roles (authenticator, admin and anon) setup for frontend JWt
CREATE OR REPLACE FUNCTION create_authenticator_role() RETURNS VOID AS $$
BEGIN
  EXECUTE format('CREATE ROLE authenticator LOGIN PASSWORD %L NOINHERIT NOCREATEDB NOCREATEROLE NOSUPERUSER;', current_setting('app.jwt_secret'));
END;
$$ LANGUAGE plpgsql;

SELECT create_authenticator_role();

CREATE ROLE admin superuser LOGIN CREATEDB REPLICATION CREATEROLE;

GRANT admin TO authenticator;

CREATE ROLE anon NOINHERIT;

GRANT anon TO authenticator;

GRANT USAGE ON SCHEMA auth TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO anon;

-- backend JWT auth setup

-- needed pkg for encryption
create extension if not exists pgcrypto;

-- encrypt a password whenever a password is added / updated in the users table
create or replace function
auth.encrypt_password() returns trigger as $$
begin
  if tg_op = 'INSERT' or new.password <> old.password then
    new.password = crypt(new.password, gen_salt('bf'));
  end if;
  return new;
end
$$ language plpgsql;

-- this trigger is what whatches for insert or updates to passwords in users table
drop trigger if exists encrypt_password on auth.users;
create trigger encrypt_password
  before insert or update on auth.users
  for each row
  execute procedure auth.encrypt_password();

-- return type used in login function
CREATE TYPE auth.jwt AS (
  token text
);

-- then create extension for pgjwt
CREATE EXTENSION pgjwt;

-- login should be on your exposed (public) schema
-- login function takes email and password and returns the JWT if login successful
create or replace function
login(email text, password text) returns auth.jwt as $$
declare
  _role text;
  result auth.jwt;
begin
  -- check email and password
  select auth.user_role(email, password) into _role;

  if _role is null then
    raise invalid_password using message = 'invalid user or password';
  end if;

-- uses the pgjwt package to sign and create the JWT
  select sign(
      row_to_json(r), current_setting('app.jwt_secret')
    ) as token
    from (
      select _role as role, login.email as email,
         extract(epoch from now())::integer + 60*60 as exp
    ) r
    into result;
  return result;
end;
$$ language plpgsql security definer;

-- grant anon role access to login function
grant execute on function login(text,text) to anon;
