#!/bin/bash
# ===============================================================
#   🥩 SISTEMA DE INVENTARIO Y VENTAS - CARNICERÍA (MacBook) 🥩
# ===============================================================

# Posicionarse en la carpeta donde está este archivo
cd "$(dirname "$0")" || exit 1

clear
echo "==============================================================="
echo "       🥩 SISTEMA DE INVENTARIO Y VENTAS - CARNICERÍA 🥩"
echo "==============================================================="
echo ""

# Detectar IP local en macOS (interfaz Wi-Fi en0 o en1)
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

echo " [✓] Red Local Detectada:"
echo " ---------------------------------------------------------------"
echo "  💻 En esta MacBook     : http://localhost:5173"
echo "  📱 Celulares en Wi-Fi   : http://${LOCAL_IP}:5173"
echo " ---------------------------------------------------------------"
echo "  🔑 Credenciales iniciales:"
echo "     • Administrador : admin    / admin"
echo "     • Vendedor      : vendedor / 12345"
echo " ==============================================================="
echo ""
echo " Iniciando Backend (Puerto 3000) y Frontend (Puerto 5173)..."
echo ""

# Iniciar Backend en segundo plano
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Iniciar Frontend en segundo plano
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Al cerrar la ventana o presionar Ctrl+C, detener ambos procesos limpiamente
cleanup() {
    echo ""
    echo " Deteniendo servidores..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    lsof -ti:3000,5173 | xargs kill -9 2>/dev/null
    echo " [✓] Servidores detenidos. Hasta pronto!"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Esperar 3 segundos para que los puertos respondan y abrir el navegador en macOS
sleep 3
open "http://localhost:5173"

echo ""
echo " ==============================================================="
echo " ✅ SISTEMA EN EJECUCIÓN"
echo " ==============================================================="
echo "  1. El navegador se abrirá automáticamente en tu MacBook."
echo "  2. Conecta los celulares a la misma red Wi-Fi y abre:"
echo "     http://${LOCAL_IP}:5173"
echo ""
echo " Para DETENER los servidores, presiona Ctrl+C o cierra esta ventana."
echo " ==============================================================="
echo ""

wait
