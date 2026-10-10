/* ============================================================
   GEOVALOR ORIENTE
   Sistema Web GIS para valores del suelo
   ============================================================ */


/* ============================================================
   VARIABLES PRINCIPALES
   ============================================================ */

let map;

let baseMap;

let drawnItems;

let drawControl;

let capasCargadas = [];

let terrenos = [];

let capaTerrenos = null;

let medicionActiva = false;

let tipoMedicion = null;

let medicionPuntos = [];

let medicionLayer = null;

let toastTimer;


/* ============================================================
   INICIO
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    iniciarAplicacion
);


function iniciarAplicacion() {

    console.log(
        "GeoValor Oriente iniciado correctamente."
    );

    console.log(
        "Sistema de mapas: Leaflet"
    );

    console.log(
        "Datos geográficos: GeoJSON / GeoPackage"
    );


    inicializarMapa();

    inicializarDibujo();

    configurarEventos();

    actualizarEstadisticas();

    actualizarListaCapas();

    actualizarComparacion();


    // Soluciona problemas de tamaño del mapa
    setTimeout(
        () => map.invalidateSize(),
        300
    );
}


/* ============================================================
   MAPA
   ============================================================ */

function inicializarMapa() {

    map = L.map("map", {
        zoomControl: true,
        preferCanvas: true
    }).setView([14.8000, -89.5400], 13);

    /*
      Mapas base:
      - OpenStreetMap: mapa de calles comunitario.
      - Esri World Street Map: alternativa de calles si OSM no carga.
      - Esri World Imagery: imagen satelital.
    */
    const openStreetMap = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }
    );

    const esriCalles = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 19,
            attribution: "Tiles &copy; Esri"
        }
    );

    const mapaSatelital = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 19,
            attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
        }
    );

    // Usar el mapa de calles de Esri como base inicial para evitar
    // que un bloqueo de los servidores OSM deje el mapa en blanco.
    baseMap = esriCalles;
    baseMap.addTo(map);

    L.control.layers(
        {
            "OpenStreetMap": openStreetMap,
            "Mapa de calles (alternativo)": esriCalles,
            "Mapa satelital": mapaSatelital
        },
        null,
        {
            collapsed: false,
            position: "topright"
        }
    ).addTo(map);

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    window.addEventListener("resize", () => {
        setTimeout(() => map.invalidateSize(), 150);
    });
}

/* ============================================================
   HERRAMIENTAS DE DIBUJO
   ============================================================ */

function inicializarDibujo() {

    drawControl = new L.Control.Draw(
        {
            position: "topleft",

            edit: {
                featureGroup: drawnItems
            },

            draw: {

                polygon: {
                    allowIntersection: false,

                    showArea: true,

                    metric: true,

                    shapeOptions: {
                        weight: 3
                    }
                },

                polyline: {

                    shapeOptions: {
                        weight: 4
                    }
                },

                rectangle: {

                    shapeOptions: {
                        weight: 3
                    }
                },

                circle: {

                    shapeOptions: {
                        weight: 3
                    }
                },

                marker: true,

                circlemarker: false
            }
        }
    );


    map.addControl(
        drawControl
    );


    /* ELEMENTO CREADO */

    map.on(
        L.Draw.Event.CREATED,
        function (event) {

            const layer =
                event.layer;


            drawnItems.addLayer(
                layer
            );


            configurarPopupDibujo(
                layer
            );


            if (
                event.layerType ===
                "polyline"
            ) {

                const metros =
                    calcularLongitud(
                        layer.getLatLngs()
                    );

                mostrarToast(
                    "Distancia: " +
                    formatearDistancia(
                        metros
                    )
                );
            }


            if (
                event.layerType ===
                "polygon"
            ) {

                const area =
                    calcularArea(
                        layer.getLatLngs()
                    );

                mostrarToast(
                    "Área: " +
                    formatearArea(
                        area
                    )
                );
            }


            if (
                event.layerType ===
                "rectangle"
            ) {

                const area =
                    calcularArea(
                        layer.getLatLngs()
                    );

                mostrarToast(
                    "Área: " +
                    formatearArea(
                        area
                    )
                );
            }


            if (
                event.layerType ===
                "circle"
            ) {

                const area =
                    Math.PI *
                    Math.pow(
                        layer.getRadius(),
                        2
                    );

                mostrarToast(
                    "Área del círculo: " +
                    formatearArea(
                        area
                    )
                );
            }

        }
    );


    /* ELEMENTO EDITADO */

    map.on(
        L.Draw.Event.EDITED,
        function (event) {

            event.layers.eachLayer(
                function (layer) {

                    if (
                        layer instanceof
                        L.Polyline
                    ) {

                        if (
                            !(
                                layer instanceof
                                L.Polygon
                            )
                        ) {

                            const metros =
                                calcularLongitud(
                                    layer.getLatLngs()
                                );

                            mostrarToast(
                                "Distancia actualizada: " +
                                formatearDistancia(
                                    metros
                                )
                            );
                        }
                    }
                }
            );

        }
    );


    /* ELEMENTO ELIMINADO */

    map.on(
        L.Draw.Event.DELETED,
        function () {

            mostrarToast(
                "Elemento eliminado."
            );

        }
    );
}


/* ============================================================
   POPUP DE DIBUJO
   ============================================================ */

function configurarPopupDibujo(
    layer
) {

    let texto =
        "<strong>Elemento dibujado</strong>";


    if (
        layer instanceof
        L.Circle
    ) {

        const radio =
            layer.getRadius();

        const area =
            Math.PI *
            radio *
            radio;

        texto +=
            "<br>Radio: " +
            formatearDistancia(
                radio
            );

        texto +=
            "<br>Área: " +
            formatearArea(
                area
            );
    }


    if (
        layer instanceof
        L.Polyline &&
        !(
            layer instanceof
            L.Polygon
        )
    ) {

        const distancia =
            calcularLongitud(
                layer.getLatLngs()
            );

        texto +=
            "<br>Distancia: " +
            formatearDistancia(
                distancia
            );
    }


    if (
        layer instanceof
        L.Polygon
    ) {

        const area =
            calcularArea(
                layer.getLatLngs()
            );

        texto +=
            "<br>Área: " +
            formatearArea(
                area
            );
    }


    layer.bindPopup(
        texto
    );
}


/* ============================================================
   EVENTOS
   ============================================================ */

function configurarEventos() {


    /* GPKG */

    document
        .getElementById(
            "gpkgInput"
        )
        .addEventListener(
            "change",
            async function (event) {

                const file =
                    event.target.files[0];

                if (!file) return;

                await cargarGeoPackage(
                    file
                );

                event.target.value = "";
            }
        );


    /* GEOJSON */

    document
        .getElementById(
            "geojsonInput"
        )
        .addEventListener(
            "change",
            async function (event) {

                const file =
                    event.target.files[0];

                if (!file) return;

                await cargarGeoJSON(
                    file
                );

                event.target.value = "";
            }
        );


    /* MEDIR DISTANCIA */

    document
        .getElementById(
            "btnMedirDistancia"
        )
        .addEventListener(
            "click",
            iniciarMedicionDistancia
        );


    /* MEDIR ÁREA */

    document
        .getElementById(
            "btnMedirArea"
        )
        .addEventListener(
            "click",
            iniciarMedicionArea
        );


    /* DIBUJAR */

    document
        .getElementById(
            "btnDibujar"
        )
        .addEventListener(
            "click",
            () => {

                mostrarToast(
                    "Utiliza las herramientas de dibujo del mapa."
                );

            }
        );


    /* EDITAR */

    document
        .getElementById(
            "btnEditar"
        )
        .addEventListener(
            "click",
            () => {

                mostrarToast(
                    "Utiliza el botón de edición de Leaflet."
                );

            }
        );


    /* LIMPIAR */

    document
        .getElementById(
            "btnLimpiarDibujos"
        )
        .addEventListener(
            "click",
            limpiarDibujos
        );


    /* EXPORTAR */

    document
        .getElementById(
            "btnExportarDibujos"
        )
        .addEventListener(
            "click",
            exportarDibujos
        );


    /* COMPARAR */

    document
        .getElementById(
            "btnComparar"
        )
        .addEventListener(
            "click",
            compararGrupos
        );


    /* NAVEGACIÓN */

    document
        .querySelectorAll(
            ".nav-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function () {

                        document
                            .querySelectorAll(
                                ".nav-button"
                            )
                            .forEach(
                                b =>
                                    b.classList.remove(
                                        "active"
                                    )
                            );


                        this.classList.add(
                            "active"
                        );


                        const section =
                            this.dataset.section;


                        if (
                            section ===
                            "mapa"
                        ) {

                            map.invalidateSize();

                        }


                        if (
                            section ===
                            "capas"
                        ) {

                            document
                                .querySelector(
                                    ".left-panel"
                                )
                                .scrollTo(
                                    {
                                        top: 0,
                                        behavior:
                                            "smooth"
                                    }
                                );
                        }


                        if (
                            section ===
                            "medicion"
                        ) {

                            document
                                .getElementById(
                                    "btnMedirDistancia"
                                )
                                .scrollIntoView(
                                    {
                                        behavior:
                                            "smooth"
                                    }
                                );
                        }


                        if (
                            section ===
                            "comparar"
                        ) {

                            document
                                .getElementById(
                                    "compareA"
                                )
                                .scrollIntoView(
                                    {
                                        behavior:
                                            "smooth"
                                    }
                                );
                        }


                        if (
                            section ===
                            "estadisticas"
                        ) {

                            document
                                .querySelector(
                                    ".right-panel"
                                )
                                .scrollTo(
                                    {
                                        top: 0,
                                        behavior:
                                            "smooth"
                                    }
                                );
                        }

                    }
                );
            }
        );
}


/* ============================================================
   CARGAR GEOPACKAGE
   ============================================================ */

async function cargarGeoPackage(
    file
) {

    mostrarCarga(
        true,
        "Abriendo GeoPackage..."
    );


    try {

        console.log(
            "Archivo seleccionado:",
            file.name
        );


        /* VERIFICAR LIBRERÍA */

        if (
            !window.GeoPackage
        ) {

            throw new Error(
                "La librería GeoPackage JS no se cargó."
            );
        }


        const {
            GeoPackageAPI,
            setSqljsWasmLocateFile
        } =
            window.GeoPackage;


        if (
            !GeoPackageAPI
        ) {

            throw new Error(
                "GeoPackageAPI no está disponible."
            );
        }


        /* UBICACIÓN DEL WASM */

        setSqljsWasmLocateFile(
            function (filename) {

                return (
                    "https://unpkg.com/" +
                    "@ngageoint/geopackage/" +
                    "dist/" +
                    filename
                );

            }
        );


        /* LEER ARCHIVO */

        mostrarCarga(
            true,
            "Leyendo archivo..."
        );


        const buffer =
            await file.arrayBuffer();


        const bytes =
            new Uint8Array(
                buffer
            );


        console.log(
            "Tamaño del archivo:",
            bytes.length,
            "bytes"
        );


        /* ABRIR */

        mostrarCarga(
            true,
            "Abriendo base de datos espacial..."
        );


        const gpkg =
            await GeoPackageAPI.open(
                bytes
            );


        console.log(
            "GeoPackage abierto:",
            gpkg
        );


        /* TABLAS */

        const featureTables =
            await gpkg.getFeatureTables();


        console.log(
            "Tablas vectoriales:",
            featureTables
        );


        if (
            !featureTables ||
            featureTables.length === 0
        ) {

            throw new Error(
                "El GeoPackage no contiene capas vectoriales."
            );
        }


        let totalFeatures = 0;


        /* RECORRER TABLAS */

        for (
            const tableName
            of featureTables
        ) {

            mostrarCarga(
                true,
                "Cargando capa: " +
                tableName
            );


            console.log(
                "Procesando tabla:",
                tableName
            );


            const featureDao =
                gpkg.getFeatureDao(
                    tableName
                );


            const info =
                await gpkg.getInfoForTable(
                    featureDao
                );


            const geojsonFeatures = [];


            const iterator =
                featureDao.queryForEach();


            for (
                const row
                of iterator
            ) {

                const feature =
                    featureDao.getRow(
                        row
                    );


                if (
                    !feature ||
                    !feature.geometry
                ) {

                    continue;
                }


                const geometryData =
                    feature.geometry;


                const geometry =
                    geometryData.geometry;


                if (!geometry) {

                    continue;
                }


                const geojson =
                    geometry.toGeoJSON();


                geojson.properties = {};


                /* NOMBRE DE TABLA */

                geojson.properties[
                    "_capa"
                ] =
                    tableName;


                /* ATRIBUTOS */

                for (
                    const key
                    in feature.values
                ) {

                    if (
                        !Object.prototype
                            .hasOwnProperty
                            .call(
                                feature.values,
                                key
                            )
                    ) {

                        continue;
                    }


                    if (
                        feature.geometryColumn &&
                        key ===
                        feature.geometryColumn.name
                    ) {

                        continue;
                    }


                    let nombreCampo =
                        key;


                    if (
                        info &&
                        info.columnMap &&
                        info.columnMap[key]
                    ) {

                        nombreCampo =
                            info.columnMap[
                                key
                            ].displayName ||
                            key;
                    }


                    geojson.properties[
                        nombreCampo
                    ] =
                        feature.values[
                            key
                        ];
                }


                geojsonFeatures.push(
                    geojson
                );

            }


            totalFeatures +=
                geojsonFeatures.length;


            console.log(
                "Características:",
                geojsonFeatures.length
            );


            if (
                geojsonFeatures.length === 0
            ) {

                continue;
            }


            /* GEOJSON COMPLETO */

            const collection = {

                type:
                    "FeatureCollection",

                features:
                    geojsonFeatures
            };


            /* AGREGAR CAPA */

            const layer =
                crearCapaGeoJSON(
                    collection,
                    tableName
                );


            layer.addTo(
                map
            );


            const layerInfo = {

                id:
                    crearId(),

                nombre:
                    tableName,

                tipo:
                    "GeoPackage",

                capa:
                    layer,

                features:
                    geojsonFeatures,

                archivo:
                    file.name
            };


            capasCargadas.push(
                layerInfo
            );


            /* SI CONTIENE VALORES DEL SUELO */

            procesarTerrenos(
                geojsonFeatures,
                layerInfo
            );

        }


        actualizarListaCapas();

        actualizarEstadisticas();

        actualizarComparacion();


        /* ENFOCAR DATOS */

        const grupo =
            L.featureGroup(
                capasCargadas.map(
                    item => item.capa
                )
            );


        if (
            grupo.getBounds().isValid()
        ) {

            map.fitBounds(
                grupo.getBounds(),
                {
                    padding: [
                        40,
                        40
                    ],

                    maxZoom: 16
                }
            );
        }


        mostrarCarga(
            false
        );


        mostrarToast(
            "GeoPackage cargado correctamente: " +
            totalFeatures +
            " elementos."
        );


        actualizarEstadoMapa(
            "GeoPackage cargado: " +
            totalFeatures +
            " elementos."
        );


        console.log(
            "GeoPackage cargado correctamente."
        );

    } catch (error) {

        console.error(
            "ERROR COMPLETO AL ABRIR GEOPACKAGE:",
            error
        );


        mostrarCarga(
            false
        );


        let mensaje =
            error &&
            error.message
                ? error.message
                : String(error);


        alert(
            "No fue posible abrir el GeoPackage.\n\n" +
            "Detalle:\n" +
            mensaje +
            "\n\n" +
            "Revisa también la consola del navegador (F12)."
        );


        mostrarToast(
            "Error al abrir el GeoPackage."
        );
    }
}


/* ============================================================
   CARGAR GEOJSON
   ============================================================ */

async function cargarGeoJSON(
    file
) {

    mostrarCarga(
        true,
        "Leyendo GeoJSON..."
    );


    try {

        const texto =
            await file.text();


        const geojson =
            JSON.parse(
                texto
            );


        if (
            !geojson ||
            (
                geojson.type !==
                "FeatureCollection" &&
                geojson.type !==
                "Feature"
            )
        ) {

            throw new Error(
                "El archivo no contiene un GeoJSON válido."
            );
        }


        const collection =
            geojson.type ===
            "Feature"
                ? {
                    type:
                        "FeatureCollection",

                    features:
                        [geojson]
                }
                : geojson;


        const nombre =
            file.name.replace(
                /\.[^/.]+$/,
                ""
            );


        const layer =
            crearCapaGeoJSON(
                collection,
                nombre
            );


        layer.addTo(
            map
        );


        const layerInfo = {

            id:
                crearId(),

            nombre:
                nombre,

            tipo:
                "GeoJSON",

            capa:
                layer,

            features:
                collection.features,

            archivo:
                file.name
        };


        capasCargadas.push(
            layerInfo
        );


        procesarTerrenos(
            collection.features,
            layerInfo
        );


        actualizarListaCapas();

        actualizarEstadisticas();

        actualizarComparacion();


        if (
            layer.getBounds().isValid()
        ) {

            map.fitBounds(
                layer.getBounds(),
                {
                    padding: [
                        40,
                        40
                    ],

                    maxZoom: 16
                }
            );
        }


        mostrarCarga(
            false
        );


        mostrarToast(
            "GeoJSON cargado correctamente."
        );


    } catch (error) {

        console.error(
            "Error GeoJSON:",
            error
        );


        mostrarCarga(
            false
        );


        alert(
            "No fue posible abrir el GeoJSON.\n\n" +
            error.message
        );
    }
}


/* ============================================================
   CREAR CAPA GEOJSON
   ============================================================ */

function crearCapaGeoJSON(
    geojson,
    nombre
) {

    const layer =
        L.geoJSON(
            geojson,
            {

                pointToLayer:
                    function (
                        feature,
                        latlng
                    ) {

                        const valor =
                            obtenerValorSuelo(
                                feature.properties
                            );


                        const color =
                            colorPorValor(
                                valor
                            );


                        return L.circleMarker(
                            latlng,
                            {

                                radius:
                                    8,

                                fillColor:
                                    color,

                                color:
                                    color,

                                weight:
                                    2,

                                opacity:
                                    1,

                                fillOpacity:
                                    0.75
                            }
                        );
                    },


                style:
                    function (
                        feature
                    ) {

                        const valor =
                            obtenerValorSuelo(
                                feature.properties
                            );


                        const color =
                            colorPorValor(
                                valor
                            );


                        return {

                            color:
                                color,

                            weight:
                                3,

                            fillColor:
                                color,

                            fillOpacity:
                                0.25
                        };
                    },


                onEachFeature:
                    function (
                        feature,
                        layer
                    ) {

                        crearPopup(
                            feature,
                            layer
                        );


                        layer.on(
                            "click",
                            function () {

                                mostrarInformacionTerreno(
                                    feature.properties
                                );

                            }
                        );
                    }
            }
        );


    return layer;
}


/* ============================================================
   POPUP
   ============================================================ */

function crearPopup(
    feature,
    layer
) {

    const properties =
        feature.properties ||
        {};


    let html =
        '<div class="popup-title">' +
        "Información del terreno" +
        "</div>";


    html +=
        '<table class="popup-table">';


    for (
        const key in properties
    ) {

        if (
            key === "_capa"
        ) {

            continue;
        }


        const value =
            properties[key];


        html +=
            "<tr>" +
            "<td>" +
            escaparHTML(key) +
            "</td>" +
            "<td>" +
            escaparHTML(
                formatearValorPopup(
                    key,
                    value
                )
            ) +
            "</td>" +
            "</tr>";
    }


    html +=
        "</table>";


    /* COORDENADAS */

    if (
        feature.geometry &&
        feature.geometry.type ===
            "Point"
    ) {

        const coords =
            feature.geometry
                .coordinates;


        html +=
            "<br><strong>Coordenadas</strong>" +
            "<br>Longitud: " +
            Number(
                coords[0]
            ).toFixed(6) +
            "<br>Latitud: " +
            Number(
                coords[1]
            ).toFixed(6);
    }


    layer.bindPopup(
        html,
        {
            maxWidth: 360
        }
    );
}


/* ============================================================
   PROCESAR TERRENOS
   ============================================================ */

function procesarTerrenos(
    features,
    layerInfo
) {

    features.forEach(
        feature => {

            const p =
                feature.properties ||
                {};


            const valor =
                obtenerValorSuelo(
                    p
                );


            const lat =
                obtenerLatitud(
                    feature
                );


            const lng =
                obtenerLongitud(
                    feature
                );


            terrenos.push({

                feature:
                    feature,

                properties:
                    p,

                valor:
                    valor,

                lat:
                    lat,

                lng:
                    lng,

                capa:
                    layerInfo.nombre,

                layerInfo:
                    layerInfo
            });

        }
    );


    console.log(
        "Terrenos acumulados:",
        terrenos.length
    );
}


/* ============================================================
   OBTENER VALOR DEL SUELO
   ============================================================ */

function obtenerValorSuelo(
    properties
) {

    if (!properties) {

        return null;
    }


    const claves = [

        "Valor del suelo actual (Dólares)",

        "Valor del suelo",

        "valor del suelo",

        "valor_suelo",

        "valor_suelo_actual",

        "valor",

        "value",

        "precio",

        "price",

        "Valor",

        "VALOR"
    ];


    for (
        const clave
        of claves
    ) {

        if (
            properties[clave] !==
            undefined &&
            properties[clave] !==
            null &&
            properties[clave] !==
            ""
        ) {

            const numero =
                convertirNumero(
                    properties[clave]
                );


            if (
                Number.isFinite(
                    numero
                )
            ) {

                return numero;
            }
        }
    }


    /* BUSCAR POR NOMBRE */

    for (
        const key in properties
    ) {

        const nombre =
            key.toLowerCase();


        if (
            nombre.includes(
                "valor"
            ) ||
            nombre.includes(
                "precio"
            )
        ) {

            const numero =
                convertirNumero(
                    properties[key]
                );


            if (
                Number.isFinite(
                    numero
                )
            ) {

                return numero;
            }
        }
    }


    return null;
}


/* ============================================================
   NÚMERO
   ============================================================ */

function convertirNumero(
    valor
) {

    if (
        typeof valor ===
        "number"
    ) {

        return valor;
    }


    if (
        typeof valor !==
        "string"
    ) {

        return NaN;
    }


    let texto =
        valor
            .replace(
                /[$Q,\s]/g,
                ""
            )
            .replace(
                /m²/gi,
                ""
            );


    /* Decimal con coma */

    if (
        texto.includes(",") &&
        !texto.includes(".")
    ) {

        texto =
            texto.replace(
                ",",
                "."
            );
    }


    return Number(
        texto
    );
}


/* ============================================================
   COORDENADAS
   ============================================================ */

function obtenerLatitud(
    feature
) {

    const p =
        feature.properties ||
        {};


    const posibles = [

        "Latitud",
        "latitud",
        "latitude",
        "LATITUD",
        "lat",
        "y"
    ];


    for (
        const key
        of posibles
    ) {

        if (
            p[key] !==
            undefined
        ) {

            const n =
                Number(
                    p[key]
                );


            if (
                Number.isFinite(n)
            ) {

                return n;
            }
        }
    }


    if (
        feature.geometry &&
        feature.geometry.type ===
            "Point"
    ) {

        return Number(
            feature.geometry.coordinates[1]
        );
    }


    return null;
}


function obtenerLongitud(
    feature
) {

    const p =
        feature.properties ||
        {};


    const posibles = [

        "Longitud",
        "longitud",
        "longitude",
        "LONGITUD",
        "lng",
        "lon",
        "x"
    ];


    for (
        const key
        of posibles
    ) {

        if (
            p[key] !==
            undefined
        ) {

            const n =
                Number(
                    p[key]
                );


            if (
                Number.isFinite(n)
            ) {

                return n;
            }
        }
    }


    if (
        feature.geometry &&
        feature.geometry.type ===
            "Point"
    ) {

        return Number(
            feature.geometry.coordinates[0]
        );
    }


    return null;
}


/* ============================================================
   COLOR SEGÚN VALOR
   ============================================================ */

function colorPorValor(
    valor
) {

    if (
        valor === null ||
        !Number.isFinite(valor)
    ) {

        return "#2d789d";
    }


    if (
        valor <= 50
    ) {

        return "#48b64b";
    }


    if (
        valor <= 100
    ) {

        return "#d8d832";
    }


    if (
        valor <= 200
    ) {

        return "#f5a623";
    }


    return "#ef553b";
}


/* ============================================================
   ESTADÍSTICAS
   ============================================================ */

function actualizarEstadisticas() {

    const valores =
        terrenos
            .map(
                t => t.valor
            )
            .filter(
                v =>
                    Number.isFinite(v)
            );


    const count =
        valores.length;


    const average =
        count
            ? valores.reduce(
                (
                    suma,
                    valor
                ) =>
                    suma + valor,
                0
            ) / count
            : null;


    const max =
        count
            ? Math.max(
                ...valores
            )
            : null;


    const min =
        count
            ? Math.min(
                ...valores
            )
            : null;


    document
        .getElementById(
            "statCount"
        )
        .textContent =
            count;


    document
        .getElementById(
            "statAverage"
        )
        .textContent =
            average !== null
                ? "USD " +
                  formatearNumero(
                      average
                  )
                : "—";


    document
        .getElementById(
            "statMax"
        )
        .textContent =
            max !== null
                ? "USD " +
                  formatearNumero(
                      max
                  )
                : "—";


    document
        .getElementById(
            "statMin"
        )
        .textContent =
            min !== null
                ? "USD " +
                  formatearNumero(
                      min
                  )
                : "—";


    const area =
        calcularAreaRegistrada();


    document
        .getElementById(
            "statArea"
        )
        .textContent =
            area > 0
                ? formatearArea(
                    area
                )
                : "—";


    actualizarGrafico();
}


/* ============================================================
   ÁREA REGISTRADA
   ============================================================ */

function calcularAreaRegistrada() {

    let area = 0;


    terrenos.forEach(
        terreno => {

            const p =
                terreno.properties;


            const posibles = [

                "Área",

                "area",

                "Area",

                "Área del terreno",

                "area_m2",

                "Area_m2",

                "Superficie"
            ];


            for (
                const key
                of posibles
            ) {

                if (
                    p[key] !==
                    undefined
                ) {

                    const valor =
                        convertirNumero(
                            p[key]
                        );


                    if (
                        Number.isFinite(
                            valor
                        )
                    ) {

                        area +=
                            valor;

                        break;
                    }
                }
            }

        }
    );


    return area;
}


/* ============================================================
   GRÁFICO
   ============================================================ */

function actualizarGrafico() {

    const container =
        document.getElementById(
            "valueChart"
        );


    if (
        terrenos.length === 0
    ) {

        container.innerHTML =
            '<div class="chart-empty">' +
            "Carga un GeoPackage o GeoJSON " +
            "para ver la distribución." +
            "</div>";

        return;
    }


    const rangos = [

        {
            nombre:
                "0 – 50",

            min:
                0,

            max:
                50,

            color:
                "#48b64b"
        },

        {
            nombre:
                "50 – 100",

            min:
                50,

            max:
                100,

            color:
                "#d8d832"
        },

        {
            nombre:
                "100 – 200",

            min:
                100,

            max:
                200,

            color:
                "#f5a623"
        },

        {
            nombre:
                "> 200",

            min:
                200,

            max:
                Infinity,

            color:
                "#ef553b"
        }
    ];


    const cantidades =
        rangos.map(
            rango =>
                terrenos.filter(
                    t =>
                        Number.isFinite(
                            t.valor
                        ) &&
                        t.valor >=
                            rango.min &&
                        (
                            rango.max ===
                                Infinity
                                ? true
                                : t.valor <
                                  rango.max
                        )
                ).length
        );


    const maxCantidad =
        Math.max(
            ...cantidades,
            1
        );


    let html = "";


    rangos.forEach(
        (
            rango,
            index
        ) => {

            const cantidad =
                cantidades[index];


            const porcentaje =
                (
                    cantidad /
                    maxCantidad
                ) *
                100;


            html +=
                '<div class="bar-chart-row">' +

                '<div class="bar-label">' +
                rango.nombre +
                "</div>" +

                '<div class="bar-track">' +

                '<div class="bar-fill" ' +
                'style="width:' +
                porcentaje +
                '%;background:' +
                rango.color +
                '"></div>' +

                "</div>" +

                '<div class="bar-value">' +
                cantidad +
                "</div>" +

                "</div>";
        }
    );


    container.innerHTML =
        html;
}


/* ============================================================
   INFORMACIÓN DEL TERRENO
   ============================================================ */

function mostrarInformacionTerreno(
    properties
) {

    const container =
        document.getElementById(
            "terrainInfo"
        );


    let html =
        "<h2>INFORMACIÓN DEL TERRENO</h2>";


    html +=
        '<table class="terrain-table">';


    for (
        const key in properties
    ) {

        if (
            key === "_capa"
        ) {

            continue;
        }


        html +=
            "<tr>" +

            "<td>" +
            escaparHTML(
                key
            ) +
            "</td>" +

            "<td>" +
            escaparHTML(
                formatearValorPopup(
                    key,
                    properties[key]
                )
            ) +
            "</td>" +

            "</tr>";
    }


    html +=
        "</table>";


    container.innerHTML =
        html;


    actualizarEstadoMapa(
        "Terreno seleccionado."
    );
}


/* ============================================================
   FORMATO DE ATRIBUTOS
   ============================================================ */

function formatearValorPopup(
    key,
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    const keyLower =
        String(key)
            .toLowerCase();


    if (
        keyLower.includes(
            "valor"
        )
    ) {

        const n =
            convertirNumero(
                value
            );


        if (
            Number.isFinite(n)
        ) {

            return (
                "USD " +
                formatearNumero(n) +
                " / m²"
            );
        }
    }


    return String(
        value
    );
}


/* ============================================================
   LISTA DE CAPAS
   ============================================================ */

function actualizarListaCapas() {

    const container =
        document.getElementById(
            "layerList"
        );


    if (
        capasCargadas.length ===
        0
    ) {

        container.innerHTML =
            '<div class="empty-layers">' +
            "No hay capas cargadas." +
            "</div>";

        return;
    }


    container.innerHTML =
        "";


    capasCargadas.forEach(
        layerInfo => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "layer-row";


            const checkbox =
                document.createElement(
                    "input"
                );


            checkbox.type =
                "checkbox";


            checkbox.checked =
                map.hasLayer(
                    layerInfo.capa
                );


            checkbox.className =
                "layer-checkbox";


            checkbox.addEventListener(
                "change",
                function () {

                    if (
                        this.checked
                    ) {

                        layerInfo.capa.addTo(
                            map
                        );

                    } else {

                        map.removeLayer(
                            layerInfo.capa
                        );
                    }

                }
            );


            const symbol =
                document.createElement(
                    "span"
                );


            symbol.className =
                "layer-symbol";


            symbol.style.background =
                "#2d789d";


            const name =
                document.createElement(
                    "span"
                );


            name.className =
                "layer-name";


            name.title =
                layerInfo.nombre;


            name.textContent =
                layerInfo.nombre;


            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.className =
                "layer-delete";


            deleteButton.textContent =
                "✕";


            deleteButton.title =
                "Eliminar capa";


            deleteButton.addEventListener(
                "click",
                function () {

                    eliminarCapa(
                        layerInfo.id
                    );

                }
            );


            row.appendChild(
                checkbox
            );

            row.appendChild(
                symbol
            );

            row.appendChild(
                name
            );

            row.appendChild(
                deleteButton
            );


            container.appendChild(
                row
            );

        }
    );
}


/* ============================================================
   ELIMINAR CAPA
   ============================================================ */

function eliminarCapa(
    id
) {

    const index =
        capasCargadas.findIndex(
            layer =>
                layer.id === id
        );


    if (
        index === -1
    ) {

        return;
    }


    const layerInfo =
        capasCargadas[index];


    if (
        map.hasLayer(
            layerInfo.capa
        )
    ) {

        map.removeLayer(
            layerInfo.capa
        );
    }


    terrenos =
        terrenos.filter(
            terreno =>
                terreno.layerInfo !==
                layerInfo
        );


    capasCargadas.splice(
        index,
        1
    );


    actualizarListaCapas();

    actualizarEstadisticas();

    actualizarComparacion();


    mostrarToast(
        "Capa eliminada."
    );
}


/* ============================================================
   COMPARACIÓN
   ============================================================ */

function actualizarComparacion() {

    const selectA =
        document.getElementById(
            "compareA"
        );


    const selectB =
        document.getElementById(
            "compareB"
        );


    const opciones =
        obtenerGruposComparacion();


    selectA.innerHTML =
        '<option value="">Seleccionar</option>';


    selectB.innerHTML =
        '<option value="">Seleccionar</option>';


    opciones.forEach(
        grupo => {

            const optionA =
                document.createElement(
                    "option"
                );


            optionA.value =
                grupo.id;


            optionA.textContent =
                grupo.nombre;


            selectA.appendChild(
                optionA
            );


            const optionB =
                document.createElement(
                    "option"
                );


            optionB.value =
                grupo.id;


            optionB.textContent =
                grupo.nombre;


            selectB.appendChild(
                optionB
            );

        }
    );
}


/* ============================================================
   GRUPOS DE COMPARACIÓN
   ============================================================ */

function obtenerGruposComparacion() {

    const grupos = [];


    /* PRIMERO BUSCAR ZONAS */

    const camposZona = [

        "Zona",

        "zona",

        "Sector",

        "sector",

        "Barrio",

        "barrio",

        "Municipio",

        "municipio",

        "Ciudad",

        "ciudad"
    ];


    const mapa =
        new Map();


    terrenos.forEach(
        terreno => {

            let nombre =
                null;


            for (
                const campo
                of camposZona
            ) {

                if (
                    terreno.properties[campo]
                ) {

                    nombre =
                        String(
                            terreno.properties[
                                campo
                            ]
                        );

                    break;
                }
            }


            if (
                nombre
            ) {

                if (
                    !mapa.has(
                        nombre
                    )
                ) {

                    mapa.set(
                        nombre,
                        []
                    );
                }


                mapa.get(
                    nombre
                ).push(
                    terreno
                );
            }

        }
    );


    if (
        mapa.size > 1
    ) {

        mapa.forEach(
            (
                elementos,
                nombre
            ) => {

                grupos.push({

                    id:
                        "zona_" +
                        nombre,

                    nombre:
                        nombre,

                    terrenos:
                        elementos
                });

            }
        );


        return grupos;
    }


    /* SI SOLO HAY UNA CIUDAD,
       COMPARAR RANGOS DE VALOR */

    const rangos = [

        {
            id:
                "bajo",

            nombre:
                "Valor bajo (0–50)",

            terrenos:
                terrenos.filter(
                    t =>
                        t.valor !== null &&
                        t.valor <= 50
                )
        },

        {
            id:
                "medio",

            nombre:
                "Valor medio (51–100)",

            terrenos:
                terrenos.filter(
                    t =>
                        t.valor > 50 &&
                        t.valor <= 100
                )
        },

        {
            id:
                "alto",

            nombre:
                "Valor alto (101–200)",

            terrenos:
                terrenos.filter(
                    t =>
                        t.valor > 100 &&
                        t.valor <= 200
                )
        },

        {
            id:
                "muyalto",

            nombre:
                "Valor muy alto (>200)",

            terrenos:
                terrenos.filter(
                    t =>
                        t.valor > 200
                )
        }
    ];


    return rangos.filter(
        grupo =>
            grupo.terrenos.length >
            0
    );
}


/* ============================================================
   EJECUTAR COMPARACIÓN
   ============================================================ */

function compararGrupos() {

    const idA =
        document.getElementById(
            "compareA"
        ).value;


    const idB =
        document.getElementById(
            "compareB"
        ).value;


    const result =
        document.getElementById(
            "comparisonResult"
        );


    if (
        !idA ||
        !idB
    ) {

        result.innerHTML =
            "Selecciona dos grupos para comparar.";

        return;
    }


    if (
        idA === idB
    ) {

        result.innerHTML =
            "Selecciona dos grupos diferentes.";

        return;
    }


    const grupos =
        obtenerGruposComparacion();


    const grupoA =
        grupos.find(
            g =>
                g.id === idA
        );


    const grupoB =
        grupos.find(
            g =>
                g.id === idB
        );


    if (
        !grupoA ||
        !grupoB
    ) {

        return;
    }


    const promedioA =
        calcularPromedio(
            grupoA.terrenos
        );


    const promedioB =
        calcularPromedio(
            grupoB.terrenos
        );


    if (
        promedioA === null ||
        promedioB === null
    ) {

        result.innerHTML =
            "No hay suficientes valores numéricos.";

        return;
    }


    const diferencia =
        promedioB -
        promedioA;


    const porcentaje =
        promedioA !== 0
            ? (
                diferencia /
                promedioA
            ) * 100
            : 0;


    let signo =
        porcentaje >= 0
            ? "+"
            : "";


    result.innerHTML =

        "<strong>" +
        escaparHTML(
            grupoA.nombre
        ) +
        "</strong>: USD " +
        formatearNumero(
            promedioA
        ) +
        "<br>" +

        "<strong>" +
        escaparHTML(
            grupoB.nombre
        ) +
        "</strong>: USD " +
        formatearNumero(
            promedioB
        ) +
        "<br><br>" +

        "<strong>Diferencia:</strong> " +
        signo +
        formatearNumero(
            porcentaje
        ) +
        "%";


}


/* ============================================================
   PROMEDIO
   ============================================================ */

function calcularPromedio(
    lista
) {

    const valores =
        lista
            .map(
                t =>
                    t.valor
            )
            .filter(
                v =>
                    Number.isFinite(v)
            );


    if (
        valores.length === 0
    ) {

        return null;
    }


    return valores.reduce(
        (
            suma,
            valor
        ) =>
            suma + valor,
        0
    ) / valores.length;
}


/* ============================================================
   MEDICIÓN DE DISTANCIA
   ============================================================ */

function iniciarMedicionDistancia() {

    cancelarMedicion();


    medicionActiva =
        true;

    tipoMedicion =
        "distancia";

    medicionPuntos =
        [];


    activarBoton(
        "btnMedirDistancia"
    );


    actualizarEstadoMapa(
        "Haz clic en los puntos del mapa para medir una distancia. Doble clic para terminar."
    );


    mostrarToast(
        "Medición de distancia activada."
    );


    map.doubleClickZoom.disable();


    map.on(
        "click",
        manejarClickMedicion
    );


    map.on(
        "dblclick",
        finalizarMedicion
    );
}


/* ============================================================
   MEDICIÓN DE ÁREA
   ============================================================ */

function iniciarMedicionArea() {

    cancelarMedicion();


    medicionActiva =
        true;

    tipoMedicion =
        "area";

    medicionPuntos =
        [];


    activarBoton(
        "btnMedirArea"
    );


    actualizarEstadoMapa(
        "Haz clic alrededor del área. Doble clic para terminar."
    );


    mostrarToast(
        "Medición de área activada."
    );


    map.doubleClickZoom.disable();


    map.on(
        "click",
        manejarClickMedicion
    );


    map.on(
        "dblclick",
        finalizarMedicion
    );
}


/* ============================================================
   CLICK MEDICIÓN
   ============================================================ */

function manejarClickMedicion(
    event
) {

    medicionPuntos.push(
        event.latlng
    );


    if (
        !medicionLayer
    ) {

        if (
            tipoMedicion ===
            "distancia"
        ) {

            medicionLayer =
                L.polyline(
                    medicionPuntos,
                    {
                        weight: 4
                    }
                ).addTo(
                    map
                );

        } else {

            medicionLayer =
                L.polygon(
                    medicionPuntos,
                    {
                        weight: 3
                    }
                ).addTo(
                    map
                );
        }

    } else {

        medicionLayer.setLatLngs(
            medicionPuntos
        );
    }


    if (
        tipoMedicion ===
        "distancia"
    ) {

        const metros =
            calcularLongitud(
                medicionPuntos
            );


        actualizarEstadoMapa(
            "Distancia: " +
            formatearDistancia(
                metros
            )
        );

    } else {

        if (
            medicionPuntos.length >= 3
        ) {

            const area =
                calcularArea(
                    medicionPuntos
                );


            actualizarEstadoMapa(
                "Área: " +
                formatearArea(
                    area
                )
            );
        }
    }
}


/* ============================================================
   FINALIZAR MEDICIÓN
   ============================================================ */

function finalizarMedicion() {

    if (
        !medicionActiva
    ) {

        return;
    }


    if (
        tipoMedicion ===
        "distancia"
    ) {

        const metros =
            calcularLongitud(
                medicionPuntos
            );


        mostrarToast(
            "Distancia final: " +
            formatearDistancia(
                metros
            )
        );

    } else {

        if (
            medicionPuntos.length >= 3
        ) {

            const area =
                calcularArea(
                    medicionPuntos
                );


            mostrarToast(
                "Área final: " +
                formatearArea(
                    area
                )
            );
        }
    }


    cancelarMedicion();
}


/* ============================================================
   CANCELAR MEDICIÓN
   ============================================================ */

function cancelarMedicion() {

    medicionActiva =
        false;


    map.off(
        "click",
        manejarClickMedicion
    );


    map.off(
        "dblclick",
        finalizarMedicion
    );


    map.doubleClickZoom.enable();


    if (
        medicionLayer
    ) {

        map.removeLayer(
            medicionLayer
        );

        medicionLayer =
            null;
    }


    medicionPuntos =
        [];


    desactivarBotonesHerramienta();
}


/* ============================================================
   LONGITUD
   ============================================================ */

function calcularLongitud(
    latlngs
) {

    let total = 0;


    for (
        let i = 1;
        i < latlngs.length;
        i++
    ) {

        total +=
            distanciaEntrePuntos(
                latlngs[i - 1],
                latlngs[i]
            );
    }


    return total;
}


/* ============================================================
   DISTANCIA HAVERSINE
   ============================================================ */

function distanciaEntrePuntos(
    a,
    b
) {

    const R =
        6371008.8;


    const lat1 =
        gradosARadianes(
            a.lat
        );


    const lat2 =
        gradosARadianes(
            b.lat
        );


    const dLat =
        gradosARadianes(
            b.lat -
            a.lat
        );


    const dLon =
        gradosARadianes(
            b.lng -
            a.lng
        );


    const h =
        Math.sin(
            dLat / 2
        ) ** 2 +

        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(
            dLon / 2
        ) ** 2;


    return (
        2 *
        R *
        Math.asin(
            Math.sqrt(h)
        )
    );
}


/* ============================================================
   ÁREA
   ============================================================ */

function calcularArea(
    latlngs
) {

    if (
        !latlngs ||
        latlngs.length <
        3
    ) {

        return 0;
    }


    /*
     * Proyección aproximada local
     * para áreas pequeñas.
     */

    const lat0 =
        gradosARadianes(
            latlngs[0].lat
        );


    const R =
        6371008.8;


    const puntos =
        latlngs.map(
            p => ({

                x:
                    R *
                    gradosARadianes(
                        p.lng
                    ) *
                    Math.cos(
                        lat0
                    ),

                y:
                    R *
                    gradosARadianes(
                        p.lat
                    )
            })
        );


    let area = 0;


    for (
        let i = 0;
        i < puntos.length;
        i++
    ) {

        const j =
            (
                i + 1
            ) %
            puntos.length;


        area +=
            puntos[i].x *
            puntos[j].y -
            puntos[j].x *
            puntos[i].y;
    }


    return Math.abs(
        area / 2
    );
}


/* ============================================================
   GRADOS → RADIANES
   ============================================================ */

function gradosARadianes(
    grados
) {

    return (
        grados *
        Math.PI /
        180
    );
}


/* ============================================================
   LIMPIAR DIBUJOS
   ============================================================ */

function limpiarDibujos() {

    if (
        drawnItems
    ) {

        drawnItems.clearLayers();
    }


    cancelarMedicion();


    mostrarToast(
        "Dibujos eliminados."
    );
}


/* ============================================================
   EXPORTAR DIBUJOS
   ============================================================ */

function exportarDibujos() {

    const geojson =
        drawnItems.toGeoJSON();


    if (
        !geojson.features ||
        geojson.features.length === 0
    ) {

        mostrarToast(
            "No hay dibujos para exportar."
        );

        return;
    }


    const texto =
        JSON.stringify(
            geojson,
            null,
            2
        );


    const blob =
        new Blob(
            [
                texto
            ],
            {
                type:
                    "application/geo+json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const enlace =
        document.createElement(
            "a"
        );


    enlace.href =
        url;


    enlace.download =
        "geovalor_dibujos.geojson";


    enlace.click();


    URL.revokeObjectURL(
        url
    );


    mostrarToast(
        "GeoJSON exportado."
    );
}


/* ============================================================
   FORMATEAR DISTANCIA
   ============================================================ */

function formatearDistancia(
    metros
) {

    if (
        metros < 1000
    ) {

        return (
            formatearNumero(
                metros
            ) +
            " m"
        );
    }


    return (
        formatearNumero(
            metros / 1000
        ) +
        " km"
    );
}


/* ============================================================
   FORMATEAR ÁREA
   ============================================================ */

function formatearArea(
    metros2
) {

    if (
        metros2 < 10000
    ) {

        return (
            formatearNumero(
                metros2
            ) +
            " m²"
        );
    }


    return (
        formatearNumero(
            metros2 / 10000
        ) +
        " ha"
    );
}


/* ============================================================
   FORMATEAR NÚMERO
   ============================================================ */

function formatearNumero(
    numero
) {

    if (
        !Number.isFinite(
            numero
        )
    ) {

        return "—";
    }


    return new Intl.NumberFormat(
        "es-GT",
        {
            maximumFractionDigits:
                2
        }
    ).format(
        numero
    );
}


/* ============================================================
   ESCAPAR HTML
   ============================================================ */

function escaparHTML(
    valor
) {

    return String(
        valor
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* ============================================================
   ID
   ============================================================ */

function crearId() {

    return (
        Date.now()
            .toString(36) +
        Math.random()
            .toString(36)
            .substring(2)
    );
}


/* ============================================================
   BOTONES
   ============================================================ */

function activarBoton(
    id
) {

    desactivarBotonesHerramienta();


    const button =
        document.getElementById(
            id
        );


    if (
        button
    ) {

        button.classList.add(
            "active"
        );
    }
}


function desactivarBotonesHerramienta() {

    document
        .querySelectorAll(
            ".tool-button"
        )
        .forEach(
            button =>
                button.classList.remove(
                    "active"
                )
        );
}


/* ============================================================
   ESTADO
   ============================================================ */

function actualizarEstadoMapa(
    mensaje
) {

    document
        .getElementById(
            "mapStatus"
        )
        .textContent =
            mensaje;
}


/* ============================================================
   LOADING
   ============================================================ */

function mostrarCarga(
    mostrar,
    texto = "Procesando..."
) {

    const overlay =
        document.getElementById(
            "loadingOverlay"
        );


    const text =
        document.getElementById(
            "loadingText"
        );


    text.textContent =
        texto;


    if (
        mostrar
    ) {

        overlay.classList.remove(
            "hidden"
        );

    } else {

        overlay.classList.add(
            "hidden"
        );
    }
}


/* ============================================================
   TOAST
   ============================================================ */

function mostrarToast(
    mensaje
) {

    const toast =
        document.getElementById(
            "toast"
        );


    const message =
        document.getElementById(
            "toastMessage"
        );


    message.textContent =
        mensaje;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );
}


/* ============================================================
   FIN
   ============================================================ */
/* INTERPOLACIÓN IDW: distancia inversa ponderada */
let interpolationOverlay=null, interpolationQueryMode=false, interpolationResultMarker=null;
function puntosValidosInterpolacion(){
 const seen=new Set();
 return terrenos.filter(t=>Number.isFinite(Number(t.lat))&&Number.isFinite(Number(t.lng))&&t.valor!==null&&Number.isFinite(Number(t.valor)))
 .filter(t=>{const k=`${Number(t.lat).toFixed(7)},${Number(t.lng).toFixed(7)},${Number(t.valor)}`;if(seen.has(k))return false;seen.add(k);return true;})
 .map(t=>({lat:Number(t.lat),lng:Number(t.lng),valor:Number(t.valor),properties:t.properties,capa:t.capa}));
}
function distanciaMetros(a,b){
 const r=Math.PI/180,dl=(b.lat-a.lat)*r,dg=(b.lng-a.lng)*r;
 const h=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dg/2)**2;
 return 6371008.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
function estimarValorIDW(ll,pts,power,k){
 const nearest=pts.map(p=>({p,d:distanciaMetros(ll,p)})).sort((a,b)=>a.d-b.d).slice(0,k);
 if(!nearest.length)return null;
 if(nearest[0].d<0.05)return {valor:nearest[0].p.valor,exacto:true,vecinos:nearest};
 let n=0,d=0;nearest.forEach(o=>{const w=1/Math.pow(Math.max(o.d,.01),power);n+=o.p.valor*w;d+=w;});
 return {valor:d?n/d:null,exacto:false,vecinos:nearest};
}
function colorInterpolado(v,min,max){
 const t=max===min?.5:Math.max(0,Math.min(1,(v-min)/(max-min))),s=[[44,123,182],[171,217,233],[255,255,191],[253,174,97],[215,25,28]],x=t*4,i=Math.min(3,Math.floor(x)),f=x-i;
 const c=s[i].map((a,j)=>Math.round(a+(s[i+1][j]-a)*f));return `rgba(${c[0]},${c[1]},${c[2]},0.66)`;
}
function generarSuperficieInterpolada(){
 const pts=puntosValidosInterpolacion(),status=document.getElementById('interpolationStatus');
 if(pts.length<3){status.textContent='Se necesitan al menos 3 puntos con coordenadas y valores válidos.';mostrarToast('Carga al menos 3 puntos con valores.');return;}
 if(interpolationOverlay)map.removeLayer(interpolationOverlay);
 const b=L.latLngBounds(pts.map(p=>[p.lat,p.lng])),south=b.getSouth(),north=b.getNorth(),west=b.getWest(),east=b.getEast();
 if(north-south<1e-8||east-west<1e-8){status.textContent='Los puntos no cubren una extensión suficiente.';return;}
 const canvas=document.createElement('canvas'),w=180,h=180;canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
 const power=Number(document.getElementById('interpolationPower').value),k=Number(document.getElementById('interpolationNeighbors').value),vals=pts.map(p=>p.valor),min=Math.min(...vals),max=Math.max(...vals);
 for(let y=0;y<h;y++){const lat=north-(y+.5)/h*(north-south);for(let x=0;x<w;x++){const lng=west+(x+.5)/w*(east-west),r=estimarValorIDW({lat,lng},pts,power,k);ctx.fillStyle=colorInterpolado(r.valor,min,max);ctx.fillRect(x,y,1,1);}}
 interpolationOverlay=L.imageOverlay(canvas.toDataURL('image/png'),[[south,west],[north,east]],{opacity:.82,interactive:false}).addTo(map);
 capasCargadas.forEach(c=>{if(c.capa&&c.capa.bringToFront)c.capa.bringToFront();});
 status.innerHTML=`Superficie IDW generada con <b>${pts.length}</b> puntos. Rango observado: ${formatearNumero(min)}–${formatearNumero(max)} USD/m². Estimaciones dentro de la extensión de los puntos.`;
 const legend=document.createElement('div');legend.className='interpolation-legend';legend.innerHTML='<span>Bajo</span><div class="interpolation-gradient"></div><span>Alto</span>';status.appendChild(legend);
 mostrarToast('Superficie interpolada generada.');
}
function activarConsultaInterpolacion(){
 if(puntosValidosInterpolacion().length<3){mostrarToast('Primero carga al menos 3 puntos con valores.');return;}
 interpolationQueryMode=!interpolationQueryMode;const btn=document.getElementById('btnConsultarEstimacion');
 btn.classList.toggle('active',interpolationQueryMode);btn.textContent=interpolationQueryMode?'Haz clic en el mapa… (cancelar)':'Consultar un lugar del mapa';
 map.getContainer().style.cursor=interpolationQueryMode?'crosshair':'';
 document.getElementById('interpolationStatus').textContent=interpolationQueryMode?'Modo consulta activo: haz clic en una ubicación para estimar su valor.':'Consulta cancelada.';
}
function consultarValorInterpolado(ll){
 const pts=puntosValidosInterpolacion(),power=Number(document.getElementById('interpolationPower').value),k=Number(document.getElementById('interpolationNeighbors').value),r=estimarValorIDW(ll,pts,power,k);
 if(!r||!Number.isFinite(r.valor)){mostrarToast('No fue posible estimar el valor.');return;}
 if(interpolationResultMarker)map.removeLayer(interpolationResultMarker);
 interpolationResultMarker=L.marker(ll).addTo(map);
 interpolationResultMarker.bindPopup(`<div class="popup-title">Estimación del valor del suelo</div><b>Valor estimado:</b> USD ${formatearNumero(r.valor)} / m²<br><b>Coordenadas:</b> ${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}<br><b>Método:</b> IDW, potencia ${power}<br><b>Puntos usados:</b> ${r.vecinos.length}<br><small>Estimación orientativa, no valoración profesional.</small>`).openPopup();
 const rows=r.vecinos.map((o,i)=>`<tr><td>Punto vecino ${i+1}</td><td>${formatearNumero(o.p.valor)} USD/m² · ${formatearNumero(o.d)} m</td></tr>`).join('');
 document.getElementById('terrainInfo').innerHTML=`<h2>RESULTADO DE INTERPOLACIÓN</h2><table class="terrain-table">
 <tr><td>Valor estimado</td><td><strong>USD ${formatearNumero(r.valor)} / m²</strong></td></tr><tr><td>Latitud</td><td>${ll.lat.toFixed(7)}</td></tr><tr><td>Longitud</td><td>${ll.lng.toFixed(7)}</td></tr><tr><td>Método</td><td>Distancia inversa ponderada (IDW)</td></tr><tr><td>Potencia</td><td>${power}</td></tr><tr><td>Vecinos usados</td><td>${r.vecinos.length}</td></tr><tr><td>Resultado</td><td>${r.exacto?'Coincide con un punto registrado':'Valor estimado, no observado'}</td></tr>${rows}</table><p class="terrain-empty">La precisión depende de la cantidad, distribución y calidad de los datos. Evita extrapolar fuera del área muestreada.</p>`;
 actualizarEstadoMapa(`Valor estimado: USD ${formatearNumero(r.valor)} / m²`);
 interpolationQueryMode=false;const btn=document.getElementById('btnConsultarEstimacion');btn.classList.remove('active');btn.textContent='Consultar un lugar del mapa';map.getContainer().style.cursor='';
}
document.addEventListener('DOMContentLoaded',()=>{
 document.getElementById('btnInterpolar')?.addEventListener('click',generarSuperficieInterpolada);
 document.getElementById('btnConsultarEstimacion')?.addEventListener('click',activarConsultaInterpolacion);
 document.getElementById('btnQuitarInterpolacion')?.addEventListener('click',()=>{
  if(interpolationOverlay){map.removeLayer(interpolationOverlay);interpolationOverlay=null;}
  if(interpolationResultMarker){map.removeLayer(interpolationResultMarker);interpolationResultMarker=null;}
  interpolationQueryMode=false;document.getElementById('btnConsultarEstimacion').classList.remove('active');
  document.getElementById('btnConsultarEstimacion').textContent='Consultar un lugar del mapa';map.getContainer().style.cursor='';
  document.getElementById('interpolationStatus').textContent='Interpolación retirada del mapa.';
 });
 // Consulta automática: al hacer clic dentro de la superficie IDW, estima el valor sin tener que activar el botón.
 map.on('click',e=>{
  const dentroSuperficie = interpolationOverlay && interpolationOverlay.getBounds().contains(e.latlng);
  if (interpolationQueryMode || dentroSuperficie) consultarValorInterpolado(e.latlng);
 });
});
