export const askForClarificationTool = {
  declaration: {
    name: 'ask_for_clarification',
    description: 'Tra ve cau hoi lam ro khi user query mo ho hoac thieu thong tin.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reason: { type: 'STRING' },
        missing_fields: { type: 'ARRAY' },
        suggested_options: { type: 'ARRAY' }
      }
    }
  },
  roles: ['admin', 'production_manager', 'kho_manager', 'staff'],
  execute: async (args = {}) => {
    const reason = String(args.reason || 'Can them thong tin de truy van chinh xac.');
    const missing = Array.isArray(args.missing_fields) ? args.missing_fields : [];
    const suggested = Array.isArray(args.suggested_options) ? args.suggested_options : [];

    const missingText = missing.length ? `Thong tin can bo sung: ${missing.join(', ')}.` : '';
    const suggestedText = suggested.length ? `Goi y: ${suggested.join(' | ')}` : '';

    return {
      clarification: `${reason} ${missingText} ${suggestedText}`.trim(),
      missing_fields: missing,
      suggested_options: suggested,
      updatedAt: new Date().toISOString()
    };
  }
};
