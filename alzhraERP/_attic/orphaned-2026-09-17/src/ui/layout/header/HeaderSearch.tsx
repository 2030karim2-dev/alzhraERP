import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HeaderSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      navigate(`/inventory?search=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  };

  return (
    <div className="relative z-50 mx-auto hidden max-w-lg flex-1 md:block">
      <form onSubmit={handleSearch} className="group relative">
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
          }}
          placeholder="ابحث عن العميل، الصنف، الفاتورة... (اضغط Enter)"
          className="focus:ring-[var(--accent)]/20 dark:focus:ring-[var(--accent)]/40 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] py-2.5 pl-4 pr-10 text-sm text-[var(--app-text)] transition-all placeholder:text-[var(--app-text-secondary)] focus:outline-none focus:ring-2"
        />
        <button
          type="submit"
          className="absolute right-3 top-2.5 text-[var(--app-text-secondary)] transition-colors hover:text-accent group-focus-within:text-accent"
        >
          <Search size={18} />
        </button>
      </form>
    </div>
  );
};

export default HeaderSearch;
