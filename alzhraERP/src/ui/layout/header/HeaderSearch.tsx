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
    <div className="flex-1 max-w-lg mx-auto hidden md:block relative z-50">
      <form onSubmit={handleSearch} className="relative group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن العميل، الصنف، الفاتورة... (اضغط Enter)"
          className="w-full bg-[#f3f4f6] dark:bg-slate-800 border-none rounded-lg py-2.5 pr-10 pl-4 text-sm text-gray-600 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/20 dark:focus:ring-accent/40 transition-all"
        />
        <button
          type="submit"
          className="absolute right-3 top-2.5 text-gray-400 dark:text-slate-500 group-focus-within:text-accent hover:text-accent transition-colors"
        >
          <Search size={18} />
        </button>
      </form>
    </div>
  );
};

export default HeaderSearch;
