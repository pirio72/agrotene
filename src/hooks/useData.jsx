import { useState, useEffect } from 'react';
import Papa from 'papaparse';

// Nombres de archivos esperados (basado en la lógica de descarga)
// En una app real, esto podría venir de un manifiesto o listado dinámico.
// Para este MVP, asumiremos una lista de archivos conocidos o intentaremos cargar varios patrones.
// Dado que no podemos listar archivos del cliente con JS puro en navegador sin File System Access API (que requiere interacción),
// una estrategia es tener un JSON con la lista de archivos, o importar los CSVs si están en assets.
// PERO: Los datos están en `../../datos/mercatenerife`. Vite puede servir archivos fuera de src si se configura,
// o mejor: copiar los archivos a `public/data`.

// ESTRATEGIA: Copiar archivos a public/data para acceso fácil vía fetch.

// URL base de Google Sheets via GViz para evitar problemas de CORS y obtener CSV directo.
const DATA_SHEET_ID = '1EhTeUl1P0I014IkXwUM7rdGVM2roNxBPIehyf2oSUY4';
const GVIZ_URL_BASE = `https://docs.google.com/spreadsheets/d/${DATA_SHEET_ID}/gviz/tq?tqx=out:csv&gid=`;

const SHEET_GIDS = [
    { year: 2024, gid: '762683737' },
    { year: 2025, gid: '907415005' },
    { year: 2026, gid: '686943680' }
];

const INDICE_CATEGORIAS_GID = '1829963342';

const useData = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [dataSource, setDataSource] = useState('loading'); // 'cloud', 'error'

    const parseCSV = (csvText, diccionarioCategorias = null) => {
        return new Promise((resolve) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const normalized = results.data.map(item => {
                        // Función auxiliar para buscar valores en el objeto item ignorando mayúsculas/minúsculas y acentos
                        const getVal = (patterns) => {
                            const keys = Object.keys(item);
                            for (const pattern of patterns) {
                                const patternNorm = pattern.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                const foundKey = keys.find(k =>
                                    k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === patternNorm
                                );
                                if (foundKey && item[foundKey]) return item[foundKey];
                            }
                            return null;
                        };

                        let rawDate = getVal(['precio_fecha', 'fecha']);
                        let date = new Date(rawDate);
                        if (isNaN(date.getTime()) && typeof rawDate === 'string') {
                            const parts = rawDate.split('/');
                            if (parts.length === 3) {
                                date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                            }
                        }

                        let pName = (getVal(['producto_nombre', 'producto']) || '').trim().toUpperCase();
                        
                        let categoria = (getVal(['categoria', 'categoría']) || '').trim().toUpperCase();
                        let subcategoria = (getVal(['subcategoria', 'subcategoría']) || '').trim().toUpperCase();
                        let grupo = (getVal(['grupo']) || categoria || '').trim().toUpperCase();

                        // Fallback: usar el diccionario de categorías si la fila no trae la infor de las columnas directas
                        if ((!grupo || grupo === 'OTROS' || grupo === 'GENERAL') && diccionarioCategorias && pName) {
                            const dictEntry = diccionarioCategorias[pName];
                            if (dictEntry) {
                                grupo = dictEntry.grupo || grupo;
                                categoria = dictEntry.categoria || categoria;
                                subcategoria = dictEntry.subcategoria || subcategoria;
                            }
                        }

                        // Fallback legacy por si el diccionario tampoco tiene el dato
                        if (!grupo || grupo === 'OTROS' || grupo === 'GENERAL') {
                            if (pName.includes('ACELGA') || pName.includes('BERRO') || pName.includes('CILANTRO') || pName.includes('PEREJIL') || pName.includes('ALBAHACA') || pName.includes('LECHUGA') || pName.includes('ESPINACA')) {
                                grupo = 'HOJAS Y TALLOS';
                                categoria = 'HORTALIZAS';
                            } else if (pName.includes('AGUACATE') || pName.includes('PLATANO') || pName.includes('PIÑA') || pName.includes('COCO') || pName.includes('CHIRIMOYA') || pName.includes('MANGO') || pName.includes('PAPAYA')) {
                                grupo = 'TROPICAL';
                                categoria = 'FRUTAS';
                            } else if (pName.includes('AJO') || pName.includes('CEBOLLA') || pName.includes('PUERRO')) {
                                grupo = 'BULBOS';
                                categoria = 'HORTALIZAS';
                            } else if (pName.includes('CALABACIN') || pName.includes('BUBANGO') || pName.includes('PEPINO') || pName.includes('PIMIENTO') || pName.includes('TOMATE') || pName.includes('BERENJENA') || pName.includes('CALABAZA')) {
                                grupo = 'FRUTOS (HORTALIZAS)';
                                categoria = 'HORTALIZAS';
                            } else if (pName.includes('PAPA') || pName.includes('BATATA') || pName.includes('ÑAME')) {
                                grupo = 'TUBERCULOS';
                                categoria = 'HORTALIZAS';
                            } else if (pName.includes('ZANAHORIA') || pName.includes('RABANO') || pName.includes('BETERRADA') || pName.includes('NABO')) {
                                grupo = 'RAICES';
                                categoria = 'HORTALIZAS';
                            } else if (pName.includes('MANZANA') || pName.includes('PERA') || pName.includes('MELOCOTON') || pName.includes('CIRUELA') || pName.includes('CEREZA') || pName.includes('FRESA') || pName.includes('MELON') || pName.includes('SANDIA') || pName.includes('UVA') || pName.includes('NECTARINA') || pName.includes('PARAGUAYO')) {
                                grupo = 'FRUTA DULCE';
                                categoria = 'FRUTAS';
                            } else if (pName.includes('NARANJA') || pName.includes('LIMON') || pName.includes('MANDARINA') || pName.includes('LIMA') || pName.includes('POMELO')) {
                                grupo = 'CITRICOS';
                                categoria = 'FRUTAS';
                            } else if (pName.includes('COL') || pName.includes('BRECOL') || pName.includes('COLIFLOR') || pName.includes('ALCACHOFA')) {
                                grupo = 'INFLORESCENCIAS Y COLES';
                                categoria = 'HORTALIZAS';
                            } else if (pName.includes('JUDIA') || pName.includes('ARVEJA')) {
                                grupo = 'LEGUMINA';
                                categoria = 'HORTALIZAS';
                            } else {
                                grupo = 'OTROS';
                                categoria = 'OTROS';
                            }
                        }

                        return {
                            ...item,
                            producto_nombre: pName,
                            precio_fecha: isNaN(date.getTime()) ? new Date() : date,
                            precio_moda: parseFloat(String(getVal(['precio_moda', 'precio']) || 0).replace(',', '.')),
                            precio_minimo: parseFloat(String(getVal(['precio_minimo', 'minimo']) || 0).replace(',', '.')),
                            precio_maximo: parseFloat(String(getVal(['precio_maximo', 'maximo']) || 0).replace(',', '.')),
                            categoria: categoria || 'GENERAL',
                            subcategoria: subcategoria || 'GENERAL',
                            grupo: grupo || 'GENERAL',
                        };
                    }).filter(item => !isNaN(item.precio_moda));
                    resolve(normalized);
                }
            });
        });
    };

    useEffect(() => {
        const loadDatasets = async () => {
            setLoading(true);
            let allData = [];
            let source = 'local';

            try {
                console.log("--- INICIANDO CARGA DE DATOS ---");

                // 1. Cargar el diccionario de categorías primero
                let diccionarioCategorias = {};
                try {
                    const dictUrl = `${GVIZ_URL_BASE}${INDICE_CATEGORIAS_GID}`;
                    console.log(`Cargando diccionario de categorías: ${dictUrl}`);
                    const dictResp = await fetch(dictUrl);
                    if (dictResp.ok) {
                        const dictText = await dictResp.text();
                        console.log("Parseando diccionario...");
                        diccionarioCategorias = await new Promise((resolve) => {
                            Papa.parse(dictText, {
                                header: true,
                                skipEmptyLines: true,
                                complete: (results) => {
                                    const dict = {};
                                    results.data.forEach(row => {
                                        const pName = (row.producto_diccionario || row.producto_mostrar || '').trim().toUpperCase();
                                        if (pName) {
                                            dict[pName] = {
                                                categoria: (row.categoria || '').trim().toUpperCase(),
                                                subcategoria: (row.subcategoria || '').trim().toUpperCase(),
                                                grupo: (row.grupo || '').trim().toUpperCase()
                                            };
                                        }
                                    });
                                    resolve(dict);
                                }
                            });
                        });
                        console.log(`Diccionario cargado con ${Object.keys(diccionarioCategorias).length} productos.`);
                    } else {
                        console.warn(`Error al cargar diccionario: ${dictResp.status}`);
                    }
                } catch(e) {
                     console.warn(`Error de red cargando diccionario:`, e);
                }

                // 2. Cargar los datos de los años usando el diccionario
                const cloudResults = [];
                for (const sheet of SHEET_GIDS) {
                    console.log(`Intentando cargar año ${sheet.year} (GID: ${sheet.gid})...`);
                    try {
                        const url = `${GVIZ_URL_BASE}${sheet.gid}`;
                        console.log(`URL de consulta pública: ${url}`);

                        const resp = await fetch(url);
                        console.log(`Respuesta Hoja ${sheet.year}: ${resp.status} ${resp.statusText}`);

                        if (resp.ok) {
                            const text = await resp.text();
                            console.log(`Datos recibidos para ${sheet.year}, parseando...`);
                            const parsed = await parseCSV(text, diccionarioCategorias);
                            console.log(`Parsed ${parsed.length} filas para ${sheet.year}`);
                            cloudResults.push(...parsed);
                        } else {
                            console.error(`Error en hoja ${sheet.year}: Código ${resp.status}`);
                        }
                    } catch (e) {
                        console.warn(`Error de red cargando hoja ${sheet.year}:`, e);
                    }
                }

                if (cloudResults.length > 0) {
                    allData = cloudResults;
                    source = 'cloud';
                    console.log("✅ Carga desde la nube completada con éxito.");
                }

                if (allData.length === 0) {
                    throw new Error("No hay datos disponibles en ninguna fuente.");
                }

                // Ordenar por fecha descendente
                allData.sort((a, b) => b.precio_fecha - a.precio_fecha);

                setData(allData);
                setLastUpdate(allData[0].precio_fecha);
                setDataSource(source);
                setLoading(false);

            } catch (err) {
                console.error("❌ ERROR CRÍTICO EN USEDATA:", err);
                setError(err.message);
                setLoading(false);
                setDataSource('error');
            }
        };

        loadDatasets();
    }, []);

    return { data, loading, error, lastUpdate, dataSource };
};

export default useData;
