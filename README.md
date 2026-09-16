# 🥩 Sistema Web de Inventario y Ventas para Carnicería

Sistema integral de punto de venta (POS), gestión de lotes despostados (reses y cerdos), productos generales, control estricto de inventario por movimientos atómicos, trazabilidad completa, idempotencia y analítica en tiempo real para carnicerías.

Diseñado con enfoque **Mobile-First** para operar dentro de la **red local (Wi-Fi)** de la carnicería desde teléfonos celulares y computadores, y con una arquitectura lista para despliegue en la nube.

---

## 🚀 Tecnologías Principales

- **Backend**: Node.js v20+, Express.js, TypeScript, Prisma ORM, MySQL 8+.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Seguridad**: Autenticación JWT, contraseñas con hash bcryptjs, middleware de roles (`ADMIN`, `VENDEDOR`) y ventana de edición temporal para vendedores.
- **Movilidad**: Progressive Web App (PWA) instalable en teléfonos Android e iOS.
- **Resiliencia**: Autoguardado de borradores de formularios en almacenamiento local (recuperación ante recargas o cortes de conexión) e idempotencia en ventas.

---

## 📋 Requisitos Previos

1. **Node.js**: Versión 18 o superior (recomendado v20+ o v22). Descargar desde [nodejs.org](https://nodejs.org/).
2. **MySQL Server**: Versión 8.0 o superior (o MySQL 26.x).
3. **Red Local (Wi-Fi)**: Para conectar teléfonos celulares a la aplicación.

---

## 🛠️ Guía Paso a Paso de Instalación y Configuración

### 1. Clonar o Ubicar el Proyecto
El proyecto cuenta con dos carpetas principales:
```text
carniceria/
├── backend/    (Servidor API REST y Base de Datos)
├── frontend/   (Aplicación Web SPA Mobile-First)
└── README.md
```

---

### 2. Configurar MySQL y la Base de Datos

Inicia sesión en tu consola de MySQL:
```bash
mysql -u root -p
```
(Ingresa tu contraseña de MySQL, por ejemplo `1234`).

Crea la base de datos para el sistema:
```sql
CREATE DATABASE carniceria_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

---

### 3. Configurar Variables de Entorno del Backend

Ingresa a la carpeta `backend` y revisa el archivo `.env`:
```env
PORT=3000
DATABASE_URL="mysql://root:1234@localhost:3306/carniceria_db"
JWT_SECRET="carniceria_super_secret_jwt_key_2026_x789"
VENDEDOR_EDIT_WINDOW_MINUTES=30
```
> **Nota**: Ajusta el usuario (`root`) y la contraseña (`1234`) si tu instalación local de MySQL utiliza otras credenciales.

---

### 4. Instalar Dependencias del Backend

Desde la carpeta `backend`, ejecuta:
```bash
npm install
```

---

### 5. Sincronizar Prisma y Aplicar el Seed Inicial

Genera el cliente de Prisma, sincroniza las tablas en MySQL y carga los datos de inicio:

```bash
# Sincronizar esquema en MySQL
npx prisma db push

# Cargar usuarios, categorías y cortes iniciales
npx tsx prisma/seed.ts
```

#### Credenciales Iniciales:
- **Administrador**:
  - Usuario: `admin`
  - Contraseña: `admin`
- **Vendedor**:
  - Usuario: `vendedor`
  - Contraseña: `12345`

---

### 6. Instalar Dependencias del Frontend

Abre otra terminal, dirígete a la carpeta `frontend` y ejecuta:
```bash
npm install
```

---

### 7. Iniciar el Sistema

#### Terminal 1 - Iniciar Backend:
```bash
cd backend
npm run dev
```
El backend iniciará en `http://0.0.0.0:3000`.

#### Terminal 2 - Iniciar Frontend:
```bash
cd frontend
npm run dev
```
El frontend iniciará en `http://0.0.0.0:5173`.

---

### ⚡ Inicializadores One-Click (Sin Comandos)

Para iniciar ambos servidores (Backend y Frontend) simultáneamente con un solo clic:

* **En Windows (PC)**: Haz doble clic sobre el archivo [`iniciar_sistema.cmd`](file:///d:/Proyectos/C/iniciar_sistema.cmd).
  * Detecta tu IP local automáticamente.
  * Inicia Backend y Frontend.
  * Abre el navegador en `http://localhost:5173`.
  * Para detener todo al finalizar la jornada, presiona cualquier tecla en la ventana.

* **En MacBook (macOS)**: Haz doble clic sobre el archivo [`iniciar_sistema_mac.command`](file:///d:/Proyectos/C/iniciar_sistema_mac.command).
  * Si es la primera vez que lo usas en Mac, dale permisos de ejecución en la Terminal: `chmod +x iniciar_sistema_mac.command`.
  * Abre la Terminal, inicia ambos servidores y abre tu navegador automáticamente.

---

## 📱 Cómo Acceder desde Celulares en la Red Wi-Fi Local

1. Conecta el teléfono celular a la **misma red Wi-Fi** donde está conectada la computadora servidor.
2. Abre la consola de comandos de Windows (`cmd` o `PowerShell`) en tu PC y escribe:
   ```cmd
   ipconfig
   ```
   Ubica la línea que dice **Dirección IPv4** (por ejemplo: `192.168.1.4`).
3. En el navegador del celular (Chrome o Safari), ingresa a la siguiente dirección:
   ```text
   http://192.168.1.4:5173
   ```
4. **Instalar como App (PWA)**:
   - En Android (Chrome): Pulsa en los tres puntos de opciones y selecciona **"Agregar a la pantalla principal"** o **"Instalar aplicación"**.
   - En iOS (Safari): Pulsa el botón de Compartir y selecciona **"Agregar al inicio"**.

---

## 🛡️ Configuración del Firewall de Windows (Si el celular no conecta)

Si al ingresar la IP en el celular no carga la página, es probable que el Firewall de Windows esté bloqueando las conexiones entrantes a los puertos `5173` y `3000`.

Para habilitarlos rápidamente desde una consola de **PowerShell como Administrador**:

```powershell
New-NetFirewallRule -DisplayName "Carniceria Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Carniceria Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## 💡 Conceptos Clave y Funcionalidades del Sistema

### 1. Lotes y Cortes de Res y Cerdo (Secciones 2, 6, 7, 8, 9, 10, 11)
- Ni una res ni un cerdo son tratados como productos individuales. Son **lotes de desposte**.
- Generación automática de identificador consecutivo:
  - Res: `RES 001 - LOTE MMDDYY`
  - Cerdo: `CER 001 - LOTE MMDDYY`
- Cada corte del lote registra su peso inicial, stock actual y precio estimado por kilogramo.
- **Indicador de Rendimiento**:
  $$\text{Rendimiento (\%)} = \left(\frac{\text{Valor Total Estimado de Cortes}}{\text{Precio de Compra del Animal}}\right) \times 100$$
  *(Aclaración: es un indicador de cobertura estimada, no un margen de ganancia neto).*

### 2. Trazabilidad y Movimientos de Inventario (Secciones 15, 16, 17)
- Cada venta de un corte conserva el código congelado del lote de origen (`RES 001 - LOTE 091426`) para auditoría.
- Todo cambio en el stock genera un registro inmutable en `inventory_movements`:
  - `ENTRADA`: Ingreso de lotes o compras iniciales.
  - `VENTA`: Descuento automático por cada comprobante confirmado.
  - `MERMA`: Descuento por producto deteriorado u óseo.
  - `AJUSTE`: Corrección administrativa supervisada.
- El sistema no permite inventarios negativos bajo ninguna circunstancia.

### 3. Concurrencia y Transacciones Atómicas (Sección 18)
- Las operaciones de venta se ejecutan dentro de `prisma.$transaction`.
- Si dos vendedores intentan vender al mismo tiempo la última porción de un corte, el sistema valida la disponibilidad en el momento de la confirmación y rechaza cualquier exceso, garantizando que el stock nunca sea negativo.

### 4. Idempotencia en Ventas (Sección 19)
- Para evitar ventas duplicadas causadas por micro-cortes en el Wi-Fi del celular, el frontend genera una clave única `idempotency_key` por cada transacción.
- Si el usuario pulsa repetidamente "Confirmar Venta", el backend detecta la clave y devuelve la venta ya procesada sin cobrar dos veces ni descontar inventario doble.

### 5. Ventana de Edición del Vendedor (Secciones 3, 4)
- El rol `VENDEDOR` puede registrar lotes y productos y editarlos durante una ventana de tiempo configurable (`VENDEDOR_EDIT_WINDOW_MINUTES=30`).
- Pasados los 30 minutos, el backend rechaza cualquier modificación con un error HTTP 403: *"Este registro ya no puede ser modificado por el vendedor. Solicite al administrador realizar el cambio."*
- El vendedor **nunca** puede eliminar registros ni lotes.

### 6. Autoguardado y Recuperación de Formularios (Sección 20)
- Si un vendedor está digitando una res con 15 cortes y se le apaga el celular o recarga la página, el formulario se almacena automáticamente en el almacenamiento local del dispositivo.
- Al ingresar de nuevo, el sistema presenta una alerta: *"Tienes un formulario sin terminar: [Continuar borrador] [Descartar]"*.
- El borrador **únicamente** se borra cuando el servidor responde confirmación 200 OK.

### 7. Dashboard Administrativo Real (Secciones 21, 22, 23, 24)
- Gráficas interactivas con Recharts alimentadas con consultas agregadas reales sobre MySQL:
  - Evolución de ventas diarias y mensuales.
  - Métodos de pago (Efectivo vs Transferencia).
  - Ranking descriptivo de cortes y productos más vendidos.
  - Comparativa de rendimiento individual por lote.
  - Ventas acumuladas por vendedor.
- Filtros dinámicos: *Hoy*, *Últimos 7 días*, *Este mes*, *Mes anterior*, *Últimos 30 días* y *Rango personalizado*.

---

## 🔒 Auditoría y Seguridad (Secciones 27, 28)
- Todas las operaciones críticas (creación de lotes, ajustes de stock, ventas, altas de usuarios) quedan registradas en la tabla `audit_logs` con usuario responsable, fecha y datos previos/nuevos.
- Las ventas y registros históricos no se eliminan físicamente para salvaguardar la contabilidad.
