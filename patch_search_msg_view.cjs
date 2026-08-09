const fs = require('fs');
let code = fs.readFileSync('src/components/SearchMessageView.tsx', 'utf8');

if (!code.includes('import { cleanWorkspaceTags }')) {
  code = code.replace(
    'import { extractRaciocinio, cleanRaciocinioTags } from \'../utils/raciocinioParser\';',
    'import { extractRaciocinio, cleanRaciocinioTags } from \'../utils/raciocinioParser\';\nimport { cleanWorkspaceTags } from \'../utils/workspaceParser\';\nimport { WorkspaceTasksBlock } from \'./WorkspaceTasksBlock\';'
  );
}

code = code.replace(
  'content={extractWsmDoc(extractWsmForm(message.finalSynthesis || message.text || "").cleanText).cleanText}',
  'content={cleanWorkspaceTags(extractWsmDoc(extractWsmForm(message.finalSynthesis || message.text || "").cleanText).cleanText)}'
);

const anchor = '{(showFinal || !message.isSimulatingSearch) && (message.finalSynthesis || message.text) && (';
const replacement = `{(showFinal || !message.isSimulatingSearch) && (message.finalSynthesis || message.text) && (
        <>
        <WorkspaceTasksBlock text={message.finalSynthesis || message.text} />
        `;
code = code.replace(anchor, replacement);

const closingAnchor = `          />
        </div>
      )}`;
const closingReplacement = `          />
        </div>
        </>
      )}`;
code = code.replace(closingAnchor, closingReplacement);

fs.writeFileSync('src/components/SearchMessageView.tsx', code);
