import React from 'react';
import { Car } from 'lucide-react';

interface Vehicle {
    make: string;
    model: string;
    years: string[];
}

interface Props {
    vehicles: Vehicle[];
}

const CompatibilityVehicleGrid: React.FC<Props> = ({ vehicles }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all group flex flex-col h-full cursor-pointer relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
                            <Car size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 leading-tight">{v.make}</h4>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{v.model}</p>
                        </div>
                    </div>
                    <div className="mt-auto">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                            <div className="flex flex-wrap gap-1.5">
                                {v.years.map((year, idx) => (
                                    <span key={idx} className="inline-flex px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                                        {year}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CompatibilityVehicleGrid;
