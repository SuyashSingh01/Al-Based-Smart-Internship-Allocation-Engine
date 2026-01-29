'use client';

import * as React from 'react';

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({ value: '', onValueChange: () => {} });

export function Tabs({ value, onValueChange, children, className }: any) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: any) {
  return <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}>{children}</div>;
}

export function TabsTrigger({ value, children }: any) {
  const { value: selectedValue, onValueChange } = React.useContext(TabsContext);
  const isActive = selectedValue === value;

  return (
    <button
      onClick={() => onValueChange(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: any) {
  const { value: selectedValue } = React.useContext(TabsContext);
  if (selectedValue !== value) return null;
  return <div className="mt-2">{children}</div>;
}
