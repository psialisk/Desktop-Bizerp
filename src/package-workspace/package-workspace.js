"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceRoot = void 0;
exports.packageWorkspace = packageWorkspace;
exports.workspacePreferenceKey = workspacePreferenceKey;
const package_workspaces_json_1 = __importDefault(require("./package-workspaces.json"));
const foundation_navigation_1 = require("./foundation-navigation");
const counter_workflows_1 = require("./counter-workflows");
const entries = package_workspaces_json_1.default;
const workspaceRoot = (href) => href.split('?')[0];
exports.workspaceRoot = workspaceRoot;
function packageWorkspace(f, a, preferred) {
    const ids = f.packageLineIds || [], selected = preferred && ids.includes(preferred) ? preferred : ids[0] || f.specializationId || '';
    const allowed = (href) => (0, foundation_navigation_1.foundationAllows)((0, exports.workspaceRoot)(href), f.blocks) && (0, counter_workflows_1.counterPathAllowed)((0, exports.workspaceRoot)(href), f) && (0, foundation_navigation_1.staffNavigationAllows)((0, exports.workspaceRoot)(href), f.blocks, a.permissions, a.role, a.workflowPermissions);
    const candidates = [];
    const add = (id) => { const raw = entries[id], e = raw?.aliasOf ? entries[raw.aliasOf] : raw; if (e?.href && e.label && e.feature && (!e.block || f.blocks.includes(e.block)))
        candidates.push({ href: e.href, label: e.label, feature: e.feature, packageId: id }); };
    add(selected);
    const fallback = f.industryId === 'retail' ? 'retail-store' : f.industryId === 'food-hospitality' ? 'restaurant' : f.industryId === 'professional-services' ? 'professional-services' : f.industryId === 'trades' ? 'trades' : f.industryId === 'health-fitness' ? (f.blocks.includes('pickleball') && !f.blocks.includes('fitness') ? 'pickleball' : 'gym-fitness') : f.industryId === 'real-estate' ? (f.blocks.includes('rentals') ? 'starter' : f.blocks.includes('stays') ? 'hotel' : f.blocks.includes('association') ? 'association' : f.blocks.includes('trades') ? 'gardening' : 'agency') : f.industryId === 'human-resources' ? 'pure-hris' : f.industryId === 'manufacturing' ? 'manufacturing' : f.blocks.includes('daily-rentals') ? 'daily-rentals' : 'other';
    add(fallback);
    for (const [href, label, feature] of [['/dashboard/retail-accounting', 'Retail accounting', 'finance'], ['/dashboard/commercial', 'Invoices & collections', 'finance'], ['/dashboard/accounting', 'Accounting', 'finance'], ['/dashboard/workforce', 'My workforce', 'hr'], ['/dashboard/my-work', 'My work', 'personal']])
        candidates.push({ href, label, feature });
    const result = candidates.find(w => allowed(w.href)) || { href: '/dashboard/profile', label: 'My profile', feature: 'personal' };
    if (result.packageId && ids.length > 1)
        return { ...result, href: result.href + (result.href.includes('?') ? '&' : '?') + 'package=' + encodeURIComponent(result.packageId) };
    return result;
}
function workspacePreferenceKey(id) { return 'primary-package:' + id; }
