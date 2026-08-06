const fs = require('fs');
let code = fs.readFileSync('src/components/Login.tsx', 'utf8');
code = code.replace(
  /<div className="relative">\s*<Lock className="absolute left-3 top-1\/2 -translate-y-1\/2 w-4 h-4 text-gray-400" \/>\s*<input\s*type="password"\s*placeholder="Senha de segurança"([\s\S]*?)<\/div>/,
  `<div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Senha de segurança"$1
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {!isSignUp && (
            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 text-[#2563eb] rounded border-gray-300 focus:ring-[#2563eb]" defaultChecked />
                <span className="text-[11px] font-medium text-gray-500 select-none">Manter conectado</span>
              </label>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={isResetting}
                className="text-[11px] font-semibold text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer disabled:opacity-50 select-none"
              >
                Esqueci minha senha
              </button>
            </div>
          )}`
);
fs.writeFileSync('src/components/Login.tsx', code);
