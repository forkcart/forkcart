'use client';

import { useEditor } from '@craftjs/core';
import { Trash2 } from 'lucide-react';

export function SettingsPanel() {
  const { selected, actions } = useEditor((state, query) => {
    const currentNodeId = query.getEvent('selected').last();
    let selected;

    if (currentNodeId) {
      selected = {
        id: currentNodeId,
        name:
          state.nodes[currentNodeId]?.data.displayName ??
          state.nodes[currentNodeId]?.data.name ??
          'Unknown',
        settings: state.nodes[currentNodeId]?.related?.settings,
        isDeletable: query.node(currentNodeId).isDeletable(),
      };
    }

    return { selected };
  });

  if (!selected) {
    return (
      <div className="w-64 border-l bg-white p-4">
        <p className="text-sm text-gray-400">Select a block to edit its properties</p>
      </div>
    );
  }

  const SettingsComponent = selected.settings;

  return (
    <div className="w-64 overflow-y-auto border-l bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{selected.name}</h3>
        {selected.isDeletable && (
          <button
            className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            onClick={() => actions.delete(selected!.id)}
            title="Delete block"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {SettingsComponent ? (
        <SettingsComponent />
      ) : (
        <p className="text-sm text-gray-400">No settings available for this block</p>
      )}
    </div>
  );
}
