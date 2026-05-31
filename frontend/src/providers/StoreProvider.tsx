'use client';

import { Provider } from 'react-redux';
import { store } from '../store/index';
import { useEffect, type ReactNode } from 'react';
import { useAppDispatch } from '../store/hook';
import { initializeAuth } from '../store/slices/authSlice';

function AuthInitializer({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return <>{children}</>;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  );
}

