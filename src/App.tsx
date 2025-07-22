import { useEffect, useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Card } from './components/common/Card';
import { AdvancedStoryletCreator } from './components/storylets/AdvancedStoryletCreator';
import { StoryletBrowser } from './components/browser/StoryletBrowser';
import { ArcManager } from './components/arcs/ArcManager';
import { VisualStoryletEditor } from './components/visual/VisualStoryletEditor';
import { initializeEnvironment } from './utils/featureFlags';
import { useCoreGameStore } from './stores/useCoreGameStore';
import { useNarrativeStore } from './stores/useNarrativeStore';

type AppView = 'dashboard' | 'storylets' | 'create-storylet' | 'edit-storylet' | 'arcs' | 'visual-editor';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [editingStoryletId, setEditingStoryletId] = useState<string | undefined>();
  const [editingArcId, setEditingArcId] = useState<string | undefined>();
  
  const environment = useCoreGameStore(state => state.environment);
  const { storylets, arcs, loadStorylets, loadStoryArcs } = useNarrativeStore();

  useEffect(() => {
    // Initialize environment and feature flags on app start
    initializeEnvironment();
    
    // Load existing data from Dexie
    loadStorylets();
    loadStoryArcs();
  }, [loadStorylets, loadStoryArcs]);

  const handleCreateStorylet = () => {
    setEditingStoryletId(undefined);
    setCurrentView('create-storylet');
  };

  const handleEditStorylet = (storyletId: string) => {
    setEditingStoryletId(storyletId);
    setCurrentView('edit-storylet');
  };

  const handleSaveStorylet = () => {
    setCurrentView('storylets');
    setEditingStoryletId(undefined);
  };

  const handleCancelStorylet = () => {
    setCurrentView('storylets');
    setEditingStoryletId(undefined);
  };

  const handleEditArc = (arcId: string) => {
    setEditingArcId(arcId);
    setCurrentView('visual-editor');
  };

  const handleSaveArc = () => {
    setCurrentView('arcs');
    setEditingArcId(undefined);
  };

  const handleCancelArc = () => {
    setCurrentView('arcs');
    setEditingArcId(undefined);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title="Welcome to V13n Content Creator">
              <p className="text-base-content mb-4">
                This is your narrative content creation tool for building interactive stories.
              </p>
              <div className="space-y-2 text-sm opacity-70">
                <p>Environment: {environment}</p>
                <p>Phase 3: Visual Editor & Arc Manager</p>
              </div>
            </Card>

            <Card title="Quick Actions" actions={
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleCreateStorylet}
              >
                Create Storylet
              </button>
            }>
              <ul className="space-y-2 text-sm">
                <li 
                  className="cursor-pointer hover:text-primary"
                  onClick={handleCreateStorylet}
                >
                  • Create a new storylet
                </li>
                <li 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => setCurrentView('storylets')}
                >
                  • Browse existing storylets
                </li>
                <li 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => setCurrentView('arcs')}
                >
                  • Manage story arcs
                </li>
                <li 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => setCurrentView('visual-editor')}
                >
                  • Visual storylet editor
                </li>
                <li className="text-base-content/50">• Manage characters (Phase 4)</li>
                <li className="text-base-content/50">• Design clues (Phase 4)</li>
                <li className="text-base-content/50">• Test in sandbox (Phase 5)</li>
              </ul>
            </Card>

            <Card title="Project Status">
              <div className="stats stats-vertical shadow">
                <div className="stat">
                  <div className="stat-title">Storylets</div>
                  <div className="stat-value text-primary">{storylets.length}</div>
                  <div className="stat-desc">
                    {storylets.filter(s => s.status === 'live').length} live, {' '}
                    {storylets.filter(s => s.status === 'stage').length} staging, {' '}
                    {storylets.filter(s => s.status === 'dev').length} dev
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">Story Arcs</div>
                  <div className="stat-value text-secondary">{arcs.length}</div>
                  <div className="stat-desc">Narrative structures</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Characters</div>
                  <div className="stat-value text-accent">0</div>
                  <div className="stat-desc">Coming in Phase 4</div>
                </div>
              </div>
            </Card>
          </div>
        );

      case 'storylets':
        return (
          <StoryletBrowser
            onEdit={handleEditStorylet}
            onNew={handleCreateStorylet}
          />
        );

      case 'create-storylet':
        return (
          <AdvancedStoryletCreator
            onSave={handleSaveStorylet}
            onCancel={handleCancelStorylet}
          />
        );

      case 'edit-storylet':
        return (
          <AdvancedStoryletCreator
            storyletId={editingStoryletId}
            onSave={handleSaveStorylet}
            onCancel={handleCancelStorylet}
          />
        );

      case 'arcs':
        return (
          <ArcManager
            onVisualEdit={handleEditArc}
          />
        );

      case 'visual-editor':
        return (
          <VisualStoryletEditor
            arcId={editingArcId}
            onSave={handleSaveArc}
            onCancel={handleCancelArc}
          />
        );

      default:
        return <div>Unknown view</div>;
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'storylets': return 'Storylets';
      case 'create-storylet': return 'Create Storylet';
      case 'edit-storylet': return 'Edit Storylet';
      case 'arcs': return 'Story Arcs';
      case 'visual-editor': return 'Visual Editor';
      default: return 'V13n Content Creator';
    }
  };

  return (
    <MainLayout>
      {/* Navigation Breadcrumbs */}
      <div className="breadcrumbs text-sm mb-6">
        <ul>
          <li>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={currentView === 'dashboard' ? 'font-semibold' : 'hover:text-primary'}
            >
              Dashboard
            </button>
          </li>
          {currentView !== 'dashboard' && (
            <li>
              {currentView === 'storylets' && (
                <button 
                  onClick={() => setCurrentView('storylets')}
                  className="font-semibold"
                >
                  Storylets
                </button>
              )}
              {currentView === 'arcs' && (
                <button 
                  onClick={() => setCurrentView('arcs')}
                  className="font-semibold"
                >
                  Story Arcs
                </button>
              )}
              {currentView === 'visual-editor' && (
                <button 
                  onClick={() => setCurrentView('visual-editor')}
                  className="font-semibold"
                >
                  Visual Editor
                </button>
              )}
              {(currentView === 'create-storylet' || currentView === 'edit-storylet') && (
                <>
                  <button 
                    onClick={() => setCurrentView('storylets')}
                    className="hover:text-primary"
                  >
                    Storylets
                  </button>
                </>
              )}
            </li>
          )}
          {(currentView === 'create-storylet' || currentView === 'edit-storylet') && (
            <li>
              <span className="font-semibold">
                {currentView === 'create-storylet' ? 'Create' : 'Edit'}
              </span>
            </li>
          )}
        </ul>
      </div>

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
      </div>

      {/* Main Content */}
      {renderContent()}
    </MainLayout>
  );
}

export default App;