import { useState } from 'react';
import { Button } from '@nx-polyglot/ui-shared';
import './App.css';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="app">
      <h1>Nx Polyglot Monorepo</h1>
      <p>React + Go + Java on a single Nx workspace</p>

      <section className="services">
        <div className="card">
          <h2>Frontend</h2>
          <p>React 19 + Vite + TypeScript</p>
          <Button onClick={() => setCount((c) => c + 1)}>
            Count: {count}
          </Button>
        </div>

        <div className="card">
          <h2>Go API</h2>
          <p>
            Running at{' '}
            <a href="http://localhost:8081" target="_blank" rel="noreferrer">
              localhost:8081
            </a>
          </p>
        </div>

        <div className="card">
          <h2>Java API</h2>
          <p>
            Running at{' '}
            <a href="http://localhost:8082" target="_blank" rel="noreferrer">
              localhost:8082
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
