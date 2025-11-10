import React, { createContext, useContext, useState } from 'react';

const TestModeContext = createContext(null);

export const useTestMode = () => {
  return useContext(TestModeContext);
};

export const TestModeProvider = ({ children }) => {
  const [isTestMode, setIsTestMode] = useState(false);
  const [testDate, setTestDate] = useState(new Date());

  const toggleTestMode = () => {
    setIsTestMode(prev => !prev);
  };

  const setCustomDate = (date) => {
    setTestDate(date);
  };

  const resetTestMode = () => {
    setIsTestMode(false);
    setTestDate(new Date());
  };

  const value = {
    isTestMode,
    testDate,
    toggleTestMode,
    setTestDate,
    setCustomDate,
    resetTestMode
  };

  return <TestModeContext.Provider value={value}>{children}</TestModeContext.Provider>;
};