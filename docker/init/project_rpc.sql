
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

