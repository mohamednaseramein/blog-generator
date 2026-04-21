import { jsx as _jsx } from "react/jsx-runtime";
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.js';
const queryClient = new QueryClient();
const root = document.getElementById('root');
if (!root)
    throw new Error('#root element not found');
createRoot(root).render(_jsx(StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(App, {}) }) }));
