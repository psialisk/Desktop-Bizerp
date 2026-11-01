# Cloud SQL execution: 085 and 086

Applied 2026-11-02 02:03:32 UTC+8, following the user's explicit instruction: "execute the sql approved".

- Target: the previously supplied Render cloud ERP database; target database/role and TLS identity checked before execution.
- Full custom-format PostgreSQL18 backup completed before changes; archive directory validated,229 table-data entries present. Backup retained in a Windows-access-restricted folder outside Git.
- Applied085_retail_pharmacy.sql and086_operations_calendar.sql in order, together in one transaction with advisory locking and timeouts.
- Both versions recorded in erp_schema_migrations and confirmed after commit.
-8 feature tables verified;4 Pharmacy guard triggers enabled; Pharmacy expiry function integrated; calendar index present.
-228 pre-existing application table counts preserved inside the migration transaction. New feature tables started empty. No business records or demonstration data seeded.
- Independent verification through a new TLS-verified read-only connection passed.

## Reviewed SQL hashes
- 085_retail_pharmacy.sql: `2a60c391e58be98fc02fcf6ab44b582872d779ef510afdd5f932f8ebeb605c20`
- 086_operations_calendar.sql: `39b2bbc474df21def27294a2652b03ef710254eff8d6e64648fb6841dbde53d4`

Application backend/frontend deployment was not performed by this SQL action. Desktop installed databases and Android local SQLite were not modified. Existing Desktop stores use the packaged Back up and upgrade copies action; Android uses its updated APK and existing generic encrypted records.

The full database dump and private execution receipts are not committed to GitHub. Earlier release notes stating production SQL had not run describe the state before this explicit approval; this execution record supersedes that migration status.
