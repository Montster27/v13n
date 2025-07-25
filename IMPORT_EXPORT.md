# Import/Export Data Management

The V13n Content Creator includes comprehensive import/export functionality for managing your narrative content across different environments and collaborating with other creators.

## Features

### 🔽 Export Capabilities
- **Individual Data Types**: Export storylets, story arcs, or clues separately
- **Complete Backup**: Export all data types in a single file
- **Metadata Support**: Add descriptions and tags to your exports
- **Version Control**: All exports include version and timestamp information
- **JSON Format**: Human-readable and editable export format

### 🔼 Import Capabilities
- **Data Validation**: Comprehensive validation of imported data
- **Preview Mode**: Review data before importing
- **Error Handling**: Clear error messages for invalid data
- **ID Generation**: Automatic generation of new IDs to prevent conflicts
- **Flexible Import**: Import partial data or complete backups

## Usage

### Exporting Data

1. Navigate to **Data Manager** from the main dashboard
2. In the **Export Data** section:
   - Select which data types to include (Storylets, Story Arcs, Clues)
   - Optionally add a description for the export
   - Click **Export Selected Data**
3. The file will be automatically downloaded as a JSON file

### Importing Data

1. Navigate to **Data Manager** from the main dashboard
2. In the **Import Data** section:
   - Click **Select Import File** and choose your JSON export file
   - Review the import preview showing what will be imported
   - Click **Confirm Import** to add the data to your project
3. Check the success message for import statistics

## Data Format

### Export Structure
```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-23T...",
  "data": {
    "storylets": [...],
    "arcs": [...],
    "clues": [...]
  },
  "metadata": {
    "description": "Optional description",
    "tags": ["export", "backup"],
    "exportedBy": "system"
  }
}
```

### Validation Rules

**Storylets:**
- Must have title, description, and content
- Status must be 'dev', 'stage', or 'live'
- Choices and effects arrays are required

**Story Arcs:**
- Must have name and description
- Tags and prerequisites are optional

**Clues:**
- Must have name, title, and description
- Category must be valid clue category
- Type and importance level are required

## Best Practices

### For Exports
- Add meaningful descriptions to track export purpose
- Export regularly as backups
- Use specific exports (storylets only, etc.) for sharing specific content
- Include version information in filenames

### For Imports
- Always review the import preview before confirming
- Test imports in a development environment first
- Keep backups before large imports
- Check validation errors carefully

### For Collaboration
- Export specific story arcs or storylet collections for sharing
- Include clear descriptions and tags
- Coordinate with team members on naming conventions
- Use version control for tracking changes

## File Naming

Exported files use the following naming convention:
- Complete export: `v13n_complete_export_YYYY-MM-DD.json`
- Storylets only: `v13n_storylets_export_YYYY-MM-DD.json`
- Story arcs only: `v13n_arcs_export_YYYY-MM-DD.json`
- Clues only: `v13n_clues_export_YYYY-MM-DD.json`

## Troubleshooting

### Common Import Errors
- **"Missing or invalid title"**: Ensure all required fields are present
- **"Invalid status"**: Status must be 'dev', 'stage', or 'live' for storylets
- **"Missing data section"**: The JSON file may be corrupted or invalid

### Export Issues
- **Empty export**: Make sure you have data to export and have selected at least one data type
- **Download failed**: Check browser permissions for file downloads

### Data Compatibility
- Exports from V13n 1.0.0+ are compatible with this import system
- Older formats may require manual conversion
- Custom modifications to JSON structure may cause import failures

## Data Migration

### From Other Systems
To import data from other narrative tools:
1. Convert your data to match the V13n JSON format
2. Ensure all required fields are present
3. Validate the JSON structure before importing

### Version Upgrades
When upgrading V13n versions:
1. Export your current data before upgrading
2. Test import functionality in the new version
3. Report any compatibility issues