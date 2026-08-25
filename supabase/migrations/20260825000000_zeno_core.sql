-- Zeno core foundation
-- This migration keeps school data tenant-scoped and auditable.
-- No government or Mobile Money integration is implied by these tables.

create table if not exists public.zeno_schools (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  code text,
  establishment_form text not null default 'École',
  management_status text not null default 'Privé agréé',
  province text,
  city text,
  address text,
  contact_email text,
  contact_phone text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zeno_academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  label text not null,
  starts_on date,
  ends_on date,
  status text not null default 'active' check (status in ('draft', 'active', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  unique (school_id, label)
);

alter table public.zeno_schools
  add column if not exists current_academic_year_id uuid references public.zeno_academic_years(id) on delete set null;

create table if not exists public.zeno_school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_key text not null default 'enseignant',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, user_id)
);

create table if not exists public.zeno_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  role_key text not null,
  label text not null,
  permissions jsonb not null default '{}'::jsonb,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, role_key)
);

create table if not exists public.zeno_levels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  name text not null,
  category text not null,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  unique (school_id, name)
);

create table if not exists public.zeno_classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  academic_year_id uuid not null references public.zeno_academic_years(id) on delete restrict,
  level_id uuid references public.zeno_levels(id) on delete set null,
  name text not null,
  section text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, academic_year_id, name)
);

create table if not exists public.zeno_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  name text not null,
  category text,
  active boolean not null default true,
  unique (school_id, name)
);

create table if not exists public.zeno_students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_date date,
  sex text,
  matricule text,
  status text not null default 'active' check (status in ('active', 'transferred', 'graduated', 'withdrawn', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, matricule)
);

create table if not exists public.zeno_enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  student_id uuid not null references public.zeno_students(id) on delete restrict,
  academic_year_id uuid not null references public.zeno_academic_years(id) on delete restrict,
  class_id uuid not null references public.zeno_classes(id) on delete restrict,
  status text not null default 'enrolled' check (status in ('enrolled', 'promoted', 'repeating', 'transferred', 'graduated', 'withdrawn')),
  enrolled_at timestamptz not null default now(),
  unique (student_id, academic_year_id)
);

create table if not exists public.zeno_teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  academic_year_id uuid not null references public.zeno_academic_years(id) on delete restrict,
  teacher_user_id uuid not null references auth.users(id) on delete restrict,
  subject_id uuid not null references public.zeno_subjects(id) on delete restrict,
  class_id uuid not null references public.zeno_classes(id) on delete restrict,
  is_titular boolean not null default false,
  active boolean not null default true,
  unique (academic_year_id, teacher_user_id, subject_id, class_id)
);

create table if not exists public.zeno_timetable_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  academic_year_id uuid not null references public.zeno_academic_years(id) on delete restrict,
  teacher_user_id uuid not null references auth.users(id) on delete restrict,
  class_id uuid not null references public.zeno_classes(id) on delete restrict,
  subject_id uuid not null references public.zeno_subjects(id) on delete restrict,
  weekday smallint not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  room text,
  active boolean not null default true,
  check (ends_at > starts_at)
);

create table if not exists public.zeno_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  academic_year_id uuid not null references public.zeno_academic_years(id) on delete restrict,
  class_id uuid not null references public.zeno_classes(id) on delete restrict,
  subject_id uuid not null references public.zeno_subjects(id) on delete restrict,
  teacher_user_id uuid not null references auth.users(id) on delete restrict,
  lesson_date date not null,
  starts_at time,
  validated_at timestamptz,
  validated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (class_id, subject_id, teacher_user_id, lesson_date)
);

create table if not exists public.zeno_attendance_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  session_id uuid not null references public.zeno_attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.zeno_students(id) on delete restrict,
  status text not null check (status in ('present', 'late', 'absent', 'excused')),
  recorded_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table if not exists public.zeno_grade_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  academic_year_id uuid not null references public.zeno_academic_years(id) on delete restrict,
  label text not null,
  status text not null default 'open' check (status in ('draft', 'open', 'closed', 'archived')),
  unique (academic_year_id, label)
);

create table if not exists public.zeno_grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  period_id uuid not null references public.zeno_grade_periods(id) on delete cascade,
  class_id uuid not null references public.zeno_classes(id) on delete restrict,
  subject_id uuid not null references public.zeno_subjects(id) on delete restrict,
  student_id uuid not null references public.zeno_students(id) on delete restrict,
  teacher_user_id uuid not null references auth.users(id) on delete restrict,
  assessment_label text not null,
  score numeric,
  maximum_score numeric not null default 20,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'pending', 'validated', 'returned')),
  submitted_at timestamptz,
  validated_at timestamptz,
  validated_by uuid references auth.users(id) on delete set null,
  unique (period_id, student_id, subject_id, assessment_label)
);

create table if not exists public.zeno_fee_definitions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  academic_year_id uuid not null references public.zeno_academic_years(id) on delete restrict,
  label text not null,
  category text not null default 'other',
  amount numeric not null check (amount >= 0),
  currency text not null default 'CDF',
  active boolean not null default true
);

create table if not exists public.zeno_invoices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  academic_year_id uuid not null references public.zeno_academic_years(id) on delete restrict,
  student_id uuid not null references public.zeno_students(id) on delete restrict,
  reference text not null,
  total_amount numeric not null check (total_amount >= 0),
  currency text not null default 'CDF',
  status text not null default 'open' check (status in ('draft', 'open', 'partial', 'paid', 'cancelled')),
  due_on date,
  unique (school_id, reference)
);

create table if not exists public.zeno_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  invoice_id uuid not null references public.zeno_invoices(id) on delete restrict,
  student_id uuid not null references public.zeno_students(id) on delete restrict,
  amount numeric not null check (amount > 0),
  currency text not null default 'CDF',
  method text not null default 'cash',
  provider text,
  provider_reference text,
  paid_at timestamptz not null default now(),
  recorded_by uuid not null references auth.users(id) on delete restrict
);

create table if not exists public.zeno_activity_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.zeno_schools(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists zeno_memberships_user_idx on public.zeno_school_memberships(user_id, active);
create index if not exists zeno_students_school_name_idx on public.zeno_students(school_id, last_name, first_name);
create index if not exists zeno_enrollments_class_idx on public.zeno_enrollments(school_id, class_id, academic_year_id);
create index if not exists zeno_attendance_school_date_idx on public.zeno_attendance_sessions(school_id, lesson_date);
create index if not exists zeno_activity_school_created_idx on public.zeno_activity_log(school_id, created_at desc);

create or replace function public.zeno_has_school_access(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.zeno_school_memberships membership
    where membership.school_id = target_school_id
      and membership.user_id = auth.uid()
      and membership.active = true
  );
$$;

revoke all on function public.zeno_has_school_access(uuid) from public;
grant execute on function public.zeno_has_school_access(uuid) to authenticated;

alter table public.zeno_schools enable row level security;
alter table public.zeno_academic_years enable row level security;
alter table public.zeno_school_memberships enable row level security;
alter table public.zeno_roles enable row level security;
alter table public.zeno_levels enable row level security;
alter table public.zeno_classes enable row level security;
alter table public.zeno_subjects enable row level security;
alter table public.zeno_students enable row level security;
alter table public.zeno_enrollments enable row level security;
alter table public.zeno_teacher_assignments enable row level security;
alter table public.zeno_timetable_entries enable row level security;
alter table public.zeno_attendance_sessions enable row level security;
alter table public.zeno_attendance_records enable row level security;
alter table public.zeno_grade_periods enable row level security;
alter table public.zeno_grades enable row level security;
alter table public.zeno_fee_definitions enable row level security;
alter table public.zeno_invoices enable row level security;
alter table public.zeno_payments enable row level security;
alter table public.zeno_activity_log enable row level security;

-- Membership is the server-side tenant boundary. The owner can create the initial row
-- through a trusted server action; normal reads/writes remain school-scoped.
create policy zeno_schools_member_select on public.zeno_schools for select using (public.zeno_has_school_access(id) or owner_id = auth.uid());
create policy zeno_schools_owner_update on public.zeno_schools for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy zeno_years_member_access on public.zeno_academic_years for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_memberships_member_access on public.zeno_school_memberships for select using (public.zeno_has_school_access(school_id) or user_id = auth.uid());
create policy zeno_roles_member_access on public.zeno_roles for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_levels_member_access on public.zeno_levels for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_classes_member_access on public.zeno_classes for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_subjects_member_access on public.zeno_subjects for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_students_member_access on public.zeno_students for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_enrollments_member_access on public.zeno_enrollments for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_assignments_member_access on public.zeno_teacher_assignments for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_timetable_member_access on public.zeno_timetable_entries for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_attendance_sessions_member_access on public.zeno_attendance_sessions for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_attendance_records_member_access on public.zeno_attendance_records for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_grade_periods_member_access on public.zeno_grade_periods for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_grades_member_access on public.zeno_grades for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_fee_definitions_member_access on public.zeno_fee_definitions for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_invoices_member_access on public.zeno_invoices for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_payments_member_access on public.zeno_payments for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
create policy zeno_activity_member_access on public.zeno_activity_log for all using (public.zeno_has_school_access(school_id)) with check (public.zeno_has_school_access(school_id));
