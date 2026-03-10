import { useState, useMemo, useEffect } from 'react';
import useData from '../hooks/useData';
import useFavorites from '../hooks/useFavorites';
import Layout from '../components/Layout';
import Navbar from '../components/Navbar';
import PriceCard from '../components/PriceCard';
import ChartView from '../components/ChartView';
import { Search, ArrowDownAZ, ArrowDownWideNarrow, ArrowUp, ArrowDown, Minus, Heart, ChevronRight, ChevronDown } from 'lucide-react';

const Dashboard = () => {
    const { data, loading, error, lastUpdate, dataSource } = useData();
    const { favorites, toggleFavorite, isFavorite } = useFavorites();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);
    const [originFilter, setOriginFilter] = useState('all'); // 'all', 'LOCAL', 'NO LOCAL'
    const [sortOrder, setSortOrder] = useState('name'); // 'name', 'price'

    // Filtros avanzados (Múltiple Selección)
    const [selectedFilters, setSelectedFilters] = useState({
        categories: [],
        subcategories: []
    });

    // Filtros activos (aplicados tras dar a Buscar)
    const [activeFilters, setActiveFilters] = useState({
        categories: [],
        subcategories: []
    });

    const [showCategoryExplorer, setShowCategoryExplorer] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState([]); // Array de strings (categorías abiertas)
    const [groupSearchTerm, setGroupSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showExplorerSuggestions, setShowExplorerSuggestions] = useState(false);

    const [opportunityType, setOpportunityType] = useState('down'); // 'down' o 'up'

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [timeRange, setTimeRange] = useState('all'); // 'week', 'month', 'year', 'all'

    // Lógica simple para determinar tendencias
    const processedData = useMemo(() => {
        if (!data.length) return [];

        // Agrupar por producto (código + origen para unicidad)
        const productGroups = {};
        data.forEach(item => {
            const key = `${item.producto_codigo}-${item.producto_origen}`;
            if (!productGroups[key]) {
                productGroups[key] = {
                    info: item,
                    history: []
                };
            }
            productGroups[key].history.push(item);
        });

        // Calcular tendencia para cada producto
        const results = Object.values(productGroups).map(group => {
            const history = group.history.sort((a, b) => b.precio_fecha - a.precio_fecha); // Más reciente primero
            const current = history[0];
            const previous = history.find(h => h.precio_fecha < current.precio_fecha);

            let trend = 'stable';
            let priceDiff = 0;
            if (previous) {
                priceDiff = current.precio_moda - previous.precio_moda;
                if (priceDiff > 0) trend = 'up';
                else if (priceDiff < 0) trend = 'down';
            }

            // Determinar si está disponible (tiene precios en la fecha más reciente del sistema)
            const isAvailable = current.precio_fecha.getTime() === lastUpdate?.getTime();

            return {
                ...current,
                trend,
                priceDiff,
                isAvailable,
                history
            };
        });

        // Ordenar alfabéticamente por nombre
        return results.sort((a, b) => a.producto_nombre.localeCompare(b.producto_nombre));
    }, [data, lastUpdate]);

    // Lógica avanzada para Oportunidades (Portada)
    const opportunities = useMemo(() => {
        // Solo productos disponibles
        const availableProducts = processedData.filter(p => p.isAvailable);

        if (opportunityType === 'down') {
            // 1. Intentar buscar bajadas reales
            const priceDrops = availableProducts.filter(p => p.trend === 'down');

            if (priceDrops.length > 0) {
                // Ordenar por tamaño de la bajada (opcional, pero mejora la experiencia)
                return priceDrops
                    .sort((a, b) => a.priceDiff - b.priceDiff) // Más negativo a menos negativo
                    .map(p => ({ ...p, opportunityLabel: 'Bajada de precio' }));
            }

            // 2. Fallback: Los 5 productos más baratos del mercado (precio_minimo más bajo)
            // Evitamos productos con precio 0 si los hay
            return availableProducts
                .filter(p => p.precio_minimo > 0)
                .sort((a, b) => a.precio_minimo - b.precio_minimo)
                .slice(0, 5)
                .map(p => ({ ...p, opportunityLabel: 'Mejor precio hoy' }));
        } else {
            // Subidas
            const priceHikes = availableProducts.filter(p => p.trend === 'up');

            if (priceHikes.length > 0) {
                // Ordenar de mayor subida a menor subida
                return priceHikes
                    .sort((a, b) => b.priceDiff - a.priceDiff) // subida más alta primero
                    .map(p => ({ ...p, opportunityLabel: 'Subida de precio' }));
            }

            return [];
        }
    }, [processedData, opportunityType]);

    const filteredProducts = useMemo(() => {
        const filtered = processedData.filter(p => {
            const searchLow = searchTerm.toLowerCase();
            const matchesSearch =
                (p.producto_nombre && p.producto_nombre.toLowerCase().includes(searchLow)) ||
                (p.categoria && p.categoria.toLowerCase().includes(searchLow)) ||
                (p.subcategoria && p.subcategoria.toLowerCase().includes(searchLow)) ||
                (p.grupo && p.grupo.toLowerCase().includes(searchLow));

            const matchesAvailability = !showAvailableOnly || p.isAvailable;
            const matchesOrigin = originFilter === 'all' || p.producto_origen === originFilter;

            let matchesAdvanced = true;
            // Si hay algo filtrado (en categorías o subcategorías), entonces comprobamos
            if (activeFilters.categories.length > 0 || activeFilters.subcategories.length > 0) {
                // Las condiciones se leen como: si he seleccionado categorías, este producto pertenece a alguna de ellas...
                // Si he seleccionado subcategorías, este producto pertenece a alguna...
                // Lo más estricto es que cumpla al menos 1 del nivel más bajo seleccionado que le atañe.
                // Sin embargo, una lógica más sencilla y consistente para el usuario es un gran O dentro de su rama.
                // Por ejemplo, "Está en la Categoría Frutas" OR "Está en la subcategoría Cítricos"
                matchesAdvanced = false;
                if (activeFilters.categories.includes(p.categoria)) matchesAdvanced = true;
                if (activeFilters.subcategories.includes(p.subcategoria)) matchesAdvanced = true;
            }

            return matchesSearch && matchesAvailability && matchesOrigin && matchesAdvanced;
        });

        // Aplicar ordenación
        return filtered.sort((a, b) => {
            if (sortOrder === 'price') {
                return (a.precio_moda || 0) - (b.precio_moda || 0);
            }
            // Por defecto: nombre (A-Z)
            return a.producto_nombre.localeCompare(b.producto_nombre);
        });
    }, [processedData, searchTerm, showAvailableOnly, activeFilters, originFilter, sortOrder]);

    // Generar el Árbol Jerárquico único según disponibilidad y origen
    const categoryTree = useMemo(() => {
        const tree = {};

        processedData.forEach(item => {
            const matchesOrigin = originFilter === 'all' || item.producto_origen === originFilter;
            const matchesAvailability = !showAvailableOnly || item.isAvailable;

            if (matchesOrigin && matchesAvailability) {
                const cat = item.categoria || 'GENERAL';
                const subcat = item.subcategoria || 'GENERAL';

                if (!tree[cat]) tree[cat] = new Set();
                tree[cat].add(subcat);
            }
        });

        // Convertir sets a arrays ordenados
        const finalTree = {};
        Object.keys(tree).sort().forEach(cat => {
            finalTree[cat] = Array.from(tree[cat]).sort();
        });

        return finalTree;
    }, [processedData, originFilter, showAvailableOnly]);

    // Autocompletado del buscador principal
    const searchSuggestions = useMemo(() => {
        if (searchTerm.length < 2) return [];

        const term = searchTerm.toLowerCase();
        const results = new Set();

        processedData.forEach(p => {
            if (p.producto_nombre && p.producto_nombre.toLowerCase().includes(term)) results.add(p.producto_nombre);
            if (p.categoria && p.categoria.toLowerCase().includes(term)) results.add(p.categoria);
            if (p.subcategoria && p.subcategoria.toLowerCase().includes(term)) results.add(p.subcategoria);
            if (p.grupo && p.grupo.toLowerCase().includes(term)) results.add(p.grupo);
        });

        return Array.from(results).slice(0, 8); // Máximo 8 sugerencias
    }, [searchTerm, processedData]);

    // Autocompletado del explorador
    const explorerSuggestions = useMemo(() => {
        if (groupSearchTerm.length < 2) return [];

        const term = groupSearchTerm.toLowerCase();
        const results = new Set();

        processedData.forEach(p => {
            if (p.producto_nombre && p.producto_nombre.toLowerCase().includes(term)) results.add(p.producto_nombre);
            if (p.categoria && p.categoria.toLowerCase().includes(term)) results.add(p.categoria);
            if (p.subcategoria && p.subcategoria.toLowerCase().includes(term)) results.add(p.subcategoria);
            if (p.grupo && p.grupo.toLowerCase().includes(term)) results.add(p.grupo);
        });

        return Array.from(results).slice(0, 8); // Máximo 8 sugerencias
    }, [groupSearchTerm, processedData]);

    // Árbol filtrado para el explorador
    const filteredCategoryTree = useMemo(() => {
        if (!groupSearchTerm) return categoryTree;

        const term = groupSearchTerm.toLowerCase();
        const tree = {};

        processedData.forEach(item => {
            const matchesOrigin = originFilter === 'all' || item.producto_origen === originFilter;
            const matchesAvailability = !showAvailableOnly || item.isAvailable;

            if (matchesOrigin && matchesAvailability) {
                const isMatch =
                    (item.producto_nombre && item.producto_nombre.toLowerCase().includes(term)) ||
                    (item.categoria && item.categoria.toLowerCase().includes(term)) ||
                    (item.subcategoria && item.subcategoria.toLowerCase().includes(term)) ||
                    (item.grupo && item.grupo.toLowerCase().includes(term));

                if (isMatch) {
                    const cat = item.categoria || 'GENERAL';
                    const subcat = item.subcategoria || 'GENERAL';

                    if (!tree[cat]) tree[cat] = new Set();
                    tree[cat].add(subcat);
                }
            }
        });

        const finalTree = {};
        Object.keys(tree).sort().forEach(cat => {
            finalTree[cat] = Array.from(tree[cat]).sort();
        });

        return finalTree;
    }, [categoryTree, processedData, groupSearchTerm, originFilter, showAvailableOnly]);

    // Gestión del botón "Atrás" del hardware (History API y Capacitor)
    useEffect(() => {
        const handlePopState = (event) => {
            if (showCategoryExplorer) {
                setShowCategoryExplorer(false);
                return;
            }
            if (activeTab === 'analysis') {
                setActiveTab('products');
                setSelectedProduct(null);
                return;
            }
        };

        window.addEventListener('popstate', handlePopState);

        // Capacitor Android Back Button
        let isCapacitor = false;
        let capacitorBackListener = null;

        import('@capacitor/app').then(({ App }) => {
            isCapacitor = true;
            capacitorBackListener = App.addListener('backButton', () => {
                let canGoBack = false;

                // Usamos una función asyncrona autoejecutada o dependemos del estado previo, 
                // pero setState es asincrono, usamos el valor del scope actual si es necesario,
                // sin embargo en useEffects el valor del scope puede quedarse "stale".
                // Mejor, delegar el estado real a setState function o ref si hay muchos problemas con hooks 
                // (usualmente en capacitor back listeners hay problemas con stale closures)
                // Para este caso, vamos a emitir un PopState sintético, o actualizar usando prev state

                setShowCategoryExplorer((prev) => {
                    if (prev) { canGoBack = true; return false; }
                    return prev;
                });

                setActiveTab((prev) => {
                    if (prev === 'analysis' && !canGoBack) {
                        setSelectedProduct(null);
                        canGoBack = true;
                        return 'products';
                    }
                    return prev;
                });

                // Set timeout to allow states to settle before deciding to exit
                setTimeout(() => {
                    if (!canGoBack) {
                        App.exitApp();
                    }
                }, 50);

            });
        }).catch(() => {
            // Ignorado, probablemente entorno web puro sin @capacitor/app instalado
        });

        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (capacitorBackListener && isCapacitor) {
                capacitorBackListener.then(handle => handle.remove());
            }
        };
    }, []); // Al pasar arreglo vacío, los estados showCategoryExplorer etc estarán "stale" en las callbacks

    // Por el problema de stale closures en el listener con el arreglo vacío,
    // debemos ser más cuidadosos con la inicialización del listener de capacitor.

    const handleProductSelect = (product) => {
        setSelectedProduct(product);
        setTimeRange('all');
        setActiveTab('analysis');
        window.scrollTo(0, 0); // Scroll al inicio al entrar en detalle
        window.history.pushState({ view: 'analysis' }, '');
    };

    const handleOpenExplorer = () => {
        setShowCategoryExplorer(true);
        window.history.pushState({ view: 'explorer' }, '');
    };

    const handleCloseExplorer = () => {
        if (showCategoryExplorer) {
            window.history.back();
        }
    };

    // Efecto para scroll al cambiar de pestaña principal
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        window.scrollTo(0, 0);
    };

    // Datos filtrados para el gráfico
    const chartData = useMemo(() => {
        if (!selectedProduct) return [];

        const now = new Date();
        const currentYear = now.getFullYear();

        let filteredHistory = selectedProduct.history.filter(item => {
            const itemDate = new Date(item.precio_fecha);

            switch (timeRange) {
                case 'week':
                    const oneWeekAgo = new Date(now);
                    oneWeekAgo.setDate(now.getDate() - 7);
                    return itemDate >= oneWeekAgo;
                case 'month':
                    const oneMonthAgo = new Date(now);
                    oneMonthAgo.setMonth(now.getMonth() - 1);
                    return itemDate >= oneMonthAgo;
                case 'year':
                    return itemDate.getFullYear() === currentYear;
                case 'all':
                default:
                    return true;
            }
        });

        // Si estamos viendo "Todo" y el producto está desactualizado o la última fecha no es hoy,
        // añadimos un punto "null" al día de hoy para que la gráfica llegue hasta el final
        if (timeRange === 'all' && filteredHistory.length > 0) {
            const lastItemDate = new Date(filteredHistory[0].precio_fecha); // Elemento 0 es el más reciente
            // Si la diferencia es mayor a unos días (ej. 2), añadimos el hueco
            const diffTime = Math.abs(now - lastItemDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 1) {
                // Insertamos al principio (ya que el array está ordenado descendente fecha)
                filteredHistory = [
                    { precio_fecha: now, precio_moda: null, precio_minimo: null, precio_maximo: null },
                    ...filteredHistory
                ];
            }
        }

        return filteredHistory;
    }, [selectedProduct, timeRange]);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-[#065AA2] font-medium">Cargando datos...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">Error: {error}</div>;

    return (
        <Layout>
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="bg-[#065AA2]/5 rounded-lg p-4 border border-[#065AA2]/10 relative overflow-hidden">
                        {/* Indicador de Origen */}
                        <div className="absolute top-0 right-0 p-2">
                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-sm uppercase shadow-sm ${dataSource === 'cloud'
                                ? 'bg-[#065AA2] text-white'
                                : 'bg-slate-400 text-white'
                                }`}>
                                {dataSource === 'cloud' ? '● Nube' : '○ Local'}
                            </div>
                        </div>
                        <h2 className="text-sm font-semibold text-[#003050]">Resumen del Mercado</h2>
                        <p className="text-xs text-[#065AA2] mt-1">
                            Última actualización: {lastUpdate ? lastUpdate.toLocaleDateString() : 'Desconocida'}
                        </p>
                        {dataSource === 'local' && (
                            <div className="mt-2 text-[10px] bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200">
                                ⚠️ No se pudo conectar con Google Sheets. Mostrando datos locales.
                            </div>
                        )}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="bg-white p-3 rounded shadow-sm text-center">
                                <div className="text-2xl font-bold text-slate-800">
                                    {processedData.filter(p => p.isAvailable).length}
                                </div>
                                <div className="text-xs text-slate-500">En mercado hoy</div>
                            </div>
                            <div className="bg-white p-3 rounded shadow-sm text-center">
                                <div className="text-2xl font-bold text-[#065AA2]">
                                    {processedData.filter(p => p.isAvailable && p.trend === 'down').length}
                                </div>
                                <div className="text-xs text-slate-500">Bajadas hoy</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h3 className="font-bold text-slate-800">Oportunidades</h3>
                            {/* Switch Bajadas/Subidas */}
                            <div className="bg-slate-100 p-1 rounded-xl flex items-center shadow-inner border border-slate-200/50">
                                <button
                                    onClick={() => setOpportunityType('down')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${opportunityType === 'down'
                                        ? 'bg-white text-emerald-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    Bajadas
                                </button>
                                <button
                                    onClick={() => setOpportunityType('up')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${opportunityType === 'up'
                                        ? 'bg-white text-rose-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    Subidas
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3 px-1 mb-4">
                            {opportunities.length > 0 ? (
                                opportunities.map(p => (
                                    <div key={`${p.producto_codigo}-${p.producto_origen}`} onClick={() => handleProductSelect(p)}>
                                        <PriceCard
                                            product={p}
                                            trend={p.trend}
                                            isAvailable={p.isAvailable}
                                            opportunityLabel={p.opportunityLabel}
                                            isFavorite={isFavorite(`${p.producto_codigo}-${p.producto_origen}`)}
                                            onToggleFavorite={toggleFavorite}
                                        />
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-4">No hay oportunidades disponibles.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'products' && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 px-1">Catálogo de Productos</h2>
                    <div className="flex flex-col gap-3">
                        {/* Resumen de Filtros Activos */}
                        {(activeFilters.categories.length > 0 || activeFilters.subcategories.length > 0) && (
                            <div className="flex flex-wrap gap-2 p-2 bg-[#065AA2]/5 rounded-xl border border-[#065AA2]/10 mb-2">
                                <div className="w-full flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-[#003050] uppercase px-2">Filtros aplicados</span>
                                    <button
                                        onClick={() => {
                                            setActiveFilters({ categories: [], subcategories: [] });
                                            setSelectedFilters({ categories: [], subcategories: [] });
                                        }}
                                        className="text-[10px] text-[#065AA2] font-bold underline px-2"
                                    >
                                        Limpiar todo
                                    </button>
                                </div>
                                {activeFilters.categories.map(c => (
                                    <span key={c} className="flex items-center gap-1 text-[10px] font-bold bg-[#8ab733] text-white px-2 py-1 rounded-full shadow-sm">
                                        Cat: {c}
                                    </span>
                                ))}
                                {activeFilters.subcategories.map(s => (
                                    <span key={s} className="flex items-center gap-1 text-[10px] font-bold bg-[#004070] text-white px-2 py-1 rounded-full shadow-sm">
                                        Sub: {s}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="relative w-full z-20">
                            <input
                                type="text"
                                placeholder="Buscar producto o categoría..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#065AA2] focus:ring-1 focus:ring-[#065AA2] outline-none transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            />
                            <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />

                            {/* Dropdown de autocompletado */}
                            {showSuggestions && searchSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden py-1 z-50">
                                    {searchSuggestions.map((sug, idx) => (
                                        <button
                                            key={idx}
                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-[#065AA2]/10 hover:text-[#065AA2] transition-colors"
                                            onClick={() => {
                                                setSearchTerm(sug);
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <Search size={12} className="inline mr-2 text-slate-400" />
                                            {sug}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 pt-1">
                            {/* Disponibilidad */}
                            <div className="flex justify-end">
                                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shadow-inner border border-slate-200/50">
                                    <button
                                        onClick={() => setShowAvailableOnly(false)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${!showAvailableOnly
                                            ? 'bg-white text-[#004070] shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setShowAvailableOnly(true)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${showAvailableOnly
                                            ? 'bg-[#065AA2] text-white shadow-md'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        Disponibles hoy
                                    </button>
                                </div>
                            </div>

                            {/* Origen */}
                            <div className="flex justify-end">
                                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shadow-inner border border-slate-200/50">
                                    {[
                                        { id: 'all', label: 'Todos' },
                                        { id: 'LOCAL', label: 'Local' },
                                        { id: 'NO LOCAL', label: 'No Local' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setOriginFilter(opt.id)}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${originFilter === opt.id
                                                ? 'bg-amber-500 text-white shadow-md'
                                                : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ordenación */}
                            <div className="flex justify-end">
                                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shadow-inner border border-slate-200/50">
                                    {[
                                        { id: 'name', label: 'A-Z', icon: <ArrowDownAZ size={14} /> },
                                        { id: 'price', label: 'Precio', icon: <ArrowDownWideNarrow size={14} /> }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setSortOrder(opt.id)}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-1.5 ${sortOrder === opt.id
                                                ? 'bg-[#065AA2] text-white shadow-md'
                                                : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                        >
                                            {opt.icon}
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pb-24">
                        {filteredProducts.map(p => (
                            <div key={`${p.producto_codigo}-${p.producto_origen}`} onClick={() => handleProductSelect(p)}>
                                <PriceCard
                                    product={p}
                                    trend={p.trend}
                                    isAvailable={p.isAvailable}
                                    isFavorite={isFavorite(`${p.producto_codigo}-${p.producto_origen}`)}
                                    onToggleFavorite={toggleFavorite}
                                />
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-slate-400">No se encontraron productos.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'favorites' && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 px-1">Mis Favoritos</h2>
                    <div className="pb-24">
                        {processedData.filter(p => isFavorite(`${p.producto_codigo}-${p.producto_origen}`)).length > 0 ? (
                            processedData
                                .filter(p => isFavorite(`${p.producto_codigo}-${p.producto_origen}`))
                                .map(p => (
                                    <div key={`${p.producto_codigo}-${p.producto_origen}`} onClick={() => handleProductSelect(p)}>
                                        <PriceCard
                                            product={p}
                                            trend={p.trend}
                                            isAvailable={p.isAvailable}
                                            isFavorite={true}
                                            onToggleFavorite={toggleFavorite}
                                        />
                                    </div>
                                ))
                        ) : (
                            <div className="text-center py-20 px-6">
                                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Heart className="text-red-200" size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 mb-2">Aún no tienes favoritos</h3>
                                <p className="text-slate-500 mb-6">Pulsa el corazón en cualquier producto para guardarlo aquí y seguir sus precios más fácilmente.</p>
                                <button
                                    onClick={() => setActiveTab('products')}
                                    className="bg-[#065AA2] text-white px-6 py-3 rounded-xl font-medium shadow-md hover:bg-[#004070] transition-colors"
                                >
                                    Ver Catálogo
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'analysis' && (
                <div className="space-y-6">
                    <h2 className="font-bold text-lg text-slate-800">Análisis de Tendencias</h2>

                    {selectedProduct ? (
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-[#065AA2]/10">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-[#003050] truncate">{selectedProduct.producto_nombre}</h3>
                                        <p className="text-sm text-slate-500 mb-4">{selectedProduct.producto_origen}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleFavorite(`${selectedProduct.producto_codigo}-${selectedProduct.producto_origen}`)}
                                        className={`shrink-0 p-3 rounded-xl transition-colors ${isFavorite(`${selectedProduct.producto_codigo}-${selectedProduct.producto_origen}`) ? 'text-red-500 bg-red-50' : 'text-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                                    >
                                        <Heart size={24} fill={isFavorite(`${selectedProduct.producto_codigo}-${selectedProduct.producto_origen}`) ? "currentColor" : "none"} strokeWidth={2.5} />
                                    </button>
                                </div>
                                <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase font-bold">Precio más habitual</span>
                                        <div className="text-3xl font-bold text-slate-900 leading-tight">
                                            {selectedProduct.precio_moda.toFixed(2)} €
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium">
                                            Dato del: {new Date(selectedProduct.precio_fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                        <div className="text-xs text-m-blue mt-2 font-medium bg-slate-50 px-2 py-1 rounded-md inline-block">
                                            Intervalo Min-Max: {selectedProduct.precio_minimo.toFixed(2)} € - {selectedProduct.precio_maximo.toFixed(2)} €
                                        </div>
                                    </div>
                                    <div className={`text-[10px] font-bold inline-flex items-center space-x-1 px-3 py-1 rounded-full ${selectedProduct.trend === 'down' ? 'text-[#8ab733] bg-[#8ab733]/10' : selectedProduct.trend === 'up' ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100'}`}>
                                        {selectedProduct.trend === 'up' && <ArrowUp size={14} />}
                                        {selectedProduct.trend === 'down' && <ArrowDown size={14} />}
                                        {selectedProduct.trend === 'stable' && <Minus size={14} />}
                                        <span>{selectedProduct.trend === 'down' ? 'Bajada' : selectedProduct.trend === 'up' ? 'Subida' : 'Estable'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between bg-slate-100 p-1 rounded-lg mb-2">
                                {[
                                    { id: 'week', label: 'Últimos 7 días' },
                                    { id: 'month', label: 'Últimos 30 días' },
                                    { id: 'year', label: 'Este Año' },
                                    { id: 'all', label: 'Todo' }
                                ].map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => setTimeRange(option.id)}
                                        className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${timeRange === option.id
                                            ? 'bg-white text-[#065AA2] shadow-sm'
                                            : 'text-slate-500 hover:text-[#065AA2]'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            <ChartView data={chartData} productName={selectedProduct.producto_nombre} timeRange={timeRange} />

                            <button
                                onClick={() => {
                                    if (window.history.state?.view === 'analysis') {
                                        window.history.back();
                                    } else {
                                        setActiveTab('products');
                                        setSelectedProduct(null);
                                    }
                                }}
                                className="w-full py-3 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Volver al listado
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-12 px-4">
                            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="text-slate-400" size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-2">Selecciona un producto</h3>
                            <p className="text-slate-500 mb-6">Elige un producto de la lista para ver su evolución de precios detallada.</p>
                            <button
                                onClick={() => setActiveTab('products')}
                                className="bg-[#065AA2] text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-emerald-200 hover:bg-[#004070] transition-colors"
                            >
                                Ir al Catálogo
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab !== 'analysis' && (
                <Navbar
                    activeTab={activeTab}
                    setActiveTab={handleTabChange}
                    onCategoryClick={handleOpenExplorer}
                />
            )}

            {/* Explorador de Categorías (Modal/Drawer) */}
            {showCategoryExplorer && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-t-3xl h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#065AA2]/5 relative">
                            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-300 rounded-full opacity-40" />
                            <div>
                                <h3 className="font-bold text-lg text-[#002040]">Explorador de productos</h3>
                                <p className="text-[10px] text-[#065AA2] uppercase font-bold tracking-wider">Busque y seleccione productos</p>
                            </div>
                            <button
                                onClick={handleCloseExplorer}
                                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-4 bg-slate-50/30">
                            {/* Barra de Búsqueda de Categorías/Subcategorías */}
                            <div className="mb-6 px-2">
                                <div className="relative w-full z-20">
                                    <input
                                        type="text"
                                        placeholder="Buscar producto, categoría..."
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#065AA2] focus:ring-1 focus:ring-[#065AA2] outline-none transition-all shadow-sm text-sm"
                                        value={groupSearchTerm}
                                        onChange={(e) => {
                                            setGroupSearchTerm(e.target.value);
                                            setShowExplorerSuggestions(true);
                                        }}
                                        onFocus={() => setShowExplorerSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowExplorerSuggestions(false), 200)}
                                    />
                                    <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />

                                    {/* Dropdown de autocompletado (Explorador) */}
                                    {showExplorerSuggestions && explorerSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden py-1 z-50">
                                            {explorerSuggestions.map((sug, idx) => (
                                                <button
                                                    key={idx}
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-[#065AA2]/10 hover:text-[#065AA2] transition-colors"
                                                    onClick={() => {
                                                        setGroupSearchTerm(sug);
                                                        setShowExplorerSuggestions(false);
                                                    }}
                                                >
                                                    <Search size={12} className="inline mr-2 text-slate-400" />
                                                    {sug}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Filtro de Disponibilidad Rápido (UX Mejorada) */}
                            <div className="mb-6 px-2">
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponibilidad</span>
                                        <div className={`w-2 h-2 rounded-full ${showAvailableOnly ? 'bg-[#065AA2] animate-pulse' : 'bg-slate-300'}`} />
                                    </div>
                                    <div className="p-2 flex gap-1">
                                        <button
                                            onClick={() => setShowAvailableOnly(false)}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${!showAvailableOnly
                                                ? 'bg-slate-800 text-white shadow-md'
                                                : 'bg-white text-slate-500 hover:bg-slate-50'
                                                }`}
                                        >
                                            Ver Todo
                                        </button>
                                        <button
                                            onClick={() => setShowAvailableOnly(true)}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${showAvailableOnly
                                                ? 'bg-[#065AA2] text-white shadow-md'
                                                : 'bg-white text-slate-500 hover:bg-slate-50'
                                                }`}
                                        >
                                            Solo Disponibles hoy
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Ordenación */}
                            <div className="mb-6 px-2">
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordenar por</span>
                                        <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#065AA2]/10 text-[#065AA2]">
                                            {sortOrder === 'name' ? 'A-Z' : 'PRECIO'}
                                        </div>
                                    </div>
                                    <div className="p-2 flex gap-1">
                                        {[
                                            { id: 'name', label: 'Alfabético', icon: <ArrowDownAZ size={16} /> },
                                            { id: 'price', label: 'Precio', icon: <ArrowDownWideNarrow size={16} /> }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setSortOrder(opt.id)}
                                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${sortOrder === opt.id
                                                    ? 'bg-[#065AA2] text-white shadow-md'
                                                    : 'bg-white text-slate-500 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {opt.icon}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Filtro de Origen */}
                            <div className="mb-6 px-2">
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origen</span>
                                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${originFilter === 'all' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-600'}`}>
                                            {originFilter === 'all' ? 'TODOS' : originFilter}
                                        </div>
                                    </div>
                                    <div className="p-2 flex gap-1">
                                        {[
                                            { id: 'all', label: 'Todos' },
                                            { id: 'LOCAL', label: 'Local' },
                                            { id: 'NO LOCAL', label: 'No Local' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setOriginFilter(opt.id)}
                                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${originFilter === opt.id
                                                    ? 'bg-amber-500 text-white shadow-md'
                                                    : 'bg-white text-slate-500 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* Jerarquía: Categoría > Subcategoría > Grupo */}
                            <div className="mb-6 px-1">
                                <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#065AA2]" />
                                    Categorías disponibles
                                </h4>

                                {Object.keys(filteredCategoryTree).map(cat => {
                                    const isCatSelected = selectedFilters.categories.includes(cat);
                                    const isExpanded = expandedCategories.includes(cat) || groupSearchTerm.length > 0;
                                    const hasSubcategories = filteredCategoryTree[cat].length > 0;

                                    return (
                                        <div key={cat} className="mb-2">
                                            {/* Nivel Categoría */}
                                            <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                {/* Botón de despliegue */}
                                                {hasSubcategories ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedCategories(prev =>
                                                                prev.includes(cat)
                                                                    ? prev.filter(c => c !== cat)
                                                                    : [...prev, cat]
                                                            );
                                                        }}
                                                        className="p-1 text-[#065AA2] bg-[#065AA2]/5 rounded hover:bg-[#065AA2]/10 transition-colors"
                                                    >
                                                        {isExpanded ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                                                    </button>
                                                ) : (
                                                    <div className="w-6" /> // Espaciador para cuando no hay subcategorías
                                                )}

                                                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-[#8ab733] rounded border-slate-300 focus:ring-[#8ab733]"
                                                        checked={isCatSelected}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setSelectedFilters(prev => ({
                                                                ...prev,
                                                                categories: checked
                                                                    ? [...prev.categories, cat]
                                                                    : prev.categories.filter(c => c !== cat)
                                                            }));
                                                        }}
                                                    />
                                                    <span className="font-bold text-slate-800 text-sm leading-tight">{cat}</span>
                                                </label>
                                            </div>

                                            {/* Nivel Subcategoría */}
                                            {isExpanded && (
                                                <div className="ml-8 mt-1 border-l-2 border-slate-100 pl-2 space-y-1">
                                                    {filteredCategoryTree[cat].map(subcat => {
                                                        const isSubcatSelected = selectedFilters.subcategories.includes(subcat);

                                                        return (
                                                            <div key={`${cat}-${subcat}`} className="mb-1">
                                                                <div className="flex items-center gap-2 p-1.5 bg-slate-50/50 rounded-md">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-3.5 h-3.5 text-[#004070] rounded border-slate-300 focus:ring-[#004070]"
                                                                        checked={isSubcatSelected}
                                                                        onChange={(e) => {
                                                                            const checked = e.target.checked;
                                                                            setSelectedFilters(prev => ({
                                                                                ...prev,
                                                                                subcategories: checked
                                                                                    ? [...prev.subcategories, subcat]
                                                                                    : prev.subcategories.filter(s => s !== subcat)
                                                                            }));
                                                                        }}
                                                                    />
                                                                    <span className="font-semibold text-slate-700 text-xs">{subcat}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {Object.keys(categoryTree).length === 0 && (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        No se encontraron categorías.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-5 bg-white border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedFilters({ categories: [], subcategories: [] });
                                    setGroupSearchTerm('');
                                }}
                                className="px-4 py-3 text-slate-500 text-sm font-bold border border-slate-200 rounded-xl hover:bg-slate-50"
                            >
                                Limpiar
                            </button>
                            <button
                                onClick={() => {
                                    setActiveFilters(selectedFilters);
                                    if (groupSearchTerm) {
                                        setSearchTerm(groupSearchTerm);
                                    }
                                    setShowCategoryExplorer(false);
                                    setActiveTab('products'); // Forzar cambio de pestaña al catálogo
                                    window.scrollTo(0, 0);    // Asegurar que el usuario vea los resultados desde arriba
                                }}
                                className="flex-1 py-4 bg-[#065AA2] text-white font-black rounded-xl shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                                <Search size={18} />
                                BUSCAR PRODUCTOS
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Dashboard;
