# Cyclo (anteriormente ReciclaMapa)

App web ciudadana de reciclaje con mapa interactivo, reconocimiento de
materiales por cámara y gamificación.

## Identidad de marca

- **Nombre de la app**: Cyclo
- **Tagline**:
  - ES: "El ciclo empieza con vos"
  - EN: "The cycle starts with you"
  - KO: "순환은 당신에서 시작됩니다"
- **IA de detección de materiales**: CycloScan (modelo COCO-SSD por debajo,
  pero la cara visible al usuario es CycloScan). El bloque debug del
  Escanear sigue mostrando el detalle técnico "Modelo: COCO-SSD
  (mobilenet_v2)".
- **Chatbot (futuro)**: Eco

### Nombres internos NO renombrados (razones técnicas)

- **Base de datos**: sigue siendo `reciclamapa_db`. Renombrarla requeriría
  hacer dump + restore en una DB nueva, actualizar `backend/.env` y
  reconfigurar `.claude/settings.local.json`. No vale la pena.
- **Carpeta del proyecto**: sigue siendo `reciclamapa/`. Renombrarla
  rompería referencias en configuraciones locales (rutas absolutas en
  `.claude/`, scripts de Windows, hooks de git).
- **JWT_SECRET**: el valor en `.env` arranca con `reciclamapa_…` por
  legacy; es solo un secreto, no afecta nada visible.
- **Variables, funciones y rutas de la API**: se mantienen los nombres
  internos que ya existen (ej: `usuariosRoutes`, `/api/checkins`). Solo se
  cambian los textos visibles al usuario y la marca.

## Stack técnico

- **Frontend**: React + Vite + TailwindCSS v4 + react-router-dom + Leaflet + react-leaflet-cluster + lucide-react + axios + @tensorflow/tfjs + @tensorflow-models/coco-ssd
- **Tipografía**: Plus Jakarta Sans (font-display) + Inter (font-sans) vía Google Fonts
- **Paleta**: British Racing Green — brand-900 (#00352F) … brand-500 (#1FAA59) + grises ink-*
- **Backend**: Node.js + Express (ES Modules) + pg + bcryptjs + jsonwebtoken + cors + dotenv
- **Base de datos**: PostgreSQL + PostGIS
- **Gestor de paquetes**: pnpm (NO npm)
- **Desarrollo**: 100% local, sin hosting por ahora

## Estructura del proyecto

reciclamapa/
├── frontend/   (Vite + React, puerto 5173)
├── backend/    (Express, puerto 3000)
└── CLAUDE.md

## Base de datos

Nombre: reciclamapa_db
Tablas: usuarios, materiales, puntos_reciclaje, puntos_materiales,
checkins, logros, usuarios_logros
PostGIS habilitado. Columna ubicacion en puntos_reciclaje es GEOGRAPHY(POINT, 4326).

Tabla usuarios: además de los campos básicos (id, nombre, email, password_hash,
puntos_totales, nivel, avatar_url, creado_en), tiene una columna `rol VARCHAR(20)
DEFAULT 'user'`. Valores en uso: 'user' (default) y 'admin'. El rol se asigna
manualmente con UPDATE; no hay endpoint público que lo cambie.

## Convenciones

- ES Modules en el backend (import/export, no require)
- Variables de entorno en backend/.env (NO commitear)
- bcryptjs en lugar de bcrypt (compatibilidad con pnpm 11 en Windows)
- Estructura backend: controllers/ + routes/ + middlewares/ + config/
- Estructura frontend: components/ + pages/ + context/ + services/ + utils/
- Mensajes y comentarios de código en español

## Estado del proyecto (fases completadas)

- ✅ Fase 0: Entorno (Node 24, pnpm, Git, PostgreSQL+PostGIS)
- ✅ Fase 1: Setup de carpetas frontend/backend
- ✅ Fase 2: Base de datos creada con seed de materiales y logros
- ✅ Fase 3: Backend conectado a DB. Endpoints: GET /api/materiales, GET /api/puntos
- ✅ Fase 4: Mapa con Leaflet mostrando puntos desde la API
- ✅ Fase 5: Autenticación JWT completa
  - Backend: POST /api/auth/registro, POST /api/auth/login, GET /api/auth/me (protegido)
  - Frontend: AuthContext, páginas Login/Registro, Navbar dinámico, token en localStorage
- ✅ Fase 6: Mapa pulido
  - Geolocalización del usuario
  - Filtros por material con "Seleccionar todos" e indeterminate
  - Popups custom con info, distancia (Haversine) y "Cómo llegar" a Google Maps
  - Clusters de marcadores con diseño verde custom (♻️ + número)
  - Botón "Reciclar aquí" deshabilitado (preparado para próxima fase)

## Próximas fases pendientes

- ✅ Fase 7: Cámara + IA para reconocer materiales (TensorFlow.js + COCO-SSD)
- ✅ Rediseño visual: paleta BRG (British Racing Green), tipografía Plus Jakarta Sans + Inter,
  Navbar responsive con hamburger/dropdown, split-screen en Login/Registro, componente Button reutilizable
  - Frontend: página /escanear con cámara, captura, detección COCO-SSD
  - Frontend: utils/mapeoMateriales.js (clases COCO-SSD → IDs de materiales)
  - Backend: GET /api/puntos/cercanos (material_id, lat, lng → 3 puntos más cercanos con PostGIS)
  - Navbar: link "📷 Escanear" visible solo para usuarios logueados
  - Modelo de IA: COCO-SSD (mobilenet_v2 base). Reemplazó a MobileNet porque MobileNet
    daba resultados imprecisos en cámaras de celular.
- ✅ Fase 8: Sistema de check-ins (foto + geolocalización + suma de puntos)
  - Backend: POST /api/checkins con validaciones (material, distancia 100m, cooldown 1h, límite diario 5)
  - Backend: transacción DB que suma puntos, calcula nivel y desbloquea logros automáticamente
  - Frontend: CheckinModal con selección de material, cantidad, foto y pantalla de éxito animada
  - Frontend: CameraCapture reutilizable (fullscreen, cleanup de stream)
  - Frontend: detección COCO-SSD integrada al modal para identificar material con cámara
  - PopupPunto: botón "Reciclar aquí" habilitado para usuarios logueados
  - puntosController: corregido key color_contenedor, agregado puntos_por_kg a la respuesta
- ✅ Pase de pulido visual (preparación previa a dark mode)
  - index.css: bloque `:root` con variables semánticas (--color-bg, --color-surface,
    --color-text*, --color-border, --color-brand*, --shadow-{sm,md,lg}, --radius-{sm,md,lg,xl}).
    Mismos valores actuales; cuando se active dark mode alcanzará con redefinir en `.dark`.
  - index.css: keyframes y utility classes reutilizables (animate-fade-in, animate-slide-up,
    animate-scale-in, animate-celebrate, animate-gentle-pulse, animate-pill-pop, animate-float-*).
    Doble-anillo spinner (rm-double-spinner), barra de progreso indeterminada (rm-progress-bar),
    link de navbar con subrayado animado (rm-nav-link). Respeta prefers-reduced-motion.
  - Navbar: subrayado animado desde el centro en links, avatar con ring + sombra + scale hover,
    pill de puntos con micro-bounce al cambiar (key forzando remount), gradiente del nav refinado.
  - Mapa: loader reemplazado por doble-anillo con ♻️ pulsante + backdrop blur.
  - MapaControls: FAB con halo verde (shadow-brand-glow), panel desktop con glassmorphism
    más fino y animación de entrada al desplegar.
  - Login/Registro: círculos decorativos con flotación sutil desfasada (float-a/b/c) y
    formulario con animate-scale-in al montar.
  - Escanear: pantalla de carga del modelo IA con 🤖 pulsante + barra de progreso indeterminada.
    Resultados aparecen con fade-in. Video se monta con fade-in.
  - CheckinModal: entrada animada (backdrop fade-in + modal scale-in) con wrapper flex para no
    pisar el transform de la animación, chips de material con scale y boxShadow al seleccionar,
    pantalla de éxito con `+X pts` más celebratorio (animate-celebrate) y textShadow brand.
  - PopupPunto: hover de botones con translateY y sombra brand. Spinners locales reemplazados
    por la keyframe global rm-spin.
- ✅ Página de perfil de usuario
  - Backend `checkinsController.js`: 2 endpoints nuevos protegidos con
    `verificarToken`:
    * `GET /api/checkins/mis-checkins` → `listarCheckinsUsuario`. INNER JOIN
      con puntos_reciclaje y materiales para devolver nombre del punto,
      material con color_contenedor, foto_url. Ordenado por creado_en DESC.
    * `GET /api/checkins/mis-stats` → `estadisticasUsuario`. Tres queries en
      paralelo (stats agregadas, usuario, material favorito vía GROUP BY +
      ORDER BY COUNT DESC LIMIT 1). Calcula `proximo_nivel` y
      `puntos_para_proximo` reusando el array `NIVELES` del mismo archivo
      (Principiante 0 / Aprendiz 50 / Reciclador 200 / Eco-Activista 500 /
      Eco-Warrior 1000 / Guardián del Planeta 2000 / Maestro del Reciclaje
      5000). Si está en el último nivel, `proximo_nivel: null`.
  - Backend `usuariosController.js`: **CREAR**. `misLogros` con LEFT JOIN
    contra `usuarios_logros` devolviendo TODOS los logros del sistema con
    flag `desbloqueado` y `obtenido_en`.
  - Backend `usuariosRoutes.js`: **CREAR**. `GET /mis-logros` con
    `verificarToken`. Montado en `/api/usuarios`.
  - Frontend `utils/urlBackend.js`: helper que toma `VITE_API_URL`
    (`http://localhost:3000/api`), le saca `/api` del final y compone URLs
    absolutas para servir las fotos del backend (`/uploads/...`). Deja
    pasar URLs absolutas sin tocarlas.
  - Frontend `utils/iconoNivel.jsx`: mapea nivel → icono lucide
    (Sprout / Leaf / Recycle / TreePine / Shield / Globe2 / Crown). Sin
    emojis, consistente con el resto de la app.
  - Frontend `components/RutaPrivada.jsx`: guard reusable que muestra
    loader mientras `cargando`, redirige a /login si no hay sesión y
    renderiza children si está autenticado. A diferencia de `RutaAdmin`
    no exige rol específico.
  - Frontend `pages/Perfil.jsx`: carga paralela con `Promise.all` de las
    3 endpoints. Cuatro secciones:
    * Cabecera: avatar de iniciales con ring brand, nombre, email, badge
      del nivel actual con `<IconoNivel />`, barra de progreso al próximo
      nivel (puntos_actuales - nivel_min vs proximo_nivel_min - nivel_min)
      con gradient brand-500 → brand-400, o "Nivel máximo alcanzado" si
      está en el tope.
    * Stats: 5 cards fijas (kg reciclados, check-ins, puntos totales,
      puntos distintos visitados, CO₂ evitado = kg × 1.5) + 1 card
      condicional con el material favorito mostrando el icono lucide del
      material con su color_contenedor real.
    * Logros: grid de 2 columnas. Desbloqueados con borde brand, icono
      lucide en círculo brand-500 y fecha relativa de cuando se obtuvo
      (vía `Intl.RelativeTimeFormat` en el idioma activo). Bloqueados con
      `<Lock />` en gris, descripción visible (qué hay que hacer) y opacity
      0.7. Contador "X de Y desbloqueados" en el header.
    * Historial: lista con thumbnail de la foto del check-in (`urlBackend()`
      resuelve la ruta), nombre del punto, chip del material con su color
      e icono, cantidad en kg, fecha relativa, +N pts a la derecha. Empty
      state amable con icono Recycle y CTA "Ir al mapa" si el usuario no
      tiene check-ins. Fallback de imagen si la foto no carga (onError
      oculta el img).
  - Fechas relativas: `Intl.RelativeTimeFormat` nativo, soporta es/en/ko sin
    librerías. Para fechas > 30 días muestra fecha absoluta corta con
    `Intl.DateTimeFormat`.
  - Frontend `App.jsx`: ruta `/perfil` envuelta con `<RutaPrivada>`. El link
    "Mi perfil" del dropdown del navbar ya apuntaba a `/perfil`.
  - i18n: namespace `perfil` agregado en es/en/ko con cabecera, stats,
    logros, historial, empty state y mensajes de carga/error.
- ✅ Dashboard admin (métricas con recharts)
  - Backend `adminController.js`: 5 endpoints nuevos en `/api/admin/stats`:
    * `general` → KPIs (total_usuarios, total_puntos, total_checkins,
      total_kg_reciclado, total_puntos_otorgados, checkins_hoy). Usa COALESCE
      en los SUM para no devolver null cuando la tabla está vacía. Casting
      a ::int / ::float para que pg no devuelva strings.
    * `por-punto` → cantidad de check-ins y kg por cada punto de reciclaje
      (LEFT JOIN con puntos_reciclaje para incluir los puntos sin actividad).
    * `materiales` → cuánto se reciclo de cada material, con `color_contenedor`
      para que el frontend lo use en las barras (LEFT JOIN con materiales).
    * `ranking` → top 10 usuarios por puntos_totales con cantidad de check-ins
      vía subquery.
    * `temporal` → check-ins por día de los últimos 30 días (GROUP BY date).
  - Backend `adminRoutes.js`: rutas montadas bajo el mismo
    `router.use(verificarToken, verificarAdmin)` que el CRUD, así que toda
    la rama `/api/admin/stats` queda igualmente protegida.
  - Frontend `recharts`: instalado en frontend.
  - Frontend `pages/admin/AdminDashboard.jsx`: reescrito completo. Carga
    paralela con `Promise.all` y muestra:
    * Grilla de 6 KPI cards (Users, MapPin, CheckCircle2, Recycle, Star,
      Calendar con bg/fg de color por categoría).
    * LineChart 30 días — el frontend rellena los días sin check-ins con 0
      para que la línea no tenga gaps visuales (helper `rellenar30Dias`).
    * Fila de 2 BarChart horizontales: materiales (cada Cell con
      `colorContenedor()` del helper, así "verde" → #16A34A) y top 10
      puntos con más check-ins (color brand).
    * Tabla de ranking con medallas oro/plata/bronce para top 3 (`<Medal />`
      con bg/fg específicos por puesto) + cards apiladas en mobile.
    * Empty states amables con `<BarChart3 />` cuando no hay datos.
  - Tema en recharts: ejes y grid usan `stroke="var(--color-border)"` y
    `tick={{ fill: 'var(--color-text-soft)' }}` (CSS vars en SVG funcionan).
    Tooltip custom (`<CustomTooltip>`) usa `bg-surface border-theme text-main`
    para adaptarse al dark mode automáticamente. El prop interno se llama
    `etiqueta` para no chocar con el `label` que recharts inyecta.
  - Frontend `AdminLayout.jsx`: el tab Dashboard ya no dice "próximamente".
  - Frontend `App.jsx`: `/admin` ahora redirige a `/admin/dashboard` (era
    `/admin/puntos`). El dashboard pasó a ser la pantalla principal del panel.
  - Frontend `Navbar.jsx`: el link "Admin" apunta a `/admin/dashboard` y el
    helper `linkClase(path, porPrefijo=true)` lo marca activo en cualquier
    `/admin/*` (no solo en la subruta exacta).
  - i18n: namespace `dashboard` agregado en es/en/ko con KPIs, títulos de
    gráficos, columnas de tabla, tooltips y empty state.
- ✅ Sistema de roles + módulo admin (CRUD de puntos)
  - DB: columna `rol` en `usuarios` (VARCHAR(20) default 'user'). Asignación manual.
  - Backend `authController.js`: login + `obtenerPerfil` ahora devuelven el campo `rol`
    en el objeto usuario (no se incluye en el JWT; se consulta siempre desde la DB).
  - Backend `middlewares/adminMiddleware.js`: `verificarAdmin` corre después de
    `verificarToken`, consulta el rol del usuario en la DB en cada request y devuelve
    403 si no es admin. Esto hace que un cambio de rol surta efecto inmediato sin
    esperar a que expire el JWT.
  - Backend `controllers/adminController.js`:
    * `listarPuntosAdmin` → GET /api/admin/puntos. Devuelve TODOS los puntos
      (verificados y no verificados) con materiales agregados y `cantidad_checkins`.
    * `crearPunto` → POST. Transacción: INSERT en puntos_reciclaje (ubicación con
      ST_GeogFromText) + INSERT en puntos_materiales por cada material.
      `creado_por = req.usuario.id`. Por default `verificado = true`.
    * `actualizarPunto` → PUT /:id. UPDATE dinámico solo con los campos enviados.
      Si vienen materiales, reemplaza el set completo (DELETE + INSERT).
    * `eliminarPunto` → DELETE /:id. Las relaciones en `puntos_materiales` y
      `checkins` se borran solas por las FKs `ON DELETE CASCADE`.
  - Backend `routes/adminRoutes.js`: `router.use(verificarToken, verificarAdmin)`
    aplica los dos middlewares a todas las rutas admin. Montado en `/api/admin`.
  - Frontend `AuthContext`: expone `esAdmin` derivado de `usuario?.rol === 'admin'`.
  - Frontend `components/RutaAdmin.jsx`: guard de rutas. Mientras carga la sesión
    muestra un loader; sin sesión redirige a /login; con sesión no-admin redirige
    a /; admin renderiza `<Outlet />` (o children).
  - Frontend `pages/admin/AdminLayout.jsx`: layout con tabs (Puntos / Dashboard)
    usando NavLink + Outlet. El tab Dashboard muestra "próximamente".
  - Frontend `pages/admin/AdminPuntos.jsx`: CRUD completo. Tabla en desktop /
    cards en mobile. Modal de form (crear o editar) con todos los campos +
    MiniMapaSelector. Modal de confirmación de borrado que muestra cuántos
    check-ins se borrarán por cascada.
  - Frontend `pages/admin/MiniMapaSelector.jsx`: mini-mapa Leaflet con
    `useMapEvents({ click })` que coloca/mueve el marcador y devuelve lat/lng
    vía `onCambio`. Centra en Asunción si no hay coords iniciales; en las coords
    si existen.
  - Frontend `pages/admin/AdminDashboard.jsx`: ahora es el dashboard
    real (ver fase siguiente).
  - Frontend `App.jsx`: rutas anidadas `/admin → RutaAdmin → AdminLayout` con
    hijos `puntos` (default) y `dashboard`.
  - Frontend `Navbar`: link "⚙️ Admin" → `/admin/puntos`, visible solo si
    `esAdmin`, tanto en desktop como en el menú móvil.
  - i18n: namespace `admin` agregado en es/en/ko con todas las claves de UI,
    estados, errores, confirmaciones de borrado con interpolación de nombre y
    cantidad de check-ins.
  - El mapa público (`puntosController.listarPuntos` + `Mapa.jsx`) NO se tocó;
    los usuarios normales siguen viendo el mismo conjunto de puntos.
- ✅ Multiidioma (es / en / ko) con react-i18next
  - Paquetes: i18next, react-i18next, i18next-browser-languagedetector
  - Setup en `frontend/src/i18n/index.js`: fallback 'es', supportedLngs ['es','en','ko'],
    `load: 'languageOnly'` (es-AR → es, en-US → en), detector con orden
    `['localStorage','navigator']` y cache en `localStorage.i18nextLng`.
  - Listener `languageChanged` sincroniza `<html lang="...">` para que el CSS aplique
    fuentes específicas por idioma.
  - Archivos de traducción: `frontend/src/i18n/locales/{es,en,ko}.json` con la misma estructura
    de claves en namespaces: navbar, auth, mapa, popup, escanear, checkin, materiales,
    instrucciones, logros, camera, comun, idioma.
  - Coreano usa registro 해요체 (educado neutro) para mensajes y formas concisas
    para botones (예: 로그인, 닫기, 취소, 확인).
  - Selector de idioma: `frontend/src/components/LanguageSelector.jsx` con dos variantes:
    `desktop` (botón compacto + dropdown con Languages icon) y `mobile-inline` (3 botones
    grid dentro del menú hamburger). Indica idioma activo con check.
  - Soporte tipográfico para coreano: agregada Noto Sans KR en index.html; index.css
    aplica `font-family: 'Noto Sans KR', ...` automáticamente cuando `html[lang="ko"]`.
  - Helpers de traducción en `frontend/src/utils/materialKey.js`:
    * `claveMaterial(id|obj)` → 1→'plasticoPet', 2→'vidrio', etc.
    * `traducirMaterial(t, m)` → nombre del material en el idioma activo (con fallback al backend).
    * `traducirInstrucciones(t, materialId)` → instrucciones de manejo.
    * `claveLogro(id|obj)` / `traducirLogro(t, logro)` → { nombre, descripcion } traducidos.
  - `formatearDistancia(km, t?)` ahora acepta `t` opcional para traducir las unidades
    ('m' / 'km'). Sin `t` queda en español por retrocompatibilidad.
  - El backend NO se toca: la DB sigue en español, pero la presentación traduce.
    Los mensajes de error del backend se muestran tal cual vienen (en español);
    si en algún momento queremos i18n del backend, será un paso aparte.
  - Componentes migrados a `useTranslation`: Navbar, Login, Registro, Mapa, MapaControls,
    PopupPunto, CheckinModal (+ PantallaExito), CameraCapture, Escanear.
- ✅ Dark mode (modo oscuro)
  - ThemeContext (`context/ThemeContext.jsx`): estado `theme` con default `'light'`, persistencia
    en `localStorage.theme`, aplica `data-theme="dark|light"` al `<html>`. Hook `useTheme()`.
    No sigue preferencia del sistema; arranca siempre en claro a menos que el usuario haya
    elegido oscuro antes.
  - App envuelto con `<ThemeProvider>` por fuera de AuthProvider.
  - index.css: bloque `[data-theme="dark"]` redefine todas las variables semánticas (colores,
    sombras, gradient del loader del mapa, feedback bg/border/text). Clases utility tematizadas
    (`bg-app`, `bg-surface`, `bg-surface-alt`, `bg-surface-{80,85,95}`, `text-main/soft/muted`,
    `border-theme`, `placeholder-muted`, `hover:bg-surface-alt/95`, `feedback-{error,warning,success}`).
    Transiciones suaves (0.3s) en body y elementos tematizados.
  - Filtro CSS aplicado a `.leaflet-tile` en dark mode para convertir OSM claro en versión
    nocturna razonable. Popup wrapper de Leaflet tematizado con var(--color-surface)/text.
  - Navbar: ThemeToggle (Sun/Moon de lucide-react) visible en desktop (junto al avatar/login)
    y móvil (al lado del hamburger). Iconos cross-fade con rotate+scale 300ms. El fondo del
    navbar (brand-900/800) y el panel decorativo izq de Login/Registro siguen oscuros en
    ambos modos por ser ya BRG.
  - Migración de colores hardcodeados a variables CSS:
    * Login/Registro: panel derecho, inputs, labels, mensajes éxito/error usan utilities tematizadas
    * Escanear: bg, cards de resultado, disclaimer warning, bloque debug
    * CheckinModal: superficie, header, X close, todas las secciones, toast feedback,
      pantalla de éxito con cards de logros
    * MapaControls: bottom-sheet, toggle desktop, panel desplegable, items y checkboxes
    * PopupPunto: textos y badge de distancia + chips de material con fondo translúcido
      del color del contenedor solo en dark (mejor visibilidad sobre fondo oscuro)
    * Mapa loader: usa var(--map-loader-bg) que cambia por tema
    * Navbar dropdown del usuario migrado a `bg-surface`, `text-main/soft/muted`, `border-theme`
  - NO migrado (mantiene colores brand): botones CTA brand-500, navbar oscuro, panel decorativo
    Login/Registro, colores fijos de contenedores de material (color_contenedor), íconos del mapa
- 🔜 Fase 9: Perfil de usuario y dashboard de impacto (gráficos, ranking, logros)
- 🔜 Fase 10: Pulido final (responsive, mejoras de UI, manejo de errores)

## Cómo correr el proyecto

Dos consolas separadas:

Backend:
  cd backend
  pnpm dev    (corre en puerto 3000)

Frontend:
  cd frontend
  pnpm dev    (corre en puerto 5173)

## Notas importantes para Claude

- El usuario está aprendiendo y prefiere ir paso a paso, sin apurarse
- Siempre explicar qué se va a hacer ANTES de hacerlo
- Idioma: español
- Antes de modificar archivos, leerlos para entender el estado actual
- No proponer hosting/deploy todavía, todo es local por ahora
