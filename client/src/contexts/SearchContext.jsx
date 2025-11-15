import React, { createContext, useContext } from 'react';

const SearchContext = createContext(null);

export const useSearchContext = () => {
  return useContext(SearchContext);
};

export const SearchProvider = ({ children, value }) => {
  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

