import { LayoutDashboard, ShoppingBasket, Layers, Heart } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab, onCategoryClick }) => {
    return (
        <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-lg pb-safe z-40">
            <div className="flex justify-between items-center h-16 max-w-md mx-auto px-4">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex flex-col items-center justify-center space-y-1 transition-colors ${activeTab === 'dashboard' ? 'text-[#065AA2]' : 'text-slate-400'}`}
                >
                    <LayoutDashboard size={22} />
                    <span className="text-[10px] font-medium">Inicio</span>
                </button>

                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`flex flex-col items-center justify-center space-y-1 transition-colors ${activeTab === 'favorites' ? 'text-[#065AA2]' : 'text-slate-400'}`}
                >
                    <Heart size={22} fill={activeTab === 'favorites' ? "currentColor" : "none"} />
                    <span className="text-[10px] font-medium">Favoritos</span>
                </button>

                {/* Botón Central de Búsqueda (Unificado) */}
                <button
                    onClick={onCategoryClick}
                    className="flex flex-col items-center justify-center space-y-1 text-slate-400 hover:text-[#065AA2] active:scale-95 transition-all"
                >
                    <Layers size={22} />
                    <span className="text-[10px] font-medium">Búsqueda</span>
                </button>

                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex flex-col items-center justify-center space-y-1 transition-colors ${activeTab === 'products' ? 'text-[#065AA2]' : 'text-slate-400'}`}
                >
                    <ShoppingBasket size={22} />
                    <span className="text-[10px] font-medium">Catálogo</span>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
