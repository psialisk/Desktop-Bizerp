# Desktop cloud-managed local staff development

Fresh profiles require internet, a platform-specific DESKTOP enrollment key and an existing cloud owner account/password confirmation. The client verifies GNJTA1 RSA signatures and Desktop/device/owner/tenant bindings before creating the live database. Exact cloud tenant and owner IDs seed the local tenant. Existing profiles are never rebound. Training creation and local staff creation are disabled for fresh cloud-bound profiles.

Staff authenticate to cloud Business Login immediately before signed GNJLS1 enrollment. Their password is locally bcrypt hashed; no cloud password hash is transferred. Signed role, permissions, employee and schedules are mirrored to private PostgreSQL. A network outage permits existing unexpired signed access; authoritative 401/403/409 invalidates the cached account. GNJLR1 roster refresh contains no login credentials. Local credentials, roles and staff identities cannot be changed through loopback endpoints.

Each loopback API request rechecks owner signature/platform/device binding and commercial scope; staff requests additionally verify lease expiry, identity, credential version and equality with signed role permissions. Loopback JWTs must verify with the private local JWT secret. Cloud JWTs are used only for cloud calls. Cloud-bound profiles never run the old background cloud registration/reporting-copy job. No financial transaction history is imported or synchronized.

## Verification

Run `node --test tests/cloud-local.cjs` (7 tests) and `node tests/cloud-provision.cjs` (full-schema PGlite integration using existing backend dependencies). The integration verifies exact cloud tenant/owner IDs, signed commercial capacity, bcrypt verification, permissions, schedules, independently verified pharmacist credentials, and empty financial order history. Legacy `tests/calendar-upgrade.cjs` also passed with the recovered schema and existing backend PGlite. Tests cover signature tampering, Android/Desktop isolation, tenant/owner/device binding, purpose substitution, role and permission escalation, seven-day staff maximum, expiry, offline first-setup denial, confirmation and existing-profile refusal. Initial run failed because cloud-local module did not exist; implementation was added afterwards. Existing calendar-runtime smoke test expects offline creation and is not applicable to this new setup contract.

## Portable build

`scripts/build-calendar.ps1` requires the preserved recovered 0.4.2 application at `D:/Business ERP/Desktop-Development/Recovered-0.4.2/application`, built shared backend `D:/GitHub/bizerp.gnj/backend/dist`, and FE `.next-desktop/standalone`, `.next-desktop/static` from the root-coordinated ERP_DESKTOP_BUILD=1 build. The recovered application supplies Electron, Node, private PostgreSQL and backend node_modules. Source checkout alone cannot build without those binaries; no dependency downloads were added. Service modules are explicitly copied to runtime/desktop.

Default output is separate `artifacts/BusinessERP-Desktop-0.4.2-Cloud-Local-Staff`. Original installer/application/profile directories are not overwritten. This is an unsigned portable development artifact, not a production signing claim.

## Deployment prerequisites and limits

Backend /desktop-local endpoints and commercial metadata must be deployed separately by an authorized operator, with Desktop entitlement, dedicated Desktop enrollment keys, trusted issuer and migrations. This work performs no deployment or production SQL and reads no issuer private key. Issuer public keys are fetched via authenticated HTTPS on setup and cached within Windows-protected settings.

Retail pharmacy authorization is mirrored only from signed pharmacist metadata; local authorization endpoints are disabled. Expired/revoked leases deactivate local pharmacist authorization on the next request. A signed owner grant with missing foundation, license or account limits fails closed. No invented commercial allowance or wages. Signed employee identity/schedules never create payroll links; self-service payroll/attendance requiring a wage link stays unavailable until a separate authoritative pay contract exists. Owner grant refresh occurs at runtime start; staff enrollment occurs before local login. A running instance retains its signed grant window until restart/re-enrollment. Local staff password changes must be completed in the cloud first. End-to-end cloud activation requires deployed endpoints/test keys and remains an operator test; unit tests use synthetic RSA keys only.
