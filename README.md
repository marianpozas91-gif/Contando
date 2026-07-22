# Mi Balance

MVP local-first para controlar ingresos, gastos, presupuestos, deudas y pagos recurrentes. Está diseñado para móvil, funciona como PWA y conserva la información en el navegador del dispositivo.

## Funciones

- Crear, editar y eliminar ingresos y gastos.
- Marcar movimientos como pagados/cobrados o pendientes.
- Crear y editar partidas de presupuesto.
- Comparación automática de presupuesto contra resultado real.
- Gestión editable de deudas y gastos recurrentes.
- Áreas y categorías personalizables.
- Reportes, cierre mensual editable y exportación CSV/PDF.
- Respaldo y restauración de toda la información en JSON.
- Historial local de cambios.

## Desarrollo

```bash
npm ci
npm run dev
```

Después abre la dirección indicada por Vite. Para validar la versión de producción:

```bash
npm run lint
npm run build
```

## Privacidad

Esta primera versión no utiliza cuentas ni una base de datos remota. La información financiera se guarda mediante `localStorage` en el navegador. Borrar los datos del navegador elimina la información local; usa la copia de seguridad JSON para conservarla o moverla a otro dispositivo.
