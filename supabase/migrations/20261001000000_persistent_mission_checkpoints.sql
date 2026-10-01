-- Persistent, owner-scoped checkpoints for mission workspaces.
-- Snapshot contents are kept server-side in the existing missions.snapshots column;
-- public route responses expose metadata only.

CREATE OR REPLACE FUNCTION public.create_mission_checkpoint(
  p_mission_id UUID,
  p_snapshot JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_snapshots JSONB;
  next_snapshots JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_snapshot IS NULL
    OR jsonb_typeof(p_snapshot) <> 'object'
    OR COALESCE(p_snapshot->>'id', '') = ''
    OR jsonb_typeof(p_snapshot->'files') <> 'array' THEN
    RAISE EXCEPTION 'Invalid checkpoint snapshot';
  END IF;

  SELECT snapshots
    INTO current_snapshots
    FROM public.missions
   WHERE id = p_mission_id
     AND user_id = auth.uid()
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission not found';
  END IF;

  SELECT COALESCE(jsonb_agg(item.value ORDER BY item.ordinality), '[]'::jsonb)
    INTO next_snapshots
    FROM jsonb_array_elements(jsonb_build_array(p_snapshot) || COALESCE(current_snapshots, '[]'::jsonb))
         WITH ORDINALITY AS item(value, ordinality)
   WHERE item.ordinality <= 20;

  UPDATE public.missions
     SET snapshots = next_snapshots
   WHERE id = p_mission_id;

  RETURN p_snapshot;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_mission_checkpoint(
  p_mission_id UUID,
  p_checkpoint_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_snapshots JSONB;
  selected_snapshot JSONB;
  file_snapshot JSONB;
  file_path TEXT;
  file_content TEXT;
  file_language TEXT;
  file_checksum TEXT;
  next_version INTEGER;
  restored_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF COALESCE(p_checkpoint_id, '') = '' THEN
    RAISE EXCEPTION 'Checkpoint id required';
  END IF;

  SELECT snapshots
    INTO current_snapshots
    FROM public.missions
   WHERE id = p_mission_id
     AND user_id = auth.uid()
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission not found';
  END IF;

  SELECT item.value
    INTO selected_snapshot
    FROM jsonb_array_elements(COALESCE(current_snapshots, '[]'::jsonb)) AS item(value)
   WHERE item.value->>'id' = p_checkpoint_id
   LIMIT 1;

  IF selected_snapshot IS NULL OR jsonb_typeof(selected_snapshot->'files') <> 'array' THEN
    RAISE EXCEPTION 'Checkpoint not found';
  END IF;

  FOR file_snapshot IN
    SELECT item.value FROM jsonb_array_elements(selected_snapshot->'files') AS item(value)
  LOOP
    file_path := file_snapshot->>'path';
    file_content := file_snapshot->>'content';
    file_language := NULLIF(file_snapshot->>'language', '');
    file_checksum := NULLIF(file_snapshot->>'checksum', '');

    IF file_path IS NULL
      OR file_path = ''
      OR file_path LIKE '/%'
      OR file_path LIKE '%..%'
      OR file_content IS NULL THEN
      RAISE EXCEPTION 'Checkpoint contains an invalid file';
    END IF;

    SELECT COALESCE(MAX(version), 0) + 1
      INTO next_version
      FROM public.mission_files
     WHERE mission_id = p_mission_id
       AND path = file_path;

    INSERT INTO public.mission_files(
      mission_id, path, content, language, version, status, checksum, source
    ) VALUES (
      p_mission_id, file_path, file_content, file_language, next_version,
      'saved', file_checksum, 'system'
    );

    PERFORM public.append_mission_file_event(
      p_mission_id,
      'file_saved',
      file_path,
      next_version,
      jsonb_build_object('checkpointId', p_checkpoint_id, 'restored', true),
      format('checkpoint:%s:%s:%s', p_checkpoint_id, file_path, next_version)
    );

    restored_count := restored_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'checkpointId', p_checkpoint_id,
    'restoredFilesCount', restored_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_mission_checkpoint(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_mission_checkpoint(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_mission_checkpoint(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_mission_checkpoint(UUID, TEXT) TO authenticated;
