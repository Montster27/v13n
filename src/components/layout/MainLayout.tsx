import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <header className="navbar bg-base-200 shadow-md">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">V13n Content Creator</a>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal px-1">
            <li><a>Storylets</a></li>
            <li><a>Characters</a></li>
            <li><a>Clues</a></li>
            <li><a>Sandbox</a></li>
          </ul>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="footer footer-center p-4 bg-base-300 text-base-content">
        <aside>
          <p>V13n Content Creator © 2024</p>
        </aside>
      </footer>
    </div>
  );
};