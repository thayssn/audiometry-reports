import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { Toaster } from "solid-toast";
import "./app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <main>
          <Toaster 
            position="top-center" 
            toastOptions={{
              duration: 3000,
              style: {
                'max-width': '500px',
              }
            }}
            containerStyle={{
              'z-index': '9999',
            }}
          />
          <Suspense>{props.children}</Suspense>
        </main>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
