import Logo from './Logo';

export default function Header() {
  return (
    <header className="bg-evify-teal text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <Logo size={48} />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Evify-DMT</h1>
          <p className="text-evify-yellow-light text-xs sm:text-sm">
            Driver Monitoring & AI Video Analytics
          </p>
        </div>
      </div>
    </header>
  );
}
