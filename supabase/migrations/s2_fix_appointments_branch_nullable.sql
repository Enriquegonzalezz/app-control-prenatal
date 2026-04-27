-- s2_fix_appointments_branch_nullable.sql
-- Sprint 2: Permite branch_id NULL en appointments
-- Una cita en consultorio propio del médico (DoctorOffice) no tiene clinic branch.
-- El constraint NOT NULL impedía reagendar a slots de tipo office.
ALTER TABLE appointments
    ALTER COLUMN branch_id DROP NOT NULL;
