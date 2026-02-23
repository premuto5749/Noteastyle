-- Helper functions for shop membership checks

CREATE OR REPLACE FUNCTION is_shop_member(check_user_id UUID, check_shop_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shop_members
    WHERE user_id = check_user_id AND shop_id = check_shop_id AND is_active = true
  );
END; $$;

CREATE OR REPLACE FUNCTION get_shop_role(check_user_id UUID, check_shop_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE member_role TEXT;
BEGIN
  SELECT role INTO member_role FROM shop_members
  WHERE user_id = check_user_id AND shop_id = check_shop_id AND is_active = true;
  RETURN member_role;
END; $$;
