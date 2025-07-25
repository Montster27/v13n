import { useEffect, useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Card } from './components/common/Card';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AdvancedStoryletCreator } from './components/storylets/AdvancedStoryletCreator';
import { StoryletBrowser } from './components/browser/StoryletBrowser';
import { ArcManager } from './components/arcs/ArcManager';
import { VisualStoryletEditor } from './components/visual/VisualStoryletEditor';
import { CharacterManager } from './components/characters/CharacterManager';
import { ClueManager } from './components/clues/ClueManager';
import { StoryletSandbox } from './components/sandbox/StoryletSandbox';
import { DataManager } from './components/data/DataManager';
import { MinigameTester } from './components/testing/MinigameTester';
import { initializeEnvironment } from './utils/featureFlags';
import { useCoreGameStore } from './stores/useCoreGameStore';
import { useNarrativeStore } from './stores/useNarrativeStore';
import { useCharacterStore } from './stores/useCharacterStore';
import { useClueStore } from './stores/useClueStore';
import { initializeSecurity } from './utils/security';
import './utils/debugDatabase'; // Load debug utilities
import { checkAndInitializeData, diagnoseVisualEditorIssues } from './utils/initializeApp';

type AppView = 'dashboard' | 'storylets' | 'create-storylet' | 'edit-storylet' | 'arcs' | 'visual-editor' | 'characters' | 'clues' | 'sandbox' | 'data-manager' | 'minigame-tester';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [editingStoryletId, setEditingStoryletId] = useState<string | undefined>();
  const [editingArcId, setEditingArcId] = useState<string | undefined>();
  
  const environment = useCoreGameStore(state => state.environment);
  const { storylets, arcs, loadStorylets, loadStoryArcs } = useNarrativeStore();
  const { characters, loadCharacters } = useCharacterStore();
  const { clues, loadClues } = useClueStore();

  useEffect(() => {
    // Initialize environment and feature flags on app start
    initializeEnvironment();
    
    // Initialize security measures
    initializeSecurity();
    
    // Load existing data from Dexie
    loadStorylets();
    loadStoryArcs();
    loadCharacters();
    loadClues();
    
    // Check if database is empty and provide helpful information
    setTimeout(() => {
      checkAndInitializeData(false).then(result => {
        if (result.needsData) {
          console.log('💡 Visual Editor appears empty? Run window.diagnoseVisualEditor() in console for help');
        }
      });
      
      // Make diagnosis function available globally
      (window as any).diagnoseVisualEditor = diagnoseVisualEditorIssues;
    }, 1000); // Give stores time to load
  }, [loadStorylets, loadStoryArcs, loadCharacters, loadClues]);

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
                  onClick={() => setCurrentView('characters')}
                >
                  • Manage characters
                </li>
                <li 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => setCurrentView('clues')}
                >
                  • Design clues
                </li>
                <li 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => setCurrentView('sandbox')}
                >
                  • Test in sandbox (Phase 5)
                </li>
                <li 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => setCurrentView('data-manager')}
                >
                  • Import/Export data
                </li>
                <li 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => setCurrentView('minigame-tester')}
                >
                  • Test minigames 🎮
                </li>
              </ul>
            </Card>

            <Card title="Project Status">
              {storylets.length === 0 && arcs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-semibold mb-2">No Data Found</h3>
                  <p className="text-base-content/70 mb-4">
                    Your database is empty. The Visual Editor will show no storylets or connections.
                  </p>
                  <div className="space-y-2">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setCurrentView('data-manager')}
                    >
                      Go to Data Manager
                    </button>
                    <p className="text-xs opacity-60">
                      Create sample storylets to test the visual editor
                    </p>
                  </div>
                </div>
              ) : (
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
                    <div className="stat-value text-accent">{characters.length}</div>
                    <div className="stat-desc">
                      {characters.filter(c => c.status === 'active').length} active, {' '}
                      {characters.filter(c => c.importance === 'critical').length} critical
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Clues</div>
                    <div className="stat-value text-info">{clues.length}</div>
                    <div className="stat-desc">
                      {clues.filter(c => c.isDiscovered).length} discovered, {' '}
                      {clues.filter(c => c.status === 'resolved').length} resolved
                    </div>
                  </div>
                </div>
              )}
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

      case 'characters':
        return (
          <CharacterManager />
        );

      case 'clues':
        return (
          <ClueManager />
        );

      case 'sandbox':
        return (
          <StoryletSandbox />
        );

      case 'data-manager':
        return (
          <DataManager />
        );

      case 'minigame-tester':
        return (
          <MinigameTester />
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
      case 'characters': return 'Characters';
      case 'clues': return 'Clues';
      case 'sandbox': return 'Storylet Sandbox';
      case 'data-manager': return 'Data Manager';
      case 'minigame-tester': return 'Minigame Tester';
      default: return 'V13n Content Creator';
    }
  };

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log errors to console in development
        if (import.meta.env.DEV) {
          console.error('App Error:', error, errorInfo);
        }
        // Here you could send errors to an error tracking service
        // Example: window.Sentry?.captureException(error);
      }}
    >
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
              {currentView === 'characters' && (
                <button 
                  onClick={() => setCurrentView('characters')}
                  className="font-semibold"
                >
                  Characters
                </button>
              )}
              {currentView === 'clues' && (
                <button 
                  onClick={() => setCurrentView('clues')}
                  className="font-semibold"
                >
                  Clues
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
      <ErrorBoundary fallback={
        <Card className="p-8 text-center">
          <h3 className="text-lg font-semibold text-error mb-2">Component Error</h3>
          <p className="text-base-content/70">
            There was an error loading this component. Please try refreshing the page.
          </p>
        </Card>
      }>
        {renderContent()}
      </ErrorBoundary>
    </MainLayout>
    </ErrorBoundary>
  );
}

export default App;