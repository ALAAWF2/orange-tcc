import React, { useEffect, useMemo, useState } from "react";

// تنسيق مبسّط للأرقام
const fmt = (n: number) =>
  new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n || 0);

// يحدّد شريحة عمولة المعرض حسب تحقيقه (عشري داخليًا)
function tieredOutletCommission(achievementDecimal: number) {
  if (achievementDecimal >= 1) return 0.02;      // 2%
  if (achievementDecimal >= 0.9) return 0.01;    // 1%
  if (achievementDecimal >= 0.8) return 0.005;   // 0.5%
  return 0;                                      // أقل من 80% = 0
}

// يحسب سطر موظف
function calcRow(sales: number, target: number, outletCommission: number) {
  const ach = target > 0 ? sales / target : 0; // نسبة التحقيق الشخصي
  const rate =
    outletCommission === 0.02 || outletCommission === 0.005
      ? ach * outletCommission
      : outletCommission; // عند 1% (أو 0) كالقديم
  const newCommission = sales * rate;
  return { ach, rate, newCommission };
}

type Row = { id: string; name: string; sales: number; target: number };

export default function TargetCommissionCalculatorAR() {
  // لا نحفظ شيئًا — قيم ابتدائية فقط
  const [outletTarget, setOutletTarget] = useState<number>(1_000_000);
  const [outletAchPercent, setOutletAchPercent] = useState<number>(0); // 88 = 88%
  const [suggestCount, setSuggestCount] = useState<number>(0);

  // مسح أي بقايا قديمة عند فتح الصفحة
  useEffect(() => {
    try {
      localStorage.removeItem("tcc_rows_v2");
      localStorage.removeItem("tcc_rows_v1");
      localStorage.removeItem("tcc_meta_v2");
      localStorage.removeItem("tcc_meta_v1");
    } catch {}
  }, []);

  const outletCommission = useMemo(
    () => tieredOutletCommission((outletAchPercent || 0) / 100),
    [outletAchPercent]
  );

  // الصفوف: لا قراءة ولا حفظ — ننشئها فقط حسب عدد الموظفين
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!suggestCount || suggestCount <= 0) {
      setRows([]);
      return;
    }
    setRows((prev) => {
      const next: Row[] = [];
      for (let i = 0; i < suggestCount; i++) {
        const old = prev[i];
        next.push(
          old ?? {
            id: self.crypto?.randomUUID?.() ?? String(Math.random()),
            name: `موظف ${i + 1}`,
            sales: 0,
            target: 0,
          }
        );
      }
      return next;
    });
  }, [suggestCount]);

  const totals = useMemo(() => {
    const totalSales = rows.reduce((s, r) => s + (r.sales || 0), 0);
    const totalTargets = rows.reduce((s, r) => s + (r.target || 0), 0);
    const perRow = rows.map((r) =>
      calcRow(r.sales || 0, r.target || 0, outletCommission)
    );
    const sumNew = perRow.reduce((s, x) => s + x.newCommission, 0);
    const avgAch = rows.length
      ? perRow.reduce((s, x) => s + x.ach, 0) / rows.length
      : 0;
    const avgRate = rows.length
      ? perRow.reduce((s, x) => s + x.rate, 0) / rows.length
      : 0;
    return { totalSales, totalTargets, sumNew, avgAch, avgRate, rows: perRow };
  }, [rows, outletCommission]);

  const equalDistribute = () => {
    if (!suggestCount || suggestCount <= 0) {
      alert("من فضلك أدخل عدد الموظفين أولاً.");
      return;
    }
    const per = Math.floor(outletTarget / suggestCount);
    setRows((prev) => prev.map((x) => ({ ...x, target: per })));
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id: self.crypto?.randomUUID?.() ?? String(Math.random()),
        name: `موظف ${prev.length + 1}`,
        sales: 0,
        target: suggestCount > 0 ? Math.floor(outletTarget / suggestCount) : 0,
      },
    ]);

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const exportCSV = () => {
    const head = "name,sales,target";
    const body = rows.map((r) => [r.name, r.sales, r.target].join(",")).join("\n");
    const blob = new Blob([head + "\n" + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "commission_calculator.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const outletDiff = totals.totalTargets - outletTarget;
  const suggestedPer =
    suggestCount && suggestCount > 0
      ? Math.floor(outletTarget / suggestCount)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">
          حاسبة التارجت والعمولة
        </h1>

        <div className="grid md:grid-cols-2 gap-4">
          {/* مدخلات */}
          <div className="bg-white rounded-2xl shadow p-4 space-y-3">
            <h2 className="font-semibold text-lg">مدخلات المعرض</h2>
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="text-sm">تاركت المعرض (ريال)</label>
              <input
                type="number"
                className="border rounded-md px-3 py-2"
                value={outletTarget}
                onChange={(e) => setOutletTarget(Number(e.target.value) || 0)}
              />

              <label className="text-sm">نسبة تحقيق المعرض (%)</label>
              <input
                type="number"
                step="1"
                min={0}
                max={1000}
                className="border rounded-md px-3 py-2"
                placeholder="مثال: 88 تعني 88%"
                value={Number.isFinite(outletAchPercent) ? outletAchPercent : 0}
                onChange={(e) => setOutletAchPercent(Number(e.target.value) || 0)}
              />

              <label className="text-sm">عمولة المعرض (تلقائي)</label>
              <div className="px-3 py-2 rounded-md bg-gray-100 text-sm">
                {(outletCommission * 100).toFixed(2)}%
              </div>

              <label className="text-sm">عدد الموظفين</label>
              <input
                type="number"
                min={0}
                className="border rounded-md px-3 py-2"
                value={suggestCount}
                onChange={(e) => setSuggestCount(Number(e.target.value) || 0)}
              />

              <label className="text-sm">تاركت متساوٍ/موظف (مقترح)</label>
              <div className="px-3 py-2 rounded-md bg-gray-100 text-sm">
                {suggestCount > 0 ? fmt(suggestedPer) : "—"}
              </div>
            </div>

            <div className="flex gap-2 pt-2 flex-wrap">
              <button
                onClick={equalDistribute}
                disabled={!suggestCount || suggestCount <= 0}
                className={`px-3 py-2 rounded-xl shadow text-white ${
                  !suggestCount || suggestCount <= 0
                    ? "bg-indigo-300 cursor-not-allowed"
                    : "bg-indigo-600"
                }`}
                title={!suggestCount ? "أدخل عدد الموظفين أولاً" : ""}
              >
                توزيع متساوٍ للتاركت
              </button>
              <button
                onClick={addRow}
                className="px-3 py-2 rounded-xl shadow bg-gray-800 text-white"
              >
                إضافة موظف
              </button>
              <button
                onClick={exportCSV}
                className="px-3 py-2 rounded-xl shadow bg-gray-200"
              >
                تصدير CSV
              </button>
            </div>

            <div className="mt-3 text-sm flex items-center gap-2">
              <span className="text-gray-600">مجموع تارجت الموظفين:</span>
              <span
                className={`px-2 py-1 rounded ${
                  outletDiff === 0
                    ? "bg-green-100 text-green-700"
                    : outletDiff > 0
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {fmt(Math.round(totals.totalTargets))}
              </span>
              <span className="text-gray-600">الفرق عن تاركت المعرض:</span>
              <span
                className={`px-2 py-1 rounded ${
                  outletDiff === 0
                    ? "bg-green-100 text-green-700"
                    : outletDiff > 0
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {fmt(Math.round(outletDiff))}
              </span>
            </div>
          </div>

          {/* الإجماليات */}
          <div className="bg-white rounded-2xl shadow p-4 space-y-3">
            <h2 className="font-semibold text-lg">الإجماليات</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">إجمالي المبيعات</div>
              <div className="font-semibold">{fmt(Math.round(totals.totalSales))} ريال</div>
              <div className="text-gray-600">إجمالي تاركت الموظفين</div>
              <div className="font-semibold">{fmt(Math.round(totals.totalTargets))} ريال</div>
              <div className="text-gray-600">متوسط تحقيق الموظفين</div>
              <div className="font-semibold">{(totals.avgAch * 100).toFixed(1)}%</div>
              <div className="text-gray-600">متوسط نسبة عمولة الموظف</div>
              <div className="font-semibold">{(totals.avgRate * 100).toFixed(2)}%</div>
              <div className="text-gray-600">إجمالي العمولة الجديدة</div>
              <div className="font-semibold">{fmt(Math.round(totals.sumNew))} ريال</div>
            </div>
          </div>
        </div>

        {/* الجدول — لا يظهر إلا بعد إدخال عدد الموظفين */}
        {suggestCount > 0 && rows.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full bg-white rounded-2xl shadow overflow-hidden">
              <thead>
                <tr className="bg-gray-100 text-sm">
                  <th className="p-2">#</th>
                  <th className="p-2">اسم الموظف</th>
                  <th className="p-2">مبيعاته (ريال)</th>
                  <th className="p-2">تاركت الموظف</th>
                  <th className="p-2">تحقيقه الشخصي</th>
                  <th className="p-2">نسبة عمولته</th>
                  <th className="p-2">عمولته الجديدة</th>
                  <th className="p-2">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const calc = totals.rows[idx] || {
                    ach: 0,
                    rate: 0,
                    newCommission: 0,
                  };
                  return (
                    <tr key={r.id} className="text-sm border-t">
                      <td className="p-2 text-center">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          className="w-full border rounded-md px-2 py-1"
                          value={r.name}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id === r.id ? { ...x, name: e.target.value } : x
                              )
                            )
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className="w-full border rounded-md px-2 py-1"
                          value={r.sales}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id === r.id
                                  ? { ...x, sales: Number(e.target.value) || 0 }
                                  : x
                              )
                            )
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className="w-full border rounded-md px-2 py-1"
                          value={r.target}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id === r.id
                                  ? { ...x, target: Number(e.target.value) || 0 }
                                  : x
                              )
                            )
                          }
                        />
                      </td>
                      <td className="p-2 text-center">
                        {(calc.ach * 100).toFixed(1)}%
                      </td>
                      <td className="p-2 text-center">
                        {(calc.rate * 100).toFixed(2)}%
                      </td>
                      <td className="p-2 text-center font-semibold text-green-700">
                        {fmt(Math.round(calc.newCommission))}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => removeRow(r.id)}
                          className="px-2 py-1 rounded-md bg-red-50 text-red-700 border"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 text-sm text-gray-600">
            أدخل <strong>عدد الموظفين</strong> أولًا ليظهر الجدول وتتمكن من التوزيع.
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500">
          القاعدة الجديدة تطبق عند عمولة معرض 2% أو 0.5%. عند 1% تُحسب عمولة الموظف
          كالقديمة (عمولة المعرض × المبيعات).
        </div>
      </div>
    </div>
  );
}
