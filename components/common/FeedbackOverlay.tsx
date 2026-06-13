import * as React from 'react';
import { Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface FeedbackOverlayProps {
    status: 'loading' | 'error' | 'success' | 'idle';
    message?: string;
    onClose?: () => void;
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ status, message, onClose }) => {
    if (status === 'idle') return null;

    const config = {
        loading: {
            icon: <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />,
            bg: 'bg-white/80 dark:bg-slate-950/80',
            textColor: 'text-slate-800 dark:text-slate-100'
        },
        error: {
            icon: <XCircle className="h-10 w-10 text-red-500" />,
            bg: 'bg-red-50 dark:bg-red-950/90',
            textColor: 'text-red-700 dark:text-red-200'
        },
        success: {
            icon: <CheckCircle2 className="h-10 w-10 text-emerald-500" />,
            bg: 'bg-emerald-50 dark:bg-emerald-950/90',
            textColor: 'text-emerald-700 dark:text-emerald-200'
        }
    }[status] || config.loading;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" onClick={status !== 'loading' ? onClose : undefined} />
            <div className={`relative max-w-sm w-full p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center space-y-4 border border-white/10 ${config.bg}`}>
                {config.icon}
                <div className="space-y-1">
                    <p className={`font-black text-sm uppercase tracking-widest ${config.textColor}`}>
                        {status === 'loading' ? 'A Processar' : status === 'error' ? 'Erro Crítico' : 'Sucesso'}
                    </p>
                    {message && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>}
                </div>
                
                {status !== 'loading' && (
                    <button 
                        onClick={onClose}
                        className="mt-2 px-6 py-2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-tighter rounded-xl hover:bg-slate-900 transition-all"
                    >
                        Fechar
                    </button>
                )}
            </div>
        </div>
    );
};
