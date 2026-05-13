import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CafeBomBom POS API',
      version: '1.0.0',
      description: 'REST API for the CafeBomBom point-of-sale system',
    },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['owner', 'staff'] },
          },
        },
        ManagedUser: {
          allOf: [
            { $ref: '#/components/schemas/User' },
            {
              type: 'object',
              properties: {
                isActive: { type: 'boolean' },
              },
            },
          ],
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            imageUri: { type: 'string', nullable: true },
          },
        },
        Sale: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            created_at: { type: 'integer' },
            staff_name: { type: 'string' },
            table_name: { type: 'string' },
            payment_method: { type: 'string', enum: ['cash', 'card', 'transfer'], nullable: true },
            total: { type: 'number' },
            status: { type: 'string', enum: ['draft', 'in-progress', 'ready', 'completed', 'cancelled'] },
          },
        },
        Discount: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            scope: { type: 'string', enum: ['product', 'global'] },
            productId: { type: 'string', nullable: true },
            type: { type: 'string', enum: ['percentage', 'fixed'] },
            value: { type: 'number' },
            startsAt: { type: 'integer' },
            endsAt: { type: 'integer', nullable: true },
            isActive: { type: 'boolean' },
          },
        },
        RestaurantTable: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            table_type: { type: 'string', enum: ['dine-in', 'to-go', 'delivery'] },
            created_at: { type: 'integer' },
          },
        },
        Ingredient: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            unit: { type: 'string' },
            quantity: { type: 'number' },
            low_stock_threshold: { type: 'number' },
            supplier_id: { type: 'string', nullable: true },
          },
        },
        IngredientUnit: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        Supplier: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            phone: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
          },
        },
        Expense: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            date: { type: 'integer' },
            category: { type: 'string' },
            amount: { type: 'number' },
            description: { type: 'string', nullable: true },
          },
        },
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            salary_type: { type: 'string', enum: ['hourly', 'monthly'] },
            rate: { type: 'number' },
          },
        },
        ReceiptPreferences: {
          type: 'object',
          required: ['businessName', 'paperWidth', 'taxRate'],
          properties: {
            businessName: { type: 'string' },
            businessAddress: { type: 'string' },
            businessPhone: { type: 'string' },
            businessLogoUri: { type: 'string', nullable: true },
            footerMessage: { type: 'string' },
            paperWidth: { type: 'integer', enum: [58, 80] },
            taxRate: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(process.cwd(), 'src/**/*.ts'), path.join(process.cwd(), 'dist/**/*.js')],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

export { swaggerDocs, swaggerUi };
