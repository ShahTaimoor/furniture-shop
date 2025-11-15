import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AuthDrawer from '@/components/custom/AuthDrawer';

const AuthDrawerContext = createContext(null);

export const AuthDrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const [options, setOptions] = useState({});

  const openAuthDrawer = useCallback((nextMode = 'login', nextOptions = {}) => {
    setMode(nextMode);
    setOptions(nextOptions);
    setIsOpen(true);
  }, []);

  const closeAuthDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const contextValue = useMemo(
    () => ({
      isOpen,
      mode,
      options,
      openAuthDrawer,
      closeAuthDrawer,
      setMode,
      setOptions,
    }),
    [isOpen, mode, options, openAuthDrawer, closeAuthDrawer]
  );

  return (
    <AuthDrawerContext.Provider value={contextValue}>
      {children}
      <AuthDrawer
        open={isOpen}
        mode={mode}
        options={options}
        onOpenChange={setIsOpen}
        onModeChange={setMode}
        onOptionsChange={setOptions}
      />
    </AuthDrawerContext.Provider>
  );
};

export const useAuthDrawer = () => {
  const context = useContext(AuthDrawerContext);
  if (!context) {
    throw new Error('useAuthDrawer must be used within an AuthDrawerProvider');
  }
  return context;
};

export default AuthDrawerContext;

