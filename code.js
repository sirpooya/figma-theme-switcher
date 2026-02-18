// Show the plugin UI with increased height to accommodate dropdown
figma.showUI(__html__, { width: 260, height: 248, themeColors: true });

let collectionsData = [];

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'apply-theme-mode') {
    try {
      const selectedMode = (msg.data.overrideVariable && msg.data.overrideVariable.value) || msg.data.selectedMode;
      
      console.log(`Applying theme "${selectedMode}"`);
      
      // Only "🌈 Theme" gets the value; "🌈 Theme ②" is unused for these
      const THEME_1_ONLY = ['Shop', 'Commercial', 'Plus', 'AI', 'Gold', 'Mehr', 'Super Coin', 'Fashion'];
      // Set "🌈 Theme" to "↳ Theme 2" and "🌈 Theme ②" to the selected value
      const THEME_2_BRANCH = ['Fresh', 'Jet', 'Pharmacy', 'Digipay', 'Fidibo', 'Digify', 'Car', 'Service Hub', 'Void'];
      
      const currentPage = figma.currentPage;
      const selection = figma.currentPage.selection;
      let applied = false;
      
      if (THEME_1_ONLY.includes(selectedMode)) {
        // Only set "🌈 Theme" to the selected value
        applied = await applyModeToCollection('🌈 Theme', selectedMode, currentPage, selection);
        if (applied) console.log(`Applied "${selectedMode}" to 🌈 Theme only`);
      } else if (THEME_2_BRANCH.includes(selectedMode)) {
        // Set "🌈 Theme" to "↳ Theme 2" and "🌈 Theme ②" to selected value
        const ok1 = await applyModeToCollection('🌈 Theme', '↳ Theme 2', currentPage, selection);
        const ok2 = await applyModeToCollection('🌈 Theme ②', selectedMode, currentPage, selection);
        applied = ok1 && ok2;
        if (applied) console.log(`Applied 🌈 Theme → "↳ Theme 2", 🌈 Theme ② → "${selectedMode}"`);
      }
      
      if (applied) {
        const selection = figma.currentPage.selection;
        const target = selection.length > 0 ? `${selection.length} selected node(s)` : 'page';
        figma.notify(`✅ Applied "${selectedMode}" mode to ${target}`);
        figma.ui.postMessage({
          type: 'success',
          message: '' // Empty message since we're using figma.notify instead
        });
      } else {
        figma.notify(`❌ "${selectedMode}" is not a known theme option`, { error: true });
        figma.ui.postMessage({
          type: 'error',
          message: `"${selectedMode}" is not a known theme option`
        });
      }
      
    } catch (error) {
      figma.notify(`❌ Error: ${error.message}`, { error: true });
      figma.ui.postMessage({
        type: 'error',
        message: `Error: ${error.message}`
      });
      console.error("Error applying mode:", error);
    }
  }
  
  if (msg.type === 'reset-variable-modes') {
    try {
      const currentPage = figma.currentPage;
      const selection = figma.currentPage.selection;
      
      console.log("Starting clean operation...");
      console.log("Selection count:", selection.length);
      
      let clearedCount = 0;
      
      if (selection.length > 0) {
        // Reset modes on selected nodes to default
        console.log("Resetting selected nodes to default modes...");
        for (const node of selection) {
          console.log(`Processing node: ${node.name}`);
          
          // Check if node has explicitVariableModes property
          if (node.explicitVariableModes) {
            console.log(`Node ${node.name} has explicit modes:`, node.explicitVariableModes);
            
            // Loop through all explicit variable modes on this node
            for (const collectionId in node.explicitVariableModes) {
              try {
                console.log(`Resetting collection ID: ${collectionId}`);
                
                // Get the collection to find the default mode
                const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
                if (collection && collection.modes.length > 0) {
                  // Set to the first (default) mode
                  node.setExplicitVariableModeForCollection(collection, collection.modes[0].modeId);
                  clearedCount++;
                  console.log(`Reset collection ${collection.name} to default mode for ${node.name}`);
                } else {
                  console.log(`Could not get collection for ID: ${collectionId}`);
                }
              } catch (error) {
                console.log(`Failed to reset collection ${collectionId} for ${node.name}: ${error.message}`);
              }
            }
          } else {
            console.log(`Node ${node.name} has no explicit variable modes`);
          }
        }
        
        figma.notify(`✅ Reset ${clearedCount} variable modes to default for ${selection.length} selected node(s)`);
      } else {
        // Reset modes on page level to default
        console.log("Resetting page level modes to default...");
        
        // Work with the theme collections we know about
        const themeCollectionNames = ['🌈 Theme', '🌈 Theme ②', '🌓 Mode', '💻 Device'];
        
        for (const themeCollectionName of themeCollectionNames) {
          try {
            const themeCollection = collectionsData.find(c => c.name === themeCollectionName);
            if (!themeCollection) continue;
            
            const collection = await figma.variables.getVariableCollectionByIdAsync(themeCollection.id);
            if (!collection || collection.modes.length === 0) continue;
            
            // Reset to the first (default) mode
            currentPage.setExplicitVariableModeForCollection(collection, collection.modes[0].modeId);
            clearedCount++;
            console.log(`Reset ${themeCollectionName} to default mode for page`);
          } catch (error) {
            console.log(`Failed to reset ${themeCollectionName} for page: ${error.message}`);
          }
        }
        
        figma.notify(`✅ Reset ${clearedCount} variable modes to default for page`);
      }
      
      console.log(`Total reset to default: ${clearedCount}`);
      
      figma.ui.postMessage({
        type: 'success',
        message: ''
      });
      
    } catch (error) {
      console.log("Clean operation error:", error);
      figma.notify(`❌ Error resetting modes: ${error.message}`, { error: true });
      figma.ui.postMessage({
        type: 'error',
        message: `Error: ${error.message}`
      });
      console.error("Error resetting modes:", error);
    }
  }
};

// Apply a specific mode to a collection (page or selection). Returns true if applied.
async function applyModeToCollection(collectionName, modeName, currentPage, selection) {
  try {
    const themeCollection = collectionsData.find(c => c.name === collectionName);
    if (!themeCollection) {
      console.log(`Collection "${collectionName}" not found`);
      return false;
    }
    const mode = themeCollection.modes.find(m => m.name === modeName);
    if (!mode) {
      console.log(`Mode "${modeName}" not found in collection "${collectionName}"`);
      return false;
    }
    const collection = await figma.variables.getVariableCollectionByIdAsync(themeCollection.id);
    if (!collection) {
      console.log(`Could not get collection object for "${collectionName}"`);
      return false;
    }
    if (selection.length > 0) {
      for (const node of selection) {
        node.setExplicitVariableModeForCollection(collection.id, mode.id);
      }
    } else {
      currentPage.setExplicitVariableModeForCollection(collection.id, mode.id);
    }
    return true;
  } catch (error) {
    console.log(`Error applying "${modeName}" to "${collectionName}": ${error.message}`);
    return false;
  }
}

// Load collections data on plugin start
(async function() {
  try {
    console.log("Loading global library collections...");
    
    // ONLY get global library collections
    const libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    console.log(`Found ${libraryCollections.length} global library collections`);
    
    collectionsData = [];
    
    // Process each library collection quickly (no timeout, just try them all)
    for (const libraryCollection of libraryCollections) {
      try {
        console.log(`Processing: "${libraryCollection.name}"`);
        
        // Get variables from library collection
        const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(libraryCollection.key);
        
        if (variables.length === 0) {
          console.log(`No variables in "${libraryCollection.name}"`);
          continue;
        }
        
        // Import one variable to get access to collection modes
        const importedVariable = await figma.variables.importVariableByKeyAsync(variables[0].key);
        const collection = await figma.variables.getVariableCollectionByIdAsync(importedVariable.variableCollectionId);
        
        if (!collection || !collection.modes || collection.modes.length === 0) {
          console.log(`No modes in "${libraryCollection.name}"`);
          continue;
        }
        
        collectionsData.push({
          id: collection.id,
          name: collection.name,
          libraryName: libraryCollection.libraryName,
          isRemote: true,
          modes: collection.modes.map(mode => ({
            id: mode.modeId,
            name: mode.name
          }))
        });
        
        console.log(`Added: "${collection.name}" with ${collection.modes.length} modes`);
        
      } catch (error) {
        console.log(`Failed "${libraryCollection.name}": ${error.message}`);
        continue;
      }
    }
    
    // Send ONLY global collections to UI
    figma.ui.postMessage({
      type: 'collections-loaded', 
      data: collectionsData
    });
    
    figma.notify(`Found ${collectionsData.length} variable collections`);
    console.log(`Loaded ${collectionsData.length} global collections`);
    
  } catch (error) {
    console.error("Error:", error);
    figma.ui.postMessage({
      type: 'collections-loaded', 
      data: []
    });
  }
})();