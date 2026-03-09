import { ArrowUp, ArrowDown, Minus, Heart } from 'lucide-react';

const PriceCard = ({ product, trend, isAvailable, opportunityLabel, isFavorite, onToggleFavorite }) => {
    // trend: 'up', 'down', 'stable'
    const productId = `${product.producto_codigo}-${product.producto_origen}`;

    const getTrendIcon = () => {
        if (trend === 'up') return <ArrowUp size={16} className="text-red-500" />;
        if (trend === 'down') return <ArrowDown size={16} className="text-[#8ab733]" />;
        return <Minus size={16} className="text-slate-400" />;
    };

    const getTrendColor = () => {
        if (trend === 'up') return 'text-red-600 bg-red-50';
        if (trend === 'down') return 'text-[#8ab733] bg-[#8ab733]/10';
        return 'text-slate-500 bg-slate-100';
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation();
        onToggleFavorite(productId);
    };

    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex justify-between items-center mb-3 active:scale-95 transition-transform ${!isAvailable ? 'opacity-60 grayscale' : ''}`}>
            <div className="flex-1 pr-2 min-w-0">
                <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                        {opportunityLabel && (
                            <span className="inline-block bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full mb-1 uppercase tracking-wider border border-amber-200">
                                ✨ {opportunityLabel}
                            </span>
                        )}
                        <h3 className="font-semibold text-slate-800 leading-tight truncate">{product.producto_nombre}</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">{product.producto_origen || 'Origen desconocido'}</p>
                    </div>
                    <button
                        onClick={handleFavoriteClick}
                        className={`shrink-0 p-2 rounded-full transition-colors ${isFavorite ? 'text-red-500 bg-red-50' : 'text-slate-300 hover:bg-slate-50'}`}
                    >
                        <Heart size={18} fill={isFavorite ? "currentColor" : "none"} strokeWidth={isFavorite ? 2.5 : 2} />
                    </button>
                </div>
            </div>
            <div className="text-right shrink-0">
                {!isAvailable ? (
                    <span className="inline-block bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">NO DISPONIBLE</span>
                ) : (
                    <>
                        <div className="text-lg font-bold text-slate-900 leading-none mb-1">
                            {product.precio_moda?.toFixed(2)} €
                        </div>
                        <div className={`text-[10px] font-bold inline-flex items-center space-x-1 px-2 py-0.5 rounded-full ${getTrendColor()}`}>
                            {getTrendIcon()}
                            <span>{trend === 'down' ? 'Bajada' : trend === 'up' ? 'Subida' : 'Estable'}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PriceCard;
