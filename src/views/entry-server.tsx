import { createServerRenderer } from '@maxal_studio/kratosjs-react/server';
import { pluginClients } from 'virtual:kratos-client';
import Layout from './Layout';

const pages = import.meta.glob('./pages/**/*.tsx');

export const render = createServerRenderer({ pages, plugins: pluginClients, layout: Layout });
