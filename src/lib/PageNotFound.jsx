export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-light text-slate-300">404</h1>
          <div className="h-0.5 w-16 bg-slate-200 mx-auto" />
        </div>
        <h2 className="text-2xl font-medium text-slate-800">Страница не найдена</h2>
        <div className="pt-2">
          <button
            onClick={() => (window.location.hash = "#/")}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    </div>
  );
}
