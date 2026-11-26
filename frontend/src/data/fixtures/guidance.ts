import type { GuidanceMode } from '../../types/models';

export const fixtureMarkdown: Record<GuidanceMode, string> = {
  quick: '## Treatment\n- **Sample step:** Review the leaf and remove visibly damaged material if appropriate.\n- Confirm any treatment with a local expert before applying it.\n\n## Prevention\n- **Sample prevention:** Keep observing this plant and record changes.\n- This is placeholder guidance, not a verified care instruction.',
  advanced: '# Detailed sample guidance\n\n## Treatment\n1. **Sample only:** Record visible symptoms and the date.\n2. Ask a qualified grower for crop-specific advice.\n\n## Prevention\n- Compare new photos under similar lighting.\n- This text is a fixture; no LLM was called.\n\n### Follow-up\nWrite a note after your next inspection.',
};
