
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
