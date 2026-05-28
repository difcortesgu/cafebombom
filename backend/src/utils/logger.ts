import fs from 'fs';
import os from 'os';
import path from 'path';
import winston from 'winston';

// 1. Formato base para los mensajes
const customFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
    // Si hay un error con "stack trace", lo imprime, si no, solo el mensaje
    return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
});

// 2. Inicializamos el logger base (sin salidas configuradas todavía)
export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        customFormat
    ),
    transports: [] // ¡Vacío por ahora!
});

// 3. Verificamos en qué entorno estamos
const isProduction = process.env.NODE_ENV !== 'development';

if (isProduction) {
    // =========================================================
    //   ENTORNO DE PRODUCCIÓN (Archivos en AppData / .config)
    // =========================================================

    // A. Resolver la ruta segura del sistema operativo
    const appDataPath = process.platform === 'win32'
        ? path.join(os.homedir(), 'AppData', 'Roaming', 'CafeBomBom')
        : path.join(os.homedir(), '.config', 'CafeBomBom');

    const logDir = path.join(appDataPath, 'logs');

    // B. Crear la ruta de carpetas si no existe ({ recursive: true } crea toda la cadena)
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // C. Agregar los transportes para escribir en los archivos
    logger.add(new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB máximo por archivo
        maxFiles: 5
    }));

    logger.add(new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5
    }));

} else {
    // =========================================================
    //   ENTORNO DE DESARROLLO (Solo consola)
    // =========================================================

    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(), // Agrega colores según el nivel (rojo para error, verde info)
            winston.format.simple()
        )
    }));
}