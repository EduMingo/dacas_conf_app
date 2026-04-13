# DACAS Configurador de Infraestructura

Configurador de stock rápido para proyectos de infraestructura de red (Oficina, CCTV, Data Center).  
Genera BOM técnico, PDF descargable y mensaje de WhatsApp — desde celular u ordenador.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Tailwind + shadcn/ui |
| Backend | FastAPI (Python 3.11) |
| Stock | Google Sheets (lectura en vivo) |
| Deploy | Render.com (gratuito) |

---

## Deploy en Render (paso a paso)

### 1. Subir cambios al repo de GitHub
Asegúrate de que tu repo esté actualizado con estos archivos nuevos:
`render.yaml`, `.env.example`, `README.md`, `backend/requirements-render.txt`

### 2. Crear cuenta en Render
Entrá a [render.com](https://render.com) y registrate con tu cuenta de GitHub.

### 3. Nuevo Blueprint (despliega todo junto)
1. En el dashboard de Render: **New → Blueprint**
2. Conectá tu repositorio `DACAS_conf_Infra`
3. Render detecta el `render.yaml` automáticamente
4. Hacé clic en **Apply** — crea dos servicios:
   - `dacas-backend` (FastAPI)
   - `dacas-frontend` (React estático)

### 4. Variables de entorno
Render las lee del `render.yaml` automáticamente.

> ⚠️ **Paso crítico:** Una vez que Render genere las URLs reales de tus servicios,
> actualizá en el dashboard:
> - En `dacas-backend` → `CORS_ORIGINS` = URL real del frontend
> - En `dacas-frontend` → `REACT_APP_BACKEND_URL` = URL real del backend
> Luego hacé **Manual Deploy** en el frontend para que tome la nueva variable.

### 5. Google Sheet — verificar que sea público
El backend lee el stock directamente desde Google Sheets sin autenticación.
1. Abrí tu Google Sheet
2. **Archivo → Compartir** → "Cualquier persona con el enlace puede ver"

### 6. URLs finales
- Frontend: `https://dacas-frontend.onrender.com`
- Backend: `https://dacas-backend.onrender.com/api/configurator`
- Health: `https://dacas-backend.onrender.com/health`

> 💤 **Nota tier gratuito:** Los servicios en Render free se "duermen" tras 15 min sin uso.
> La primera visita puede tardar ~30 segundos en despertar. Es normal.

---

## Desarrollo local

### Backend
```bash
cd backend
pip install -r requirements-render.txt
# Crear .env con: STOCK_SOURCE_URL y CORS_ORIGINS=http://localhost:3000
uvicorn server:app --reload --port 8000
```

### Frontend
```bash
cd frontend
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env.local
yarn install
yarn start
```

---

## Actualizar el stock

El stock se lee **en vivo** desde Google Sheets en cada carga del configurador.  
Solo editá el Google Sheet — no hace falta redesplegar nada.

---

## Estructura del proyecto

```
DACAS_conf_Infra/
├── backend/
│   ├── server.py                  # API FastAPI
│   ├── stock_catalog.py           # Carga y clasificación del stock
│   ├── requirements-render.txt    # Dependencias mínimas para producción
│   └── data/                      # Excel de respaldo local
├── frontend/
│   ├── src/
│   │   ├── pages/ConfiguratorPage.jsx
│   │   ├── components/
│   │   └── utils/
│   └── public/logos/
├── render.yaml       # ← Configuración de deploy
├── .env.example      # ← Variables documentadas
└── README.md
```
