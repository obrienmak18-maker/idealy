-- Le builder persiste des frames incrémentales : contenu de fichier et journaux.
ALTER TABLE public.mission_file_events
  DROP CONSTRAINT IF EXISTS mission_file_events_event_type_check;

ALTER TABLE public.mission_file_events
  ADD CONSTRAINT mission_file_events_event_type_check CHECK (event_type IN (
    'mission_started', 'agent_started', 'agent_completed', 'agent_failed',
    'file_started', 'file_content', 'file_saved', 'build_log',
    'validation_result', 'mission_completed', 'mission_error'
  ));
