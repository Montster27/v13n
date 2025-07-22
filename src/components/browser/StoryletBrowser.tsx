import React, { useState, useMemo, useCallback } from 'react';
import { Card } from '../common/Card';
import { Input } from '../forms/Input';
import { Select } from '../forms/Select';
import { useNarrativeStore } from '../../stores/useNarrativeStore';

interface StoryletBrowserProps {
  onEdit?: (storyletId: string) => void;
  onDelete?: (storyletId: string) => void;
  onNew?: () => void;
}

type SortBy = 'title' | 'createdAt' | 'updatedAt' | 'priority' | 'status';
type FilterBy = 'all' | 'dev' | 'stage' | 'live';

export const StoryletBrowser: React.FC<StoryletBrowserProps> = ({
  onEdit,
  onDelete,
  onNew
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByStatus, setFilterByStatus] = useState<FilterBy>('all');
  const [filterByArc, setFilterByArc] = useState('all');
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTag, setSelectedTag] = useState('all');

  const { storylets, arcs, deleteStorylet } = useNarrativeStore();

  // Get all unique tags from storylets
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    storylets.forEach(storylet => {
      storylet.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [storylets]);

  // Filter and sort storylets
  const filteredStorylets = useMemo(() => {
    let filtered = storylets.filter(storylet => {
      // Text search
      const matchesSearch = searchTerm === '' || 
        storylet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        storylet.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        storylet.content.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = filterByStatus === 'all' || storylet.status === filterByStatus;

      // Arc filter
      const matchesArc = filterByArc === 'all' || storylet.storyArc === filterByArc;

      // Tag filter
      const matchesTag = selectedTag === 'all' || storylet.tags?.includes(selectedTag);

      return matchesSearch && matchesStatus && matchesArc && matchesTag;
    });

    // Sort results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'priority':
          comparison = (a.priority || 1) - (b.priority || 1);
          break;
        case 'status':
          const statusOrder = { 'dev': 1, 'stage': 2, 'live': 3 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [storylets, searchTerm, filterByStatus, filterByArc, selectedTag, sortBy, sortOrder]);

  const handleDelete = useCallback((storyletId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      deleteStorylet(storyletId);
      if (onDelete) {
        onDelete(storyletId);
      }
    }
  }, [deleteStorylet, onDelete]);

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      dev: 'badge-warning',
      stage: 'badge-info',
      live: 'badge-success'
    };
    return `badge ${statusStyles[status as keyof typeof statusStyles] || 'badge-neutral'}`;
  };

  const getArcName = (arcId?: string) => {
    if (!arcId) return 'No Arc';
    const arc = arcs.find(a => a.id === arcId);
    return arc?.name || 'Unknown Arc';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Storylet Browser</h1>
          <p className="text-base-content/70">
            {filteredStorylets.length} of {storylets.length} storylets
          </p>
        </div>
        
        {onNew && (
          <button onClick={onNew} className="btn btn-primary">
            Create New Storylet
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Input
            label="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search title, description, content..."
          />

          <Select
            label="Status"
            value={filterByStatus}
            onChange={(e) => setFilterByStatus(e.target.value as FilterBy)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'dev', label: 'Development' },
              { value: 'stage', label: 'Staging' },
              { value: 'live', label: 'Live' }
            ]}
          />

          <Select
            label="Story Arc"
            value={filterByArc}
            onChange={(e) => setFilterByArc(e.target.value)}
            options={[
              { value: 'all', label: 'All Arcs' },
              { value: '', label: 'No Arc' },
              ...arcs.map(arc => ({ value: arc.id, label: arc.name }))
            ]}
          />

          <Select
            label="Tag"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            options={[
              { value: 'all', label: 'All Tags' },
              ...allTags.map(tag => ({ value: tag, label: tag }))
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <Select
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            options={[
              { value: 'updatedAt', label: 'Last Modified' },
              { value: 'createdAt', label: 'Created Date' },
              { value: 'title', label: 'Title' },
              { value: 'priority', label: 'Priority' },
              { value: 'status', label: 'Status' }
            ]}
          />

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn btn-ghost btn-sm"
            title={`Currently sorting ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </Card>

      {/* Results */}
      {filteredStorylets.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-base-content/70 text-lg mb-4">
            {storylets.length === 0 ? 'No storylets created yet' : 'No storylets match your filters'}
          </p>
          {onNew && (
            <button onClick={onNew} className="btn btn-primary">
              Create Your First Storylet
            </button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStorylets.map((storylet) => (
            <Card 
              key={storylet.id}
              className="hover:shadow-lg transition-shadow duration-200"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate" title={storylet.title}>
                      {storylet.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge ${getStatusBadge(storylet.status)} badge-sm`}>
                        {storylet.status}
                      </span>
                      {storylet.priority && storylet.priority !== 1 && (
                        <span className="badge badge-outline badge-sm">
                          Priority {storylet.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-base-content/70 line-clamp-3">
                  {storylet.description}
                </p>

                {/* Metadata */}
                <div className="space-y-2 text-xs text-base-content/60">
                  <div className="flex justify-between">
                    <span>Arc: {getArcName(storylet.storyArc)}</span>
                    <span>
                      {storylet.estimatedPlayTime || 5}min
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>
                      {storylet.choices?.length || 0} choices, {storylet.triggers?.length || 0} triggers
                    </span>
                    <span>
                      {new Date(storylet.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {storylet.tags && storylet.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {storylet.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="badge badge-ghost badge-xs">
                          {tag}
                        </span>
                      ))}
                      {storylet.tags.length > 3 && (
                        <span className="badge badge-ghost badge-xs">
                          +{storylet.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-base-300">
                  {onEdit && (
                    <button 
                      onClick={() => onEdit(storylet.id)}
                      className="btn btn-primary btn-sm"
                    >
                      Edit
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(storylet.id, storylet.title)}
                    className="btn btn-error btn-sm btn-outline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};