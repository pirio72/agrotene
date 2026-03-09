import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const ChartView = ({ data, productName, timeRange }) => {
    // ... (lógica anterior de procesamiento de fechas)
    const yearsSet = new Set(data.map(d => d.precio_fecha.getFullYear()));
    const showYear = yearsSet.size > 1;

    const formattedData = data.map(item => ({
        ...item,
        timestamp: item.precio_fecha.getTime(),
        // Formato para Area: [min, max]
        range: [item.precio_minimo, item.precio_maximo],
        dateStr: item.precio_fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: showYear ? '2-digit' : undefined
        }),
        fullDate: item.precio_fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    })).sort((a, b) => a.timestamp - b.timestamp);

    if (!data || data.length === 0) return <div className="text-center p-4 text-slate-400">Sin datos para mostrar</div>;

    const minTime = Math.min(...formattedData.map(d => d.timestamp));
    const maxTime = Math.max(...formattedData.map(d => d.timestamp));

    // Forzamos un re-render total cuando cambia el producto o la vista (años) para evitar basura en los ejes
    const chartKey = `${productName}-${formattedData.length}-${showYear}-${timeRange}`;

    // Calculamos ticks según el rango de tiempo
    let ticks = [
        minTime,
        minTime + (maxTime - minTime) * 0.33,
        minTime + (maxTime - minTime) * 0.66,
        maxTime
    ];

    if (timeRange === 'all') {
        const startYear = new Date(minTime).getFullYear();
        const endYear = new Date(maxTime).getFullYear();
        const yearTicks = [];
        for (let y = startYear; y <= endYear; y++) {
            yearTicks.push(new Date(y, 0, 1).getTime());
        }
        if (yearTicks.length > 0) ticks = yearTicks;
    } else if (timeRange === 'year') {
        const year = new Date(minTime).getFullYear();
        const monthsFound = new Set();
        data.forEach(d => monthsFound.add(d.precio_fecha.getMonth()));
        ticks = Array.from(monthsFound)
            .sort((a, b) => a - b)
            .map(m => new Date(year, m, 1).getTime());
    }

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-72 w-full">
            <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Evolución e Intervalo de Precios</h4>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart key={chartKey} data={formattedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={timeRange === 'all' ? ['auto', 'auto'] : [minTime, maxTime]}
                        ticks={ticks}
                        tickFormatter={(unixTime) => {
                            const date = new Date(unixTime);
                            if (timeRange === 'week' || timeRange === 'month') {
                                const d = date.getDate().toString().padStart(2, '0');
                                const m = (date.getMonth() + 1).toString().padStart(2, '0');
                                return `${d}/${m}`;
                            }
                            if (timeRange === 'year') {
                                return date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
                            }
                            if (timeRange === 'all') {
                                return date.getFullYear().toString();
                            }
                            return date.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short'
                            });
                        }}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={0}
                        padding={{ left: 10, right: 30 }}
                        scale="time"
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={35}
                        unit="€"
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '4px', display: 'block' }}
                        itemStyle={{ padding: '2px 0' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    />

                    {/* Área de rango Min-Max - Recharts 3.x prefiere dataKey directo para áreas de rango */}
                    <Area
                        type="stepAfter"
                        dataKey="range"
                        stroke="none"
                        fill="#065AA2"
                        fillOpacity={0.1}
                        name="Intervalo Min-Max"
                        connectNulls={false}
                        tooltipType="none"
                    />

                    {/* Línea de Máximo (sutil) */}
                    <Line
                        type="stepAfter"
                        dataKey="precio_maximo"
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        dot={false}
                        name="Máximo"
                        activeDot={false}
                    />

                    {/* Línea de Mínimo (sutil) */}
                    <Line
                        type="stepAfter"
                        dataKey="precio_minimo"
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        dot={false}
                        name="Mínimo"
                        activeDot={false}
                    />

                    {/* Línea Principal (Moda) */}
                    <Line
                        type="stepAfter"
                        dataKey="precio_moda"
                        stroke="#065AA2"
                        strokeWidth={3}
                        dot={false}
                        name="Precio más habitual"
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        connectNulls={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ChartView;
