/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import SplashScreen from './views/SplashScreen';
import MainLayout from './views/MainLayout';
import AuthView from './views/AuthView';
import { useFinanceViewModel } from './viewmodels/useFinanceViewModel';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const viewModel = useFinanceViewModel();
  const { user, loading } = viewModel;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(timer);
  }, []);

  if (showSplash || (loading && !user)) {
    return <SplashScreen />;
  }

  return (
    <>
      {!user ? <AuthView viewModel={viewModel} /> : <MainLayout viewModel={viewModel} />}
    </>
  );
}
