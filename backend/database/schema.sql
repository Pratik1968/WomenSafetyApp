-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  firebase_uid text NOT NULL UNIQUE,
  full_name character varying NOT NULL,
  email character varying UNIQUE,
  phone character varying NOT NULL UNIQUE,
  profile_photo_url text,
  date_of_birth date,
  gender USER-DEFINED,
  blood_group character varying,
  medical_notes text,
  password_hash text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.emergency_contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  phone character varying NOT NULL,
  relationship USER-DEFINED,
  priority smallint DEFAULT 1,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT emergency_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT emergency_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.devices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  device_id character varying UNIQUE,
  firebase_uid text,
  device_name character varying,
  device_model character varying,
  manufacturer character varying,
  platform character varying,
  os_version character varying,
  app_version character varying,
  fcm_token text,
  notification_enabled boolean DEFAULT true,
  is_active boolean DEFAULT true,
  last_active timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT devices_pkey PRIMARY KEY (id),
  CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.sos_incidents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::incident_status_enum,
  trigger_type USER-DEFINED NOT NULL,
  danger_score integer DEFAULT 0 CHECK (danger_score >= 0 AND danger_score <= 100),
  latitude double precision,
  longitude double precision,
  location USER-DEFINED,
  notes text,
  resolved_by uuid,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sos_incidents_pkey PRIMARY KEY (id),
  CONSTRAINT sos_incidents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT sos_incidents_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id)
);
CREATE TABLE public.location_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL,
  user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  location USER-DEFINED,
  speed double precision,
  heading double precision,
  altitude double precision,
  accuracy double precision,
  battery_level smallint CHECK (battery_level >= 0 AND battery_level <= 100),
  recorded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT location_history_pkey PRIMARY KEY (id),
  CONSTRAINT location_history_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.sos_incidents(id),
  CONSTRAINT location_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.audio_recordings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL,
  user_id uuid NOT NULL,
  file_url text NOT NULL,
  duration_seconds integer,
  file_size bigint,
  uploaded boolean DEFAULT false,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audio_recordings_pkey PRIMARY KEY (id),
  CONSTRAINT audio_recordings_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.sos_incidents(id),
  CONSTRAINT audio_recordings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.video_recordings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL,
  user_id uuid NOT NULL,
  file_url text NOT NULL,
  camera USER-DEFINED DEFAULT 'REAR'::camera_enum,
  resolution character varying,
  duration_seconds integer,
  file_size bigint,
  uploaded boolean DEFAULT false,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT video_recordings_pkey PRIMARY KEY (id),
  CONSTRAINT video_recordings_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.sos_incidents(id),
  CONSTRAINT video_recordings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.ai_models (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  model_name character varying NOT NULL,
  version character varying,
  description text,
  provider character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_models_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ai_predictions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL,
  prediction_type USER-DEFINED NOT NULL,
  confidence numeric CHECK (confidence >= 0::numeric AND confidence <= 100::numeric),
  score numeric,
  raw_output jsonb,
  model_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_predictions_pkey PRIMARY KEY (id),
  CONSTRAINT ai_predictions_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.sos_incidents(id),
  CONSTRAINT ai_predictions_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.ai_models(id)
);
CREATE TABLE public.ai_danger_scores (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid UNIQUE,
  gps_score integer DEFAULT 0,
  crime_score integer DEFAULT 0,
  running_score integer DEFAULT 0,
  fall_score integer DEFAULT 0,
  voice_score integer DEFAULT 0,
  crowd_score integer DEFAULT 0,
  manual_score integer DEFAULT 0,
  final_score integer CHECK (final_score >= 0 AND final_score <= 100),
  decision USER-DEFINED DEFAULT 'NORMAL'::danger_decision_enum,
  explanation text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_danger_scores_pkey PRIMARY KEY (id),
  CONSTRAINT ai_danger_scores_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.sos_incidents(id)
);
CREATE TABLE public.incident_timeline (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL,
  event_type USER-DEFINED NOT NULL,
  title character varying,
  description text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT incident_timeline_pkey PRIMARY KEY (id),
  CONSTRAINT incident_timeline_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.sos_incidents(id)
);
CREATE TABLE public.evidence_files (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL,
  uploaded_by uuid,
  file_type USER-DEFINED NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  mime_type character varying,
  file_size bigint,
  checksum character varying,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT evidence_files_pkey PRIMARY KEY (id),
  CONSTRAINT evidence_files_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.sos_incidents(id),
  CONSTRAINT evidence_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);
CREATE TABLE public.crime_zones (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  area_name character varying NOT NULL,
  latitude double precision,
  longitude double precision,
  location USER-DEFINED,
  radius_meters double precision,
  crime_score integer CHECK (crime_score >= 0 AND crime_score <= 100),
  crime_type character varying,
  source character varying,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crime_zones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.crowd_reports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  report_type USER-DEFINED NOT NULL,
  description text,
  latitude double precision,
  longitude double precision,
  location USER-DEFINED,
  photo_url text,
  status USER-DEFINED DEFAULT 'PENDING'::report_status_enum,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crowd_reports_pkey PRIMARY KEY (id),
  CONSTRAINT crowd_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.safe_routes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  source_lat double precision,
  source_lng double precision,
  destination_lat double precision,
  destination_lng double precision,
  source_location USER-DEFINED,
  destination_location USER-DEFINED,
  route_json jsonb,
  distance_meters double precision,
  duration_seconds integer,
  risk_score integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT safe_routes_pkey PRIMARY KEY (id),
  CONSTRAINT safe_routes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.nearby_services (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  service_type USER-DEFINED NOT NULL,
  phone character varying,
  address text,
  latitude double precision,
  longitude double precision,
  location USER-DEFINED,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT nearby_services_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chatbot_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  response text,
  ai_provider character varying,
  tokens_used integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chatbot_history_pkey PRIMARY KEY (id),
  CONSTRAINT chatbot_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.face_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid,
  user_id uuid,
  detected_person character varying,
  confidence numeric,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT face_logs_pkey PRIMARY KEY (id),
  CONSTRAINT face_logs_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.sos_incidents(id),
  CONSTRAINT face_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.voice_commands (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid,
  recognized_text text,
  confidence numeric,
  triggered boolean DEFAULT false,
  language character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT voice_commands_pkey PRIMARY KEY (id),
  CONSTRAINT voice_commands_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.sos_incidents(id)
);
CREATE TABLE public.wearable_devices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  device_name character varying,
  device_type character varying,
  manufacturer character varying,
  battery_level smallint,
  last_sync timestamp with time zone,
  is_connected boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wearable_devices_pkey PRIMARY KEY (id),
  CONSTRAINT wearable_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid,
  user_id uuid,
  recipient_name character varying,
  recipient_phone character varying,
  recipient_email character varying,
  notification_type USER-DEFINED,
  status USER-DEFINED DEFAULT 'PENDING'::notification_status_enum,
  message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.sos_incidents(id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  setting_key character varying NOT NULL UNIQUE,
  setting_value text,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  full_name character varying,
  email character varying NOT NULL UNIQUE,
  password_hash text,
  role USER-DEFINED DEFAULT 'ADMIN'::admin_role_enum,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  admin_id uuid,
  action character varying,
  entity_name character varying,
  entity_id uuid,
  ip_address inet,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_users(id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  action character varying,
  entity_name character varying,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  device character varying,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
