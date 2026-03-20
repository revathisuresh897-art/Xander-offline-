/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import AuthPage from './components/AuthPage';
import { AnimatePresence, motion } from 'motion/react';

type AppState = 'auth' | 'chat';

export default function App() {
  const [state, setState] = useState<AppState>('auth');

  return (
    <div className="min-h-screen bg-xander-bg selection:bg-xander-accent/30 selection:text-xander-accent overflow-x-hidden">
      <AnimatePresence mode="wait">
        {state === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <AuthPage onAuthorized={() => setState('chat')} />
          </motion.div>
        )}

        {state === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="h-screen"
          >
            <ChatInterface />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


