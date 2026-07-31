import React from 'react';
import SearchInput from '../../../../ui/components/SearchInput';

interface Props {
    query: string;
    setQuery: (q: string) => void;
}

const TransferProductSearch: React.FC<Props> = ({ query, setQuery }) => {
    return (
        <div className="space-y-1">
            <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="ابحث بالأصناف المراد نقلها..."
                variant="default"
                size="sm"
            />
        </div>
    );
};

export default TransferProductSearch;
