"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffNavigationAllows = staffNavigationAllows;
exports.foundationAllows = foundationAllows;
const foundation_catalog_json_1 = __importDefault(require("./foundation-catalog.json"));
const department_access_1 = require("./department-access");
function staffNavigationAllows(path, blocks, permissions, role, workflowPermissions) {
    if (!foundationAllows(path, blocks))
        return false;
    if (path === '/dashboard/agency-offers')
        return ['operations', 'marketing'].every(d => ['view', 'edit'].includes(permissions[d] || 'none'));
    if (path === '/dashboard/team')
        return role === 'owner';
    if (path === '/dashboard/team/shifts' || path === '/dashboard/team/calendar')
        return ['owner', 'manager', 'staff'].includes(role);
    if (path === '/dashboard/help' || path.startsWith('/dashboard/help/'))
        return true;
    if (path.split('?')[0] === '/dashboard/retail-pos')
        return (0, department_access_1.checkoutAccess)(permissions) !== 'none' && ['view', 'edit'].includes(permissions.operations);
    // Reports & analytics is a General-tab staple: every signed-in role may open the
    // catalog, and the server still decides which individual reports it can run.
    if (path === '/dashboard/reports')
        return ['owner', 'manager'].includes(role) || ['general', 'operations', 'finance', 'admin', 'human_resource'].some(d => ['view', 'edit'].includes(permissions[d] || 'none'));
    if (['/dashboard/gateways', '/dashboard/client-access'].includes(path) && !['owner', 'manager'].includes(role))
        return false;
    if (['/dashboard/license', '/dashboard/subscription', '/dashboard/desktop-reports', '/dashboard/downloads', '/dashboard/hr/staff', '/dashboard/hr/roles'].includes(path))
        return role === 'owner';
    if (path.startsWith('/dashboard/spa') && workflowPermissions?.['business.spa'] !== undefined)
        return ['view', 'edit'].includes(workflowPermissions['business.spa']);
    if ((path.startsWith('/dashboard/fitness') || path.startsWith('/dashboard/pickleball')) && workflowPermissions?.['business.fitness'] !== undefined)
        return ['view', 'edit'].includes(workflowPermissions['business.fitness']);
    return (['/dashboard/profile', '/dashboard/my-work'].includes(path) || path.startsWith('/dashboard/my-work/')) || ['view', 'edit'].includes(permissions[(0, department_access_1.pageDepartment)(path)] || 'none');
}
// Exact page roots avoid allowing /hr/roles merely because /hr is selected.
function foundationAllows(path, blocks) {
    const page = path.split('?')[0].replace(/\/$/, '');
    if (page === '/dashboard/team')
        return blocks.includes('staff');
    if (page === '/dashboard/team/shifts' || page === '/dashboard/team/calendar')
        return blocks.includes('staff-shifts') || blocks.includes('workforce');
    if (page === '/dashboard/hr/calendar')
        return blocks.includes('workforce') || blocks.includes('payroll');
    if (page === '/dashboard/hr')
        return blocks.includes('staff') || blocks.includes('workforce') || blocks.includes('payroll');
    if (page === '/dashboard/operational-calendar')
        return ['inventory', 'operations-calendar', 'salon-appointments', 'laundry-custody', 'food', 'auto-intake', 'service-visits', 'fitness', 'pickleball'].some(b => blocks.includes(b));
    // Signed-in handbooks stay in the portal: industry guides plus license, fleet and specialist desks.
    if (page === '/dashboard/help')
        return true;
    if (page.startsWith('/dashboard/help/'))
        return foundation_catalog_json_1.default.industries.some(i => page === '/dashboard/help/' + i.id) || ['licensing', 'customer-accounts', 'delivery-fleet', 'specialist-operations'].includes(page.slice('/dashboard/help/'.length));
    if (/^\/dashboard\/renters\/[^/]+$/.test(page))
        return foundationAllows('/dashboard/renters', blocks);
    // Billing is platform-level: every tenant can reach the Subscription Hub sub-pages
    // (plans, add-ons, orders, devices, history) regardless of its industry foundation.
    if (page === '/dashboard/subscription' || page.startsWith('/dashboard/subscription/'))
        return true;
    if (['/dashboard', '/dashboard/apps', '/dashboard/profile', '/dashboard/messages', '/dashboard/notifications', '/dashboard/help', '/dashboard/audit-logs', '/dashboard/license', '/dashboard/subscription', '/dashboard/desktop-reports', '/dashboard/downloads', '/dashboard/reports', '/dashboard/hr/roles', '/dashboard/hr/staff', '/renter-portal', '/renter-portal/account', '/renter-portal/help', '/renter-portal/more', '/renter-portal/messages', '/renter-portal/notifications'].includes(page))
        return true;
    if (page === '/dashboard/hotel-outlets')
        return ['food', 'stays', 'property-finance'].every(b => blocks.includes(b));
    if (page === '/dashboard/service-contracts')
        return blocks.includes('services');
    if (page === '/dashboard/client-access')
        return ['services', 'trades', 'association', 'fitness', 'pickleball'].some(b => blocks.includes(b)) || (blocks.includes('crm') && blocks.includes('properties'));
    if (page === '/dashboard/spa')
        return blocks.includes('spa');
    if (page === '/dashboard/pickleball')
        return blocks.includes('pickleball');
    if (page === '/dashboard/association-governance')
        return blocks.includes('association');
    if (page === '/dashboard/hotel-housekeeping')
        return blocks.includes('stays');
    if (page === '/dashboard/agency-offers')
        return blocks.includes('crm') && blocks.includes('properties');
    if (page === '/dashboard/planning-agency')
        return blocks.includes('crm') && blocks.includes('properties');
    if (page === '/dashboard/planning-services')
        return blocks.includes('services');
    if (page === '/dashboard/planning-trades')
        return blocks.includes('trades');
    if (page === '/dashboard/industry-finance')
        return blocks.includes('association') || (blocks.includes('stays') && blocks.includes('property-finance')) || (blocks.includes('crm') && blocks.includes('properties'));
    if (page === '/dashboard/commercial')
        return ['services', 'trades'].some(b => blocks.includes(b)) || (blocks.includes('crm') && blocks.includes('properties'));
    if (page === '/dashboard/job-costs')
        return blocks.includes('trades');
    if (page === '/dashboard/daily-rentals')
        return blocks.includes('daily-rentals');
    if (page === '/dashboard/gateways')
        return true;
    if (page === '/dashboard/industry-operations')
        return ['association', 'stays', 'services', 'trades'].some(b => blocks.includes(b)) || (blocks.includes('crm') && blocks.includes('properties'));
    const extra = {
        '/dashboard/onboarding': ['properties'], '/dashboard/workspace-settings': ['properties'],
        '/dashboard/utilities': ['property-finance'], '/dashboard/amenities': ['properties'],
        '/dashboard/visitors': ['properties'], '/dashboard/vehicles': ['properties'],
        '/dashboard/gate-passes': ['properties'], '/dashboard/announcements': ['properties'],
        '/dashboard/storage': ['documents'], '/dashboard/hr/roles': ['core'],
        '/dashboard/retail-documents': ['retail-sales', 'retail-purchase'],
        '/dashboard/financial-reports': ['financial-reports', 'retail-accounting', 'property-finance'],
        '/renter-portal/invoices': ['property-finance'], '/renter-portal/documents': ['documents'],
        '/renter-portal/maintenance': ['maintenance'], '/renter-portal/amenities': ['properties'],
        '/renter-portal/announcements': ['properties'],
    };
    if (extra[page])
        return extra[page].some(b => blocks.includes(b));
    return foundation_catalog_json_1.default.blocks.some(b => blocks.includes(b.id) && b.routes.includes(page));
}
