import { hydrateViewsApp } from '@maxal_studio/kratosjs-react/views';
import { pluginClients } from 'virtual:kratos-client';
import Layout from './Layout';

// Every file under ./pages is a view component, keyed by path (e.g. 'blog/Show').
const pages = import.meta.glob('./pages/**/*.tsx');

hydrateViewsApp({ pages, plugins: pluginClients, layout: Layout });
