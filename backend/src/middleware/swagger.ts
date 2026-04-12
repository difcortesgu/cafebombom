import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express SQLite API',
      version: '1.0.0',
      description: 'A simple Express API with TypeScript and SQLite',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: [path.join(process.cwd(), 'src/**/*.ts'), path.join(process.cwd(), 'dist/**/*.js')]
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

export { swaggerDocs, swaggerUi };
