/**
 * App State Management
 * Context + useReducer. No side effects, no DOM access.
 */

import { createContext, useContext, useReducer } from 'react';

const initialState = {
  sidebarCollapsed: false,
};

const actions = {
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
};

function appReducer(state, action) {
  switch (action.type) {
    case actions.TOGGLE_SIDEBAR:
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    default:
      return state;
  }
}

const AppContext = createContext(null);
const AppDispatchContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

export function useAppDispatch() {
  const context = useContext(AppDispatchContext);
  if (context === null) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return context;
}

export { actions };
