"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredCounterWorkflow = requiredCounterWorkflow;
exports.stapleCounterWorkflowIds = stapleCounterWorkflowIds;
exports.counterWorkflowChoices = counterWorkflowChoices;
exports.counterPathAllowed = counterPathAllowed;
exports.cloneFoundation = cloneFoundation;
exports.parseFoundationProposal = parseFoundationProposal;
const foundation_1 = require("./foundation");
function isStaple(w) { return 'staple' in w && w.staple === true; }
function requiredCounterWorkflow(industryId, blocks, id) {
    const workflow = foundation_1.catalog.counterWorkflows.find(w => w.id === id);
    return !!workflow && isStaple(workflow) && (0, foundation_1.counterWorkflowsFor)(industryId, blocks).some(w => w.id === id);
}
function stapleCounterWorkflowIds(industryId, blocks, ids) {
    const next = new Set([...ids, ...(0, foundation_1.counterWorkflowsFor)(industryId, blocks).filter(isStaple).map(w => w.id)]);
    return foundation_1.catalog.counterWorkflows.filter(w => next.has(w.id)).map(w => w.id);
}
function counterWorkflowChoices(industryId, blocks) {
    return (0, foundation_1.counterWorkflowsFor)(industryId, blocks).filter(w => w.id !== 'services-desk' || blocks.some(b => b === 'services' || b === 'trades'));
}
function counterPathAllowed(path, f) {
    if (path.split('?')[0] !== '/dashboard/retail-pos' || f.workflowIds === undefined)
        return true;
    return counterWorkflowChoices(f.industryId, f.blocks).some(w => w.mode === 'retail' && f.workflowIds.includes(w.id));
}
function cloneFoundation(f) {
    return { ...(f.packageFamilyId === undefined ? {} : { packageFamilyId: f.packageFamilyId }), ...(f.specializationId === undefined ? {} : { specializationId: f.specializationId }), industryId: f.industryId, templateId: f.templateId, blocks: [...f.blocks], ...(f.workflowIds === undefined ? {} : { workflowIds: [...f.workflowIds] }) };
}
function parseFoundationProposal(input) {
    const f = input;
    if (!f || !foundation_1.catalog.templates.some(t => t.id === f.templateId && t.industryId === f.industryId))
        throw new Error('Choose a valid industry and business type');
    if (!Array.isArray(f.blocks) || f.blocks.length < 1 || f.blocks.length > 30 || new Set(f.blocks).size !== f.blocks.length || f.blocks.some(id => !foundation_1.catalog.blocks.some(b => b.id === id && b.status === 'ready')))
        throw new Error('Proposal contains invalid or unavailable blocks');
    const blocks = (0, foundation_1.normalizeBlocks)(f.industryId === 'food-hospitality' ? [...f.blocks, 'food'] : f.blocks);
    if (f.workflowIds !== undefined) {
        const choices = counterWorkflowChoices(f.industryId, blocks);
        if (!Array.isArray(f.workflowIds) || f.workflowIds.length > 32 || new Set(f.workflowIds).size !== f.workflowIds.length || f.workflowIds.some(id => !choices.some(w => w.id === id)))
            throw new Error('Proposal contains invalid, planned or incompatible counter workflows');
    }
    (0, foundation_1.validateSpecialization)({ ...f, blocks });
    return cloneFoundation({ ...f, blocks, ...(f.workflowIds !== undefined ? { workflowIds: stapleCounterWorkflowIds(f.industryId, blocks, f.workflowIds) } : {}) });
}
