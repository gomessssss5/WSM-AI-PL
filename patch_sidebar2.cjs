const fs = require('fs');
let file = fs.readFileSync('src/components/RightRunSidebar.tsx', 'utf8');

if (!file.includes('X,')) {
    file = file.replace("import {\n  CheckCircle2,", "import {\n  CheckCircle2,\n  X,");
    file = file.replace("import { \n  CheckCircle2,", "import { \n  CheckCircle2,\n  X,");
}

const target = `      {/* Top Segmented Pill Switcher (Matching Reference Image) */}
      <div className="p-3 border-b border-[#eae6e1] dark:border-zinc-800 bg-[#f7f5f0]/80 dark:bg-zinc-900/80 backdrop-blur-xs flex items-center justify-center shrink-0">
        <div className="bg-[#eae7e1] dark:bg-zinc-800 p-1 rounded-full flex items-center w-full max-w-[260px] text-xs font-semibold shadow-inner">`;

const replacement = `      {/* Top Segmented Pill Switcher (Matching Reference Image) */}
      <div className="p-3 border-b border-[#eae6e1] dark:border-zinc-800 bg-[#f7f5f0]/80 dark:bg-zinc-900/80 backdrop-blur-xs flex items-center justify-center shrink-0 relative">
        <div className="bg-[#eae7e1] dark:bg-zinc-800 p-1 rounded-full flex items-center w-full max-w-[260px] text-xs font-semibold shadow-inner">`;

const target2 = `          </button>
        </div>
      </div>

      {/* Main Tab Viewports */}`;

const replacement2 = `          </button>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:bg-[#eae7e1] dark:hover:bg-zinc-800 rounded-full cursor-pointer transition-colors"
            title="Fechar Painel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Tab Viewports */}`;

if (file.includes(target) && file.includes(target2)) {
    file = file.replace(target, replacement).replace(target2, replacement2);
    fs.writeFileSync('src/components/RightRunSidebar.tsx', file);
    console.log("Patched RightRunSidebar correctly");
} else {
    console.log("Target not found in RightRunSidebar");
}
