"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departments = void 0;
exports.checkoutAccess = checkoutAccess;
exports.pageDepartment = pageDepartment;
exports.departments = [
    ['general', 'General'], ['operations', 'Operations'], ['retail_checkout', 'Point-of-Sales'], ['property_checkout', 'Operations / Property checkout'], ['finance', 'Finance'],
    ['marketing', 'Marketing'], ['human_resource', 'Human Resource'], ['admin', 'Admin'],
];
function checkoutAccess(p) {
    if (['none', 'view', 'edit'].includes(p.retail_checkout))
        return p.retail_checkout;
    if (p.operations === 'edit' && p.finance === 'edit')
        return 'edit';
    return ['view', 'edit'].includes(p.operations) && ['view', 'edit'].includes(p.finance) ? 'view' : 'none';
}
function pageDepartment(path) {
    const section = path.split('/')[2];
    if (section === 'team')
        return 'general';
    if (section === 'retail-pos')
        return 'retail_checkout';
    if (['hr', 'retail-payroll', 'payroll', 'workforce'].includes(section))
        return 'human_resource';
    if (['agency-offers', 'planning-agency'].includes(section))
        return 'marketing';
    if (['planning-services', 'planning-trades', 'association-governance', 'hotel-housekeeping', 'client-access'].includes(section))
        return 'operations';
    if (['hotel-outlets', 'service-contracts', 'industry-finance', 'commercial', 'job-costs', 'accounting', 'payments', 'expenses', 'reconciliation', 'settlements', 'retail-accounting', 'financial-reports', 'food-finance'].includes(section))
        return 'finance';
    if (['leads', 'marketing', 'announcements'].includes(section))
        return 'marketing';
    if (['gateways', 'documents', 'audit-logs', 'storage', 'subscription', 'license', 'downloads'].includes(section))
        return 'admin';
    if (section === 'reports')
        return 'general';
    if (!section || ['apps', 'profile', 'messages', 'notifications', 'my-work'].includes(section))
        return 'general';
    return 'operations';
}
