import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors font-sans bg-[#050B14] text-slate-100 relative overflow-hidden">
      {/* Ambient subtle light blobs */}
      <div className="absolute top-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-600/5 blur-[100px] pointer-events-none" />
      
      {/* Abstract Grid Background */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik00MCAwSDB2NDBoNDBWMEpNMzkgM0gzOXYzN2gxdjM3WiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAxKSIvPjwvc3ZnPg==')] opacity-50 pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out">
        {/* Logo Header */}
        <div className="text-center space-y-3">
          <div className="h-14 w-14 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] tracking-tighter ring-1 ring-white/10">
            FA
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-4">
              FACTURYAN
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Plataforma de Facturação Certificada AGT
            </p>
          </div>
        </div>

        {children}

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500 font-medium">
          <p>
            &copy; {new Date().getFullYear()} Ndeas Digital. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
