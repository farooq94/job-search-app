import express from 'express';
import cors from 'cors';
import path from 'path';
import jobRoutes from './routes/jobs';
import healthRoutes from './routes/health';
import { errorHandler } from './middleware/error-handler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api', healthRoutes);
app.use('/api', jobRoutes);

// Error handler
app.use(errorHandler);

export default app;
