-- Authorize private Realtime Presence only for the owner of an Idealy mission
-- associated with the chat room id.
--
-- Supabase already manages RLS on realtime.messages; do not alter it here.

DROP POLICY IF EXISTS "idealy_mission_owner_can_receive_presence" ON realtime.messages;
CREATE POLICY "idealy_mission_owner_can_receive_presence"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'presence'
  AND EXISTS (
    SELECT 1
    FROM public.missions AS m
    WHERE m.user_id = (select auth.uid())
      AND (m.brief ->> 'chatId') = split_part(realtime.topic(), ':', 2)
  )
);

DROP POLICY IF EXISTS "idealy_mission_owner_can_publish_presence" ON realtime.messages;
CREATE POLICY "idealy_mission_owner_can_publish_presence"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension = 'presence'
  AND EXISTS (
    SELECT 1
    FROM public.missions AS m
    WHERE m.user_id = (select auth.uid())
      AND (m.brief ->> 'chatId') = split_part(realtime.topic(), ':', 2)
  )
);
