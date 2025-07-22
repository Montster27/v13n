import { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Card } from './components/common/Card';
import { initializeEnvironment } from './utils/featureFlags';
import { useCoreGameStore } from './stores/useCoreGameStore';

function App() {
  const environment = useCoreGameStore(state => state.environment);

  useEffect(() => {
    // Initialize environment and feature flags on app start
    initializeEnvironment();
  }, []);

  return (
    <MainLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Welcome to V13n Content Creator">
          <p className="text-base-content">
            This is your narrative content creation tool for building interactive stories.
          </p>
          <div className="mt-4">
            <p className="text-sm opacity-70">Environment: {environment}</p>
          </div>
        </Card>

        <Card title="Quick Actions" actions={
          <button className="btn btn-primary btn-sm">Get Started</button>
        }>
          <ul className="space-y-2">
            <li>• Create a new storylet</li>
            <li>• Manage characters</li>
            <li>• Design clues</li>
            <li>• Test in sandbox</li>
          </ul>
        </Card>

        <Card title="Project Status">
          <div className="stats stats-vertical shadow">
            <div className="stat">
              <div className="stat-title">Storylets</div>
              <div className="stat-value text-primary">0</div>
            </div>
            <div className="stat">
              <div className="stat-title">Characters</div>
              <div className="stat-value text-secondary">0</div>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

export default App;