import React from 'react';
import { Edit, Trash2, ExternalLink, Hash } from 'lucide-react';
import { Vehicle } from '../../inventory/types';
import { cn } from '../../../core/utils';

interface Props {
    vehicle: Vehicle;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const VehicleCard: React.FC<Props> = ({ vehicle: v, isSelected, onSelect, onEdit, onDelete }) => {
    return (
        <div
            className={cn(
                "group border dark:border-slate-800 rounded-xl p-4 transition-all cursor-pointer relative overflow-hidden",
                isSelected ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 ring-2 ring-indigo-500/20" : "bg-gray-50/50 dark:bg-slate-800/20 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10"
            )}
            onClick={onSelect}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{v.make} {v.model}</h3>
                    <p className="text-xs font-bold text-gray-400 font-mono mt-1">{v.year_start} - {v.year_end}</p>
                    {v.submodel && <p className="text-xs text-indigo-500 font-bold mt-0.5">{v.submodel}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg"><Edit size={16} /></button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('حذف هذه المركبة؟')) onDelete(); }}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* VIN Prefix */}
            {v.vin_prefix && (
                <div className="flex items-center gap-1.5 mt-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 w-fit">
                    <Hash size={12} className="text-indigo-500" />
                    <span className="text-[11px] font-mono font-bold text-gray-600 dark:text-gray-400 tracking-wider" dir="ltr">{v.vin_prefix}</span>
                </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
                {v.drive_type && <span className="text-[10px] font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg">{v.drive_type}</span>}
                {v.region && <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg">{v.region}</span>}
                {v.engine && <span className="text-[10px] font-bold px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg text-gray-500">{v.engine}</span>}
                {v.fuel_type && <span className="text-[10px] font-bold px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg">{v.fuel_type}</span>}
                {v.transmission && <span className="text-[10px] font-bold px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-lg">{v.transmission}</span>}
            </div>

            {/* Quick External Search */}
            {v.vin_prefix && (
                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                        href={`https://partsouq.com/en/catalog/genuine/search?q=${v.vin_prefix}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center gap-2 py-1.5 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold transition-colors"
                    >
                        <ExternalLink size={12} />
                        بحث عن قطع الغيار
                    </a>
                </div>
            )}

            {/* Selection Indicator */}
            {isSelected && (
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            )}
        </div>
    );
};

export default VehicleCard;

