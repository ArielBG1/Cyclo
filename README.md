# Cyclo (anteriormente ReciclaMapa)

> **El ciclo empieza con vos** · _The cycle starts with you_ · _순환은 당신에서 시작됩니다_

App de reciclaje ciudadano con mapa interactivo, reconocimiento de
materiales por cámara (**CycloScan**) y gamificación.

## Identidad de marca

- **Nombre**: Cyclo
- **IA de detección de materiales**: CycloScan (COCO-SSD por debajo)
- **Chatbot (futuro)**: Eco

## Estructura del proyecto

```
reciclamapa/        # carpeta legacy, no renombrada por razones técnicas
├── frontend/      # Vite + React + TailwindCSS + i18next + Leaflet
└── backend/       # Node.js + Express + PostgreSQL + JWT
```

> **Nota**: la base de datos sigue llamándose `reciclamapa_db` y la
> carpeta raíz `reciclamapa/`. Son nombres técnicos heredados; la marca
> visible al usuario es **Cyclo** en toda la app.

## Requisitos previos

- Node.js >= 18
- pnpm
- PostgreSQL con PostGIS

## Cómo ejecutar

### Frontend

```bash
cd frontend
pnpm dev
```

### Backend

```bash
cd backend
cp .env.example .env
# Editar .env con tus credenciales de base de datos
pnpm dev
```

## Stack tecnológico

**Frontend**: React 19, Vite, TailwindCSS v4, Leaflet + react-leaflet,
react-router-dom, axios, react-i18next (es/en/ko), recharts,
@tensorflow/tfjs + @tensorflow-models/coco-ssd (CycloScan), lucide-react

**Backend**: Express, PostgreSQL + PostGIS (`pg`), JWT, bcryptjs, dotenv,
cors
