import { useEffect } from 'react';

const Layout = ({ children }) => {
    
    const handleCloseApp = async () => {
        try {
            const { App } = await import('@capacitor/app');
            App.exitApp();
        } catch (e) {
            // Si falla normalmente es porque estamos en entorno web de prueba
            console.warn('Cierre de App nativa no soportado en este entorno', e);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            <header className="bg-[#065AA2] text-white shadow-md sticky top-0 z-50 pt-safe">
                <div className="h-14 flex justify-between items-center px-4 max-w-md mx-auto w-full">
                    <div className="w-8"></div> {/* Espaciador para centrar el logo si hay botón a la derecha */}
                    
                    <img
                        src="/icons/icon-48.svg"
                        alt="AgroTene"
                        className="h-8 object-contain"
                    />
                    
                    <button 
                        onClick={handleCloseApp}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Cerrar aplicación"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </header>
            <main className="p-4 max-w-md mx-auto">
                {children}
            </main>
        </div>
    );
};

export default Layout;
