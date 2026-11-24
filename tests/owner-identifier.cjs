const assert = require('node:assert/strict');
const { sameOwnerLogin, ownerIdentifierMatch } = require('../src/cloud-staff.cjs');

const ownerEmail = 'it224macatual@gmail.com';
const ownerId = 'e497972b-659f-473c-b0af-ac9b62671654';

assert.equal(sameOwnerLogin('it224macatual@gmail.com', ownerEmail), true, 'exact owner email matches');
assert.equal(sameOwnerLogin('  IT224Macatual@Gmail.com ', ownerEmail), true, 'owner email matching ignores case and spacing');
assert.equal(sameOwnerLogin('09569846905', ownerEmail), false, 'a contact number is never mistaken for the owner email claim');
assert.equal(sameOwnerLogin('0969846905', ownerEmail), false, 'a mistyped number does not match the owner email');

assert.equal(ownerIdentifierMatch('it224macatual@gmail.com', ownerEmail, null, ownerId), true, 'grant email is enough to detect the owner');
assert.equal(ownerIdentifierMatch('09569846905', ownerEmail, ownerId, ownerId), true, 'the owner contact number recorded on this business is recognised');
assert.equal(ownerIdentifierMatch('09991234567', ownerEmail, 'a-staff-user-id', ownerId), false, 'another local account is not the owner');
assert.equal(ownerIdentifierMatch('09991234567', ownerEmail, null, ownerId), false, 'an unknown number stays a staff enrollment');
assert.equal(ownerIdentifierMatch('it224macutal@gmail.com', ownerEmail, null, ownerId), false, 'a differently spelled email does not become the owner');

console.log('owner-identifier: ok');
