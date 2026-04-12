import cors from 'cors';
import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { swaggerDocs, swaggerUi } from './middleware/swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * @openapi
 * /:
 *   get:
 *     description: Welcome to the API
 *     responses:
 *       200:
 *         description: Returns a greeting
 */
app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server is running');
});

// Add this after your middleware setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});