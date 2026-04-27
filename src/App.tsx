import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

export default function App() {
  // Main app entry point
  return <RouterProvider router={router} />;
}
