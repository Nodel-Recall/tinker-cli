CREATE SCHEMA private;

-- get the columns name and datatype from the chosen table
CREATE OR REPLACE FUNCTION get_columns_from_table(schema_name TEXT, p_table_name TEXT)
  RETURNS TABLE (col TEXT, data_type TEXT)
  AS $$
  BEGIN
    RETURN QUERY
    SELECT column_name::TEXT, udt_name::TEXT
    FROM information_schema.columns
    WHERE table_name = p_table_name
    ORDER BY ordinal_position;
  END;
  $$
  LANGUAGE plpgsql;


-- get the constraints of each column in a table
CREATE OR REPLACE FUNCTION get_column_constraints(schema_name TEXT, p_table_name TEXT)
  RETURNS TABLE (column_name TEXT, constraint_name TEXT, nullable TEXT, constraint_type TEXT, column_default TEXT, check_clause TEXT)
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
        col.column_name::TEXT,
        cons.constraint_name::TEXT,
        CASE
            WHEN col.is_nullable = 'NO' THEN 'NOT NULL'
            ELSE ''
        END,
        cons.constraint_type::TEXT,
        col.column_default::TEXT,
        chcons.check_clause::TEXT
    FROM
        information_schema.columns AS col
    LEFT JOIN
        information_schema.constraint_column_usage AS ccu ON col.column_name = ccu.column_name AND col.table_name = ccu.table_name
    LEFT JOIN
        information_schema.table_constraints AS cons ON ccu.constraint_name = cons.constraint_name
    LEFT JOIN 
        information_schema.check_constraints AS chcons ON chcons.constraint_name = cons.constraint_name
    WHERE
        col.table_name = p_table_name;
  END;
  $$ LANGUAGE plpgsql;


-- adding descriptions to a table

CREATE OR REPLACE FUNCTION add_table_comment(p_schema_name TEXT, p_table_name TEXT, p_comment TEXT)
  RETURNS BOOL
  AS $$
BEGIN
    EXECUTE 'COMMENT ON TABLE ' || quote_ident(p_schema_name) || '.' || quote_ident(p_table_name) || ' IS ' || quote_literal(p_comment);
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- viewing the table description

CREATE OR REPLACE FUNCTION view_table_description(p_schema_name TEXT, p_table_name TEXT)
  RETURNS TEXT
  AS $$
DECLARE
    v_description TEXT;
BEGIN
    SELECT description
    INTO v_description
    FROM pg_description
    WHERE objoid = (p_schema_name || '.' || p_table_name)::regclass;

    RETURN v_description;
END;
$$ LANGUAGE plpgsql;


-- update a table description

CREATE OR REPLACE FUNCTION update_table_description(p_schema_name text, p_table_name text, new_description text)
RETURNS BOOLEAN AS
$$
BEGIN
    -- Check if the table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables AS st 
        WHERE st.table_schema = p_schema_name AND st.table_name = p_table_name
    ) THEN
        -- Build and execute the dynamic SQL statement to update the table's description
        EXECUTE 'COMMENT ON TABLE ' || quote_ident(p_schema_name) || '.' || quote_ident(p_table_name) || ' IS ' || quote_literal(new_description);
        RETURN TRUE;
    ELSE
        -- Table does not exist
        RETURN FALSE;
    END IF;
END;
$$
LANGUAGE plpgsql;



-- creating a new table, takes an arrays of statements for the columns
CREATE OR REPLACE FUNCTION create_table(
  schema_name text,
  table_name text,
  columns text[],
  primary_key_column text
) RETURNS BOOL AS $$
DECLARE
  column_list text;
  sql_stmt text;
BEGIN
  -- Create a comma-separated list of columns
  column_list := array_to_string(columns, ', ');

  -- Build the dynamic SQL statement
  sql_stmt := format('CREATE TABLE %I.%I (%s, PRIMARY KEY (%I))', schema_name, table_name, column_list, primary_key_column);
  -- Execute the dynamic SQL statement
  EXECUTE sql_stmt;

  -- Return void
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- deleting a table
CREATE OR REPLACE FUNCTION delete_table(schema_name TEXT, table_name text) RETURNS BOOL AS $$
DECLARE
  sql_stmt text;
BEGIN
  -- Build the dynamic SQL statement
  sql_stmt := format('DROP TABLE IF EXISTS %I.%I', schema_name, table_name);

  -- Execute the dynamic SQL statement
  EXECUTE sql_stmt;

  -- Returns true
  RETURN true;
END;
$$ LANGUAGE plpgsql;


-- edit table name
CREATE OR REPLACE FUNCTION update_table_name(schema_name text, old_table_name text, new_table_name text)
RETURNS BOOLEAN AS
$$
DECLARE
    sql_query text;
BEGIN
    -- Check if the old table exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = schema_name AND table_name = old_table_name
    ) THEN
        -- Check if the new table name does not exist
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = schema_name AND table_name = new_table_name
        ) THEN
            -- Build and execute the dynamic SQL statement
            sql_query := 'ALTER TABLE ' || quote_ident(schema_name) || '.' || quote_ident(old_table_name) ||
                         ' RENAME TO ' || quote_ident(new_table_name);
            EXECUTE sql_query;
            RETURN TRUE;
        ELSE
            -- New table name already exists
            RETURN FALSE;
        END IF;
    ELSE
        -- Old table does not exist
        RETURN FALSE;
    END IF;
END;
$$
LANGUAGE plpgsql;


-- Create an event trigger function
CREATE OR REPLACE FUNCTION pgrst_watch() RETURNS event_trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

-- This event trigger will fire after every ddl_command_end event
CREATE EVENT TRIGGER pgrst_watch
  ON ddl_command_end
  EXECUTE PROCEDURE pgrst_watch();

-- adds columns to an existing table
CREATE OR REPLACE FUNCTION add_columns_to_table(
  schema_name TEXT,
  table_name TEXT,
  column_definitions TEXT
) RETURNS BOOL
  LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I.%I ADD COLUMN %s', schema_name, table_name, column_definitions);
  RETURN true;
END;
$$;

-- adds foreign key constraints to an existing table

-- CREATE OR REPLACE FUNCTION add_foreign_key_constraint(
--   table_name TEXT,
--   constraint_name TEXT,
--   column_name TEXT,
--   referenced_table_name TEXT,
--   referenced_column_name TEXT
-- ) RETURNS BOOL
--   LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I)',
--                  table_name, constraint_name, column_name, referenced_table_name, referenced_column_name);
--   RETURN true;               
-- END;
-- $$;

-- add a schema to the project db
-- CREATE OR REPLACE FUNCTION create_schema(schema_name TEXT)
--   RETURNS BOOL
--   LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
--   RETURN  true;
-- END;
-- $$;

