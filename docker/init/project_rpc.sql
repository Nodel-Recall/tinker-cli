
-- get the columns name and datatype from the chosen table
CREATE OR REPLACE FUNCTION get_columns_from_table(p_table_name TEXT)
  RETURNS TABLE (col TEXT, data_type TEXT)
  AS $$
  BEGIN
    RETURN QUERY
    SELECT column_name::TEXT, udt_name::TEXT
    FROM information_schema.columns
    WHERE table_name = p_table_name;
  END;
  $$ LANGUAGE plpgsql;

-- get the constraints of each column in a table
CREATE OR REPLACE FUNCTION get_column_constraints(p_table_name TEXT)
  RETURNS TABLE (column_name TEXT, constraint_name TEXT, nullable TEXT, constraint_type TEXT)
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
        cons.constraint_type::TEXT
    FROM
        information_schema.columns AS col
    LEFT JOIN
        information_schema.constraint_column_usage AS ccu ON col.column_name = ccu.column_name AND col.table_name = ccu.table_name
    LEFT JOIN
        information_schema.table_constraints AS cons ON ccu.constraint_name = cons.constraint_name
    WHERE
        col.table_name = p_table_name;
  END;
  $$ LANGUAGE plpgsql;

-- adding descriptions to a table

CREATE OR REPLACE FUNCTION add_table_comment(p_table_name TEXT, p_comment TEXT)
  RETURNS VOID
  AS $$
  BEGIN
    EXECUTE 'COMMENT ON TABLE ' || p_table_name || ' IS ' || quote_literal(p_comment);
  END;
  $$ LANGUAGE plpgsql;

-- viewing the table description

CREATE OR REPLACE FUNCTION view_table_description(p_table_name TEXT)
  RETURNS TEXT
  AS $$
  DECLARE
    v_description TEXT;
  BEGIN
    SELECT description
    INTO v_description
    FROM pg_description
    WHERE objoid = p_table_name::regclass;
    
    RETURN v_description;
  END;
  $$ LANGUAGE plpgsql;

-- creating a new table, takes an arrays of statements for the columns
CREATE OR REPLACE FUNCTION create_table(
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
  sql_stmt := format('CREATE TABLE %I (%s, PRIMARY KEY (%I))', table_name, column_list, primary_key_column);

  -- Execute the dynamic SQL statement
  EXECUTE sql_stmt;

  -- Return void
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- deleting a table
CREATE OR REPLACE FUNCTION delete_table(table_name text) RETURNS BOOL AS $$
DECLARE
  sql_stmt text;
BEGIN
  -- Build the dynamic SQL statement
  sql_stmt := format('DROP TABLE IF EXISTS %I', table_name);

  -- Execute the dynamic SQL statement
  EXECUTE sql_stmt;

  -- Returns true
  RETURN true;
END;
$$ LANGUAGE plpgsql;
