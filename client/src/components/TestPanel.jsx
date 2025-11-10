import React from 'react';
import { useTestMode } from '../contexts/TestModeContext';

const TestPanel = () => {
  const { isTestMode, testDate, toggleTestMode, setCustomDate, resetTestMode } = useTestMode();

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    setCustomDate(newDate);
  };

  if (!isTestMode) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 p-4 border-t-2 border-yellow-300">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="font-bold text-yellow-800">Modo de Teste</h3>
            <input
              type="date"
              value={testDate.toISOString().split('T')[0]}
              onChange={handleDateChange}
              className="px-2 py-1 border rounded"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={resetTestMode}
              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Resetar
            </button>
            <button
              onClick={toggleTestMode}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Desativar Modo Teste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPanel;