import React, { useState, useCallback, useRef } from 'react';
import { Card } from '../common/Card';
import { LoadingButton, LoadingSpinner, ProgressBar } from '../common/LoadingSpinner';
import { useLoadingState } from '../../hooks/useLoadingState';
import { useNarrativeStore } from '../../stores/useNarrativeStore';
import { useCharacterStore } from '../../stores/useCharacterStore';
import { useClueStore } from '../../stores/useClueStore';
import { DataExporter, DataImporter, type ImportResult, type ExportData } from '../../utils/dataExport';
import { validateFileUpload, importRateLimiter, exportRateLimiter } from '../../utils/sanitization';
import { useAsyncOperationManager } from '../../utils/asyncManager';
import { createSampleStorylets, createTestStorylet } from '../../utils/createSampleStorylets';

interface ExportOptions {
  includeStorylets: boolean;
  includeArcs: boolean;
  includeClues: boolean;
  includeCharacters: boolean;
  exportFormat: 'json' | 'backup';
  description: string;
}

export const DataManager: React.FC = () => {
  const { storylets, arcs, addStorylet, addStoryArc } = useNarrativeStore();
  const { characters } = useCharacterStore();
  const { clues, addClue } = useClueStore();
  const asyncManager = useAsyncOperationManager();
  
  // Loading state management
  const { 
    isLoading, 
    withLoading, 
    withProgressLoading, 
    isLoadingOperation 
  } = useLoadingState({
    defaultMessage: 'Processing...',
    showProgress: true
  });
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeStorylets: true,
    includeArcs: true,
    includeClues: true,
    includeCharacters: false, // Not implemented yet
    exportFormat: 'json',
    description: ''
  });

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(async () => {
    // Check rate limiting
    const sessionId = 'export-session';
    if (!exportRateLimiter.isAllowed(sessionId)) {
      alert('Export rate limit exceeded. Please wait before exporting again.');
      return;
    }

    await withLoading(async () => {
      exportRateLimiter.recordAttempt(sessionId);
      const selectedStorylets = exportOptions.includeStorylets ? storylets : [];
      const selectedArcs = exportOptions.includeArcs ? arcs : [];
      const selectedClues = exportOptions.includeClues ? clues : [];

      // Ensure storylets have required fields
      const normalizedStorylets = selectedStorylets.map(s => ({
        ...s,
        tags: s.tags || []
      }));

      let exportData: string;
      let filename: string;

      if (exportOptions.includeStorylets && exportOptions.includeArcs && exportOptions.includeClues) {
        // Export all
        exportData = DataExporter.exportAll(
          normalizedStorylets, 
          selectedArcs, 
          selectedClues, 
          { description: exportOptions.description || undefined }
        );
        filename = DataExporter.generateFilename('v13n_complete_export');
      } else if (exportOptions.includeStorylets && selectedStorylets.length > 0) {
        // Export only storylets
        exportData = DataExporter.exportStorylets(
          normalizedStorylets, 
          { description: exportOptions.description || undefined }
        );
        filename = DataExporter.generateFilename('v13n_storylets_export');
      } else if (exportOptions.includeArcs && selectedArcs.length > 0) {
        // Export only arcs
        exportData = DataExporter.exportArcs(
          selectedArcs, 
          { description: exportOptions.description || undefined }
        );
        filename = DataExporter.generateFilename('v13n_arcs_export');
      } else if (exportOptions.includeClues && selectedClues.length > 0) {
        // Export only clues
        exportData = DataExporter.exportClues(
          selectedClues, 
          { description: exportOptions.description || undefined }
        );
        filename = DataExporter.generateFilename('v13n_clues_export');
      } else {
        alert('Please select at least one data type to export');
        return;
      }

      DataExporter.downloadAsFile(exportData, filename);
    }, 'export-data', 'data-export', 'Preparing export...');
  }, [exportOptions, storylets, arcs, clues, withLoading]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file upload
    const fileValidation = validateFileUpload(file);
    if (!fileValidation.valid) {
      setImportErrors(fileValidation.errors);
      return;
    }

    // Check rate limiting
    const sessionId = 'import-session';
    if (!importRateLimiter.isAllowed(sessionId)) {
      setImportErrors(['Import rate limit exceeded. Please wait before importing again.']);
      return;
    }

    setImportErrors([]);
    setImportPreview(null);

    try {
      importRateLimiter.recordAttempt(sessionId);
      
      const { data, errors } = await withLoading(async () => {
        return asyncManager.register(
          'parse-import-file',
          'file-processing',
          async (signal) => {
            if (signal?.aborted) throw new Error('Operation aborted');
            return DataImporter.parseImportFile(file);
          }
        );
      }, 'parse-file', 'file-parsing', 'Parsing import file...');
      
      if (errors.length > 0) {
        setImportErrors(errors);
        return;
      }

      if (data) {
        setImportPreview(data);
      }
    } catch (error) {
      setImportErrors([`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!importPreview) return;
    
    try {
      const result = await withProgressLoading(async (updateProgress) => {
        updateProgress(10, 'Processing import data...');
        
        const { storylets: importedStorylets, arcs: importedArcs, clues: importedClues, errors } = 
          DataImporter.processImportData(importPreview);

        if (errors.length > 0) {
          setImportErrors(errors);
          return null;
        }

        updateProgress(25, `Importing ${importedStorylets.length} storylets...`);

        // Import storylets
        const storyletPromises = importedStorylets.map(storylet => 
          addStorylet({
            title: storylet.title,
            description: storylet.description,
            content: storylet.content,
            triggers: storylet.triggers,
            choices: storylet.choices,
            effects: storylet.effects,
            storyArc: storylet.storyArc,
            status: storylet.status,
            tags: storylet.tags,
            priority: storylet.priority,
            estimatedPlayTime: storylet.estimatedPlayTime,
            prerequisites: storylet.prerequisites
          })
        );

        updateProgress(50, `Importing ${importedArcs.length} story arcs...`);

        // Import arcs
        const arcPromises = importedArcs.map(arc => 
          addStoryArc({
            name: arc.name,
            description: arc.description,
            estimatedLength: arc.estimatedLength,
            prerequisites: arc.prerequisites,
            tags: arc.tags
          })
        );

        updateProgress(75, `Importing ${importedClues.length} clues...`);

        // Import clues
        const cluePromises = importedClues.map(clue => 
          addClue({
            name: clue.name,
            title: clue.title,
            description: clue.description,
            fullDescription: clue.fullDescription,
            category: clue.category,
            type: clue.type,
            importance: clue.importance,
            investigationLevel: clue.investigationLevel || 'surface',
            reliability: clue.reliability || 'uncertain',
            status: clue.status || 'active',
            tags: clue.tags || [],
            keywords: clue.keywords || [],
            narrativeWeight: clue.narrativeWeight || 1,
            icon: clue.icon,
            color: clue.color,
            prerequisites: clue.prerequisites,
            requiredStorylets: clue.requiredStorylets,
            requiredCharacterInteractions: clue.requiredCharacterInteractions,
            unlocksStorylets: clue.unlocksStorylets || [],
            evidence: clue.evidence,
            connections: clue.connections,
            isMinigame: clue.isMinigame,
            minigameConfig: clue.minigameConfig
          })
        );

        updateProgress(90, 'Finalizing import...');

        // Wait for all imports to complete
        await Promise.all([...storyletPromises, ...arcPromises, ...cluePromises]);

        const result: ImportResult = {
          success: true,
          imported: {
            storylets: importedStorylets.length,
            arcs: importedArcs.length,
            clues: importedClues.length
          },
          errors: [],
          warnings: []
        };

        updateProgress(100, 'Import completed!');
        return result;
      }, 'import-data', 'data-import', 'Starting import...');

      if (result) {
        setImportResult(result);
        setImportPreview(null);
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

    } catch (error) {
      setImportErrors([`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  }, [importPreview, addStorylet, addStoryArc, addClue, withProgressLoading]);

  const handleCancelImport = useCallback(() => {
    setImportPreview(null);
    setImportErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleCreateSampleData = useCallback(async () => {
    await withLoading(async () => {
      const result = await createSampleStorylets();
      setImportResult({
        success: true,
        imported: {
          storylets: result.storyletIds.length,
          arcs: 1,
          clues: 0
        },
        errors: [],
        warnings: []
      });
    }, 'create-sample', 'data-creation', 'Creating sample storylets...');
  }, [withLoading]);

  const handleCreateTestStorylet = useCallback(async () => {
    await withLoading(async () => {
      await createTestStorylet();
      setImportResult({
        success: true,
        imported: {
          storylets: 1,
          arcs: 0,
          clues: 0
        },
        errors: [],
        warnings: []
      });
    }, 'create-test', 'data-creation', 'Creating test storylet...');
  }, [withLoading]);

  return (
    <div className="space-y-6">
      {/* Sample Data Section */}
      <Card title="Sample Data" className="border-2 border-info/20">
        <div className="space-y-4">
          <p className="text-sm opacity-80">
            Create sample storylets and story arcs to test the visual editor. This is helpful when starting with an empty database.
          </p>
          
          <div className="flex gap-2 flex-wrap">
            <LoadingButton
              isLoading={isLoadingOperation('create-sample')}
              loadingText="Creating..."
              onClick={handleCreateSampleData}
              className="btn-info"
            >
              📚 Create Sample Detective Story
            </LoadingButton>
            
            <LoadingButton
              isLoading={isLoadingOperation('create-test')}
              loadingText="Creating..."
              onClick={handleCreateTestStorylet}
              className="btn-outline btn-info"
            >
              🧪 Create Test Storylet
            </LoadingButton>
          </div>
          
          <div className="text-xs opacity-60">
            <p>• Sample Detective Story: Creates 4 storylets and 1 story arc with connections</p>
            <p>• Test Storylet: Creates a single test storylet for quick verification</p>
          </div>
        </div>
      </Card>

      {/* Export Section */}
      <Card title="Export Data">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="label cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={exportOptions.includeStorylets}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeStorylets: e.target.checked }))}
              />
              <span className="label-text ml-2">
                Storylets ({storylets.length})
              </span>
            </label>

            <label className="label cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={exportOptions.includeArcs}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeArcs: e.target.checked }))}
              />
              <span className="label-text ml-2">
                Story Arcs ({arcs.length})
              </span>
            </label>

            <label className="label cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={exportOptions.includeClues}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeClues: e.target.checked }))}
              />
              <span className="label-text ml-2">
                Clues ({clues.length})
              </span>
            </label>

            <label className="label cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={exportOptions.includeCharacters}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeCharacters: e.target.checked }))}
                disabled
              />
              <span className="label-text ml-2 opacity-50">
                Characters ({characters.length})
              </span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Export Description (Optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder="Describe this export..."
              value={exportOptions.description}
              onChange={(e) => setExportOptions(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <LoadingButton
            isLoading={isLoadingOperation('export-data')}
            loadingText="Exporting..."
            onClick={handleExport}
            disabled={!exportOptions.includeStorylets && !exportOptions.includeArcs && !exportOptions.includeClues}
            className="btn-primary"
          >
            📥 Export Selected Data
          </LoadingButton>
        </div>
      </Card>

      {/* Import Section */}
      <Card title="Import Data">
        <div className="space-y-4">
          {!importPreview ? (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Select Import File</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="file-input file-input-bordered w-full"
                  disabled={isLoading}
                />
                <label className="label">
                  <span className="label-text-alt">Accepts JSON files exported from V13n</span>
                </label>
              </div>

              {isLoadingOperation('parse-file') && (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" inline />
                  <span>Processing file...</span>
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="alert alert-error">
                  <div>
                    <h3 className="font-bold">Import Errors:</h3>
                    <ul className="list-disc list-inside">
                      {importErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="alert alert-success">
                  <div>
                    <h3 className="font-bold">Import Successful!</h3>
                    <p>
                      Imported: {importResult.imported.storylets} storylets, {importResult.imported.arcs} arcs, {importResult.imported.clues} clues
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-base-200 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Import Preview</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Storylets:</span>
                    <span className="ml-2">{importPreview.data.storylets?.length || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium">Story Arcs:</span>
                    <span className="ml-2">{importPreview.data.arcs?.length || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium">Clues:</span>
                    <span className="ml-2">{importPreview.data.clues?.length || 0}</span>
                  </div>
                </div>
                
                {importPreview.metadata.description && (
                  <div className="mt-2">
                    <span className="font-medium">Description:</span>
                    <p className="text-sm opacity-80 mt-1">{importPreview.metadata.description}</p>
                  </div>
                )}

                <div className="mt-2 text-xs opacity-60">
                  Exported: {new Date(importPreview.timestamp).toLocaleString()}
                  {importPreview.metadata.tags && (
                    <span className="ml-2">
                      Tags: {importPreview.metadata.tags.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <LoadingButton
                  isLoading={isLoadingOperation('import-data')}
                  loadingText="Importing..."
                  onClick={handleConfirmImport}
                  className="btn-primary"
                >
                  📤 Confirm Import
                </LoadingButton>
                <button
                  className="btn btn-ghost"
                  onClick={handleCancelImport}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
              
              {/* Progress Bar for Import */}
              {isLoadingOperation('import-data') && (
                <div className="mt-4">
                  <ProgressBar 
                    progress={isLoading ? 50 : 0} 
                    message="Importing data..." 
                    showPercentage={true}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Statistics */}
      <Card title="Current Data">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat">
            <div className="stat-title">Storylets</div>
            <div className="stat-value text-primary">{storylets.length}</div>
            <div className="stat-desc">
              {storylets.filter(s => s.status === 'live').length} live
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-title">Story Arcs</div>
            <div className="stat-value text-secondary">{arcs.length}</div>
          </div>
          
          <div className="stat">
            <div className="stat-title">Clues</div>
            <div className="stat-value text-accent">{clues.length}</div>
            <div className="stat-desc">
              {clues.filter(c => c.isDiscovered).length} discovered
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-title">Characters</div>
            <div className="stat-value">{characters.length}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};