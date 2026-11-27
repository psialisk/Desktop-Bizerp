"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalog = void 0;
exports.counterWorkflowsFor = counterWorkflowsFor;
exports.normalizeBlocks = normalizeBlocks;
exports.preset = preset;
exports.validateSpecialization = validateSpecialization;
exports.specializationPreset = specializationPreset;
exports.specializationLabel = specializationLabel;
exports.accommodationMode = accommodationMode;
exports.setAccommodationMode = setAccommodationMode;
const foundation_catalog_json_1 = __importDefault(require("./foundation-catalog.json"));
exports.catalog = foundation_catalog_json_1.default;
function counterWorkflowsFor(industryId, blocks) { return foundation_catalog_json_1.default.counterWorkflows.filter(w => w.status === 'ready' && w.industryIds.includes(industryId) && w.requiredBlocks.every(b => blocks.includes(b))); }
function normalizeBlocks(ids) { const selected = new Set(); function add(id) { const b = foundation_catalog_json_1.default.blocks.find(c => c.id === id); if (!b || b.status !== 'ready' || selected.has(id))
    return; selected.add(id); b.dependencies.forEach(add); } foundation_catalog_json_1.default.blocks.filter(b => 'required' in b && b.required).forEach(b => add(b.id)); ids.forEach(add); return foundation_catalog_json_1.default.blocks.filter(b => selected.has(b.id)).map(b => b.id); }
function preset(id) { const t = foundation_catalog_json_1.default.templates.find(t => t.id === id) || foundation_catalog_json_1.default.templates[0], blocks = normalizeBlocks(t.blocks); return { industryId: t.industryId, templateId: t.id, blocks, workflowIds: counterWorkflowsFor(t.industryId, blocks).map(w => w.id) }; }
function validateSpecialization(f) {
    if (f.packageFamilyId === undefined && f.specializationId === undefined)
        return;
    if (f.packageFamilyId === null && f.specializationId === null)
        return;
    const s = foundation_catalog_json_1.default.specializations.find(s => s.id === f.specializationId && s.packageFamilyId === f.packageFamilyId);
    if (!s || !s.compatibleIndustryIds.includes(f.industryId) || !s.requiredBlocks.every(b => f.blocks.includes(b)) || (s.id === 'services-contracting' && !f.blocks.some(b => b === 'services' || b === 'trades')))
        throw new Error('Choose a compatible package specialization and its required foundation blocks, or clear both');
}
function specializationPreset(id) {
    const s = foundation_catalog_json_1.default.specializations.find(s => s.id === id);
    if (!s)
        throw new Error('Unknown business specialization');
    const blocks = normalizeBlocks([...s.requiredBlocks, ...s.recommendedBlocks]);
    return { industryId: s.defaultIndustryId, templateId: s.defaultTemplateId, blocks, packageFamilyId: s.packageFamilyId, specializationId: s.id, workflowIds: counterWorkflowsFor(s.defaultIndustryId, blocks).map(w => w.id) };
}
function specializationLabel(f) { return foundation_catalog_json_1.default.specializations.find(s => s.id === f.specializationId && s.packageFamilyId === f.packageFamilyId)?.name || null; }
function accommodationMode(f) { if (f.industryId !== 'real-estate')
    return 'none'; const monthly = f.blocks.includes('rentals'), hotel = f.blocks.includes('stays'); return monthly && hotel ? 'mixed' : monthly ? 'monthly' : hotel ? 'hotel' : 'none'; }
function setAccommodationMode(f, mode) {
    if (f.industryId !== 'real-estate' || !['property-management'].includes(f.templateId))
        throw new Error('Accommodation modes require a Real Estate accommodation foundation');
    if (!['monthly', 'hotel', 'mixed'].includes(mode))
        throw new Error('Unknown accommodation mode');
    const blocks = normalizeBlocks([...f.blocks.filter(b => b !== 'rentals' && b !== 'stays'), ...(mode === 'monthly' ? ['rentals'] : mode === 'hotel' ? ['stays'] : ['rentals', 'stays'])]);
    if (f.workflowIds?.some(id => !foundation_catalog_json_1.default.counterWorkflows.some(w => w.id === id && w.status === 'ready' && w.industryIds.includes(f.industryId) && w.requiredBlocks.every(b => blocks.includes(b)))))
        throw new Error('Clear incompatible counter workflow selections before changing accommodation mode');
    const next = { ...f, blocks };
    validateSpecialization(next);
    return next;
}
