const fs = require('fs');
let file = fs.readFileSync('src/components/MarkdownRenderer.tsx', 'utf8');

const target = `    const cleanedContent = cleanStepTags(content);
    
    // Ensure wsm tags are on their own lines so text before/after them doesn't get swallowed
    let formattedContent = cleanedContent;
    const tagNames = ['wsm_chart', 'wsm_map', 'wsm_form', 'wsm_task', 'wsm_mindmap'];`;

const replacement = `    const cleanedContent = cleanStepTags(content);
    
    let formattedContent = cleanedContent;

    // Remove markdown horizontal rules (---) which are visually inelegant
    formattedContent = formattedContent.replace(/\\n\\s*---\\s*\\n/g, '\\n\\n').replace(/^\\s*---\\s*\\n/g, '');

    // Fix malformed AI links (e.g. [Site](url], -> [Site](url))
    formattedContent = formattedContent.replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s\\)]+?)\\][\\,\\.]?/g, '[$1]($2)');

    // Auto-close incomplete markdown links at the very end of the text while streaming to avoid raw URL dumping
    formattedContent = formattedContent.replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s\\)]*)$/, '[$1]($2)');

    // Ensure wsm tags are on their own lines so text before/after them doesn't get swallowed
    const tagNames = ['wsm_chart', 'wsm_map', 'wsm_form', 'wsm_task', 'wsm_mindmap'];`;

file = file.replace(target, replacement);
fs.writeFileSync('src/components/MarkdownRenderer.tsx', file);
