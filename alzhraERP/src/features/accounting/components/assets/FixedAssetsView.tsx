import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Play,
  RotateCw,
  ShieldCheck,
  TrendingDown,
  Coins,
  CheckCircle,
} from 'lucide-react';
import Button from '../../../../ui/base/Button';
import { formatCurrency } from '../../../../core/utils';
import { useFixedAssets, useFixedAssetMutations } from '../../hooks/useFixedAssets';
import AddAssetModal from './AddAssetModal';

const CATEGORY_LABELS: Record<string, string> = {
  equipment: 'معدات وآلات',
  vehicles: 'مركبات وسيارات',
  furniture: 'أثاث وتجهيزات',
  computers: 'أجهزة وتقنية',
  buildings: 'عقارات ومباني',
};

const FixedAssetsView: React.FC = () => {
  const { data: assets = [], isLoading, refetch } = useFixedAssets();
  const {
    createAsset,
    isCreating,
    postSingleDepreciation,
    isDepreciatingSingle,
    runAllDepreciation,
    isRunningAll,
  } = useFixedAssetMutations();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Totals
  const totals = useMemo(() => {
    let totalCost = 0;
    let totalDepreciated = 0;
    let activeCount = 0;

    for (const a of assets) {
      totalCost += Number(a.purchase_cost) || 0;
      totalDepreciated += Number(a.total_depreciated) || 0;
      if (a.status === 'active') activeCount++;
    }

    const netBookValue = Math.max(0, totalCost - totalDepreciated);

    return {
      totalCost,
      totalDepreciated,
      netBookValue,
      activeCount,
      totalCount: assets.length,
    };
  }, [assets]);

  const handleRunAll = async () => {
    if (
      window.confirm(
        'هل تريد تشغيل الإهلاك الدوري لكافة الأصول النشطة للشهر الحالي؟ سيقوم النظام بتوليد القيود المحاسبية آلياً.'
      )
    ) {
      await runAllDepreciation();
    }
  };

  const handleSingleDepreciate = async (assetId: string) => {
    setSelectedAssetId(assetId);
    try {
      await postSingleDepreciation({ assetId });
    } finally {
      setSelectedAssetId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-[var(--app-surface)] p-3.5 shadow-sm dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">إجمالي تكلفة الأصول</span>
            <Building2 size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 font-mono text-base font-bold text-slate-800 dark:text-slate-100 sm:text-lg">
            {formatCurrency(totals.totalCost)}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">{totals.totalCount} أصل مسجل</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-[var(--app-surface)] p-3.5 shadow-sm dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">مجمع الإهلاك المتراكم</span>
            <TrendingDown size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 font-mono text-base font-bold text-amber-600 dark:text-amber-400 sm:text-lg">
            {formatCurrency(totals.totalDepreciated)}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">حساب 1390 الدفتري</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-[var(--app-surface)] p-3.5 shadow-sm dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">صافي القيمة الدفترية</span>
            <Coins size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 sm:text-lg">
            {formatCurrency(totals.netBookValue)}
          </div>
          <div className="mt-1 text-[10px] text-emerald-600/80">المدرجة في المركز المالي</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-[var(--app-surface)] p-3.5 shadow-sm dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">الأصول النشطة الخاضعة للإهلاك</span>
            <ShieldCheck size={16} className="text-purple-500" />
          </div>
          <div className="mt-2 font-mono text-base font-bold text-purple-600 dark:text-purple-400 sm:text-lg">
            {totals.activeCount}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">من إجمالي {totals.totalCount}</div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--app-text)]">
            سجل الأصول الثابتة والإهلاك الآلي
          </h3>
          <p className="text-[11px] text-gray-500">
            احتساب أقساط الإهلاك الدورية آلياً (القسط الثابت) وتوليد قيود الإهلاك في دفتر الأستاذ
            العام
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="secondary" size="sm" aria-label="تحديث">
            <RotateCw size={14} />
          </Button>
          <Button
            onClick={handleRunAll}
            disabled={isRunningAll || totals.activeCount === 0}
            isLoading={isRunningAll}
            variant="outline"
            size="sm"
            leftIcon={<Play size={13} className="text-purple-600" />}
            className="border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300"
          >
            تشغيل إهلاك الشهر لكافة الأصول
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
          >
            أصل جديد
          </Button>
        </div>
      </div>

      {/* Assets Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="border-b border-gray-200 bg-gray-50/80 font-bold text-gray-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
              <tr>
                <th className="p-3 text-start">الأصل</th>
                <th className="p-3 text-start">التصنيف</th>
                <th className="p-3 text-start">تاريخ الشراء</th>
                <th className="p-3 text-end">تكلفة الشراء</th>
                <th className="p-3 text-end">مجمع الإهلاك</th>
                <th className="p-3 text-end">صافي القيمة الدفترية</th>
                <th className="p-3 text-center">القسط الشهري</th>
                <th className="p-3 text-center">آخر إهلاك</th>
                <th className="p-3 text-center">الحالة</th>
                <th className="p-3 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-400">
                    جاري تحميل سجل الأصول الثابتة...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-400">
                    لا توجد أصول ثابتة مسجلة بعد. اضغط على «أصل جديد» لإضافة أول أصل وحساب إهلاكه.
                  </td>
                </tr>
              ) : (
                assets.map(asset => {
                  const cost = Number(asset.purchase_cost) || 0;
                  const depr = Number(asset.total_depreciated) || 0;
                  const salvage = Number(asset.salvage_value) || 0;
                  const netBook = Math.max(0, cost - depr);
                  const monthly =
                    asset.useful_life_months > 0
                      ? Math.round(((cost - salvage) / asset.useful_life_months) * 100) / 100
                      : 0;

                  const isAssetDepreciating = isDepreciatingSingle && selectedAssetId === asset.id;

                  return (
                    <tr key={asset.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold text-gray-800 dark:text-slate-100">
                          {asset.name}
                        </div>
                        <div className="font-mono text-[10px] text-gray-400">
                          {asset.asset_code}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-slate-300">
                        {CATEGORY_LABELS[asset.category] || asset.category}
                      </td>
                      <td className="p-3 font-mono text-gray-500">{asset.purchase_date}</td>
                      <td className="p-3 text-end font-mono font-bold text-gray-800 dark:text-slate-100">
                        {formatCurrency(cost)}
                      </td>
                      <td className="p-3 text-end font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(depr)}
                      </td>
                      <td className="p-3 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(netBook)}
                      </td>
                      <td className="p-3 text-center font-mono text-gray-600 dark:text-slate-300">
                        {formatCurrency(monthly)} / شهر
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] text-gray-500">
                        {asset.last_depreciation_date || '—'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            asset.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {asset.status === 'active' ? 'نشط' : 'مستنفد'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {asset.status === 'active' ? (
                          <Button
                            onClick={() => handleSingleDepreciate(asset.id)}
                            disabled={isAssetDepreciating}
                            isLoading={isAssetDepreciating}
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            title="إثبات إهلاك الشهر الحالي"
                          >
                            إهلاك
                          </Button>
                        ) : (
                          <CheckCircle size={14} className="mx-auto text-emerald-500" />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async input => {
          await createAsset(input);
        }}
        isLoading={isCreating}
      />
    </div>
  );
};

export default FixedAssetsView;
