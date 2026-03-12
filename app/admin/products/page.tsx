'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Check, Layers, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useUser, useUserLoaded } from '../../../components/UserContext';
import { SENSITIVITY_GROUPS } from '../../../lib/bagPlan';

/** Parse a variant label and return an estimated weight in grams, or '' if not parseable. */
function guessWeightFromLabel(label: string): string {
  const s = label.trim().toLowerCase();
  // Match patterns like "500g", "1kg", "1.5 kg", "2 litre", "2l", "4 pint"
  const kg    = s.match(/^([\d.]+)\s*kg$/);
  const g     = s.match(/^([\d.]+)\s*g$/);
  const litre = s.match(/^([\d.]+)\s*(litre|liter|l)s?$/);
  const pint  = s.match(/^([\d.]+)\s*pints?$/);
  if (kg)    return String(Math.round(parseFloat(kg[1])    * 1000));
  if (g)     return String(Math.round(parseFloat(g[1])));
  if (litre) return String(Math.round(parseFloat(litre[1]) * 1000));
  if (pint)  return String(Math.round(parseFloat(pint[1])  * 568));
  return '';
}

const SENSITIVITY_OPTIONS = SENSITIVITY_GROUPS.map(g => ({
  value: g.key,
  label: `${g.emoji} ${g.label}`,
}));

const UNIT_OPTIONS = [
  { value: 'each',   label: 'Each'        },
  { value: 'dozen',  label: 'Dozen (×12)' },
  { value: 'litre',  label: 'Litre'       },
  { value: 'kg',     label: 'Kilogram'    },
  { value: 'g',      label: 'Gram'        },
  { value: 'pack',   label: 'Pack'        },
  { value: 'bunch',  label: 'Bunch'       },
];

type EditState = {
  productId: string;
  name: string;
  price: number;
  unit: string;
  sensitivity: string;
};

function formatPrice(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function ProductsPage() {
  const router = useRouter();
  const user = useUser();
  const loaded = useUserLoaded();
  const products = useQuery(api.products.list);
  const seedMutation = useMutation(api.products.seed);
  const updateMutation = useMutation(api.products.update);
  const removeMutation = useMutation(api.products.remove);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [variantManager, setVariantManager] = useState<any | null>(null); // product being edited for variants
  const [newVariant, setNewVariant] = useState({ label: '', price: '', weightG: '' });

  useEffect(() => {
    if (!loaded) return;
    if (!user || user.role !== 'admin') router.push('/login');
  }, [user, router, loaded]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedMutation();
      toast.success('Products seeded successfully');
    } catch {
      toast.error('Failed to seed products');
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateMutation({
        productId:   editing.productId,
        name:        editing.name,
        sensitivity: editing.sensitivity,
        price:       editing.price,
        unit:        editing.unit,
      });
      toast.success('Product updated');
      setEditing(null);
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async () => {
    if (!variantManager || !newVariant.label || !newVariant.price || !newVariant.weightG) return;
    const existing: any[] = variantManager.variants ?? [];
    const updated = [...existing, {
      label:   newVariant.label.trim(),
      price:   Math.round(Number(newVariant.price) * 100),
      weightG: Number(newVariant.weightG),
    }];
    await updateMutation({ productId: variantManager.productId, variants: updated });
    setVariantManager((prev: any) => ({ ...prev, variants: updated }));
    setNewVariant({ label: '', price: '', weightG: '' });
  };

  const handleRemoveVariant = async (label: string) => {
    if (!variantManager) return;
    const updated = (variantManager.variants ?? []).filter((v: any) => v.label !== label);
    await updateMutation({ productId: variantManager.productId, variants: updated });
    setVariantManager((prev: any) => ({ ...prev, variants: updated }));
  };

  const handleRemove = async (productId: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await removeMutation({ productId });
      toast.success(`"${name}" removed`);
    } catch {
      toast.error('Failed to remove product');
    }
  };

  // Real DB rows have _creationTime set by Convex; fallback objects don't
  const isSeeded = (products ?? []).some((p: any) => p._creationTime != null);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-6">
      {/* Seed button + count */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {products && (
            <span className="text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
              {products.length} products
            </span>
          )}
        </div>
        {!isSeeded && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition-colors disabled:opacity-50"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Seed defaults
          </button>
        )}
      </div>

      {products === undefined ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-primary-400 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
          <Package className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-500 mb-1">No products yet</p>
          <p className="text-xs text-gray-400 mb-4">Seed the default catalogue to get started</p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-bold rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Seed default products
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* ── Mobile card list (hidden on sm+) ── */}
          <div className="sm:hidden divide-y divide-gray-100">
            {products.filter(Boolean).map((product: any) => {
              const isEditing = editing?.productId === product.productId;
              const editingState = isEditing ? editing! : null;
              const sensitivityLabel = SENSITIVITY_OPTIONS.find(o => o.value === product.sensitivity)?.label ?? product.sensitivity;
              const available = product.available !== false;

              return (
                <div key={product.productId} className={`px-4 py-3 ${isEditing ? 'bg-primary-50' : ''}`}>
                  {isEditing ? (
                    /* Edit form on mobile */
                    <div className="space-y-2">
                      <input
                        value={editingState!.name}
                        onChange={e => setEditing(prev => prev && { ...prev, name: e.target.value })}
                        className="w-full text-sm font-semibold bg-white border border-primary-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        placeholder="Product name"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">£</span>
                          <input
                            type="number" min={0} step={0.01}
                            value={(editingState!.price / 100).toFixed(2)}
                            onChange={e => setEditing(prev => prev && { ...prev, price: Math.round(Number(e.target.value) * 100) })}
                            className="w-full text-sm bg-white border border-primary-300 rounded-lg pl-6 pr-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                          />
                        </div>
                        <select
                          value={editingState!.unit}
                          onChange={e => setEditing(prev => prev && { ...prev, unit: e.target.value })}
                          className="w-full text-sm bg-white border border-primary-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        >
                          {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <select
                        value={editingState!.sensitivity}
                        onChange={e => setEditing(prev => prev && { ...prev, sensitivity: e.target.value })}
                        className="w-full text-sm bg-white border border-primary-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      >
                        {SENSITIVITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSave} disabled={saving}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="px-4 py-2 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal card view */
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{product.productId}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-gray-700">
                            {product.price != null ? formatPrice(product.price) : '—'}
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{sensitivityLabel}</span>
                          <button
                            onClick={() => updateMutation({ productId: product.productId, available: !available })}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold transition-colors ${
                              available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {available ? 'In Stock' : 'Off'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => { setVariantManager(product); setNewVariant({ label: '', price: '', weightG: '' }); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                          aria-label="Manage variants"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditing({ productId: product.productId, name: product.name, price: product.price ?? 0, unit: product.unit ?? 'each', sensitivity: product.sensitivity })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(product.productId, product.name)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Desktop grid (hidden on mobile) ── */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-[1fr_80px_110px_160px_90px_60px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide">
              <span>Product</span>
              <span className="text-right">Price</span>
              <span>Unit</span>
              <span>Sensitivity</span>
              <span>Available</span>
              <span></span>
            </div>

            {products.filter(Boolean).map((product: any, idx: number) => {
              const isEditing = editing?.productId === product.productId;
              const editingState = isEditing ? editing! : null;
              const sensitivityLabel = SENSITIVITY_OPTIONS.find(o => o.value === product.sensitivity)?.label ?? product.sensitivity;
              const available = product.available !== false;

              return (
                <div
                  key={product.productId}
                  className={`grid grid-cols-[1fr_80px_110px_160px_90px_60px] gap-3 items-center px-4 py-3 ${
                    idx < products.length - 1 ? 'border-b border-gray-100' : ''
                  } ${isEditing ? 'bg-primary-50' : 'hover:bg-gray-50'} transition-colors`}
                >
                  <div className="min-w-0">
                    {isEditing ? (
                      <input
                        value={editingState!.name}
                        onChange={e => setEditing(prev => prev && { ...prev, name: e.target.value })}
                        className="w-full text-sm font-semibold bg-white border border-primary-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.productId}</p>
                      </>
                    )}
                  </div>

                  <div className="text-right">
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">£</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={(editingState!.price / 100).toFixed(2)}
                          onChange={e => setEditing(prev => prev && { ...prev, price: Math.round(Number(e.target.value) * 100) })}
                          className="w-full text-sm text-right bg-white border border-primary-300 rounded-lg pl-5 pr-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-gray-700">
                        {product.price != null ? formatPrice(product.price) : '—'}
                      </span>
                    )}
                  </div>

                  <div>
                    {isEditing ? (
                      <select
                        value={editingState!.unit}
                        onChange={e => setEditing(prev => prev && { ...prev, unit: e.target.value })}
                        className="w-full text-sm bg-white border border-primary-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      >
                        {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-600">
                        {UNIT_OPTIONS.find(o => o.value === product.unit)?.label ?? product.unit ?? '—'}
                      </span>
                    )}
                  </div>

                  <div>
                    {isEditing ? (
                      <select
                        value={editingState!.sensitivity}
                        onChange={e => setEditing(prev => prev && { ...prev, sensitivity: e.target.value })}
                        className="w-full text-sm bg-white border border-primary-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      >
                        {SENSITIVITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-600">{sensitivityLabel}</span>
                    )}
                  </div>

                  <div>
                    <button
                      onClick={() => updateMutation({ productId: product.productId, available: !available })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {available ? 'In Stock' : 'Off'}
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                      <>
                        <button onClick={handleSave} disabled={saving} className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50" aria-label="Save">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditing(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" aria-label="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setVariantManager(product); setNewVariant({ label: '', price: '', weightG: '' }); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors" aria-label="Manage variants" title="Manage variants">
                          <Layers className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditing({ productId: product.productId, name: product.name, price: product.price ?? 0, unit: product.unit ?? 'each', sensitivity: product.sensitivity })} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" aria-label="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleRemove(product.productId, product.name)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors" aria-label="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        Sensitivity and variant weights are used to calculate the bag plan on each order.
      </p>

      {/* Variant Manager Modal */}
      {variantManager && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setVariantManager(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">{variantManager.name}</h2>
                <p className="text-xs text-gray-500">Manage size / quantity variants</p>
              </div>
              <button onClick={() => setVariantManager(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing variants */}
            {(variantManager.variants ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No variants yet</p>
            ) : (
              <div className="space-y-2 mb-4">
                {(variantManager.variants ?? []).map((v: any) => (
                  <div key={v.label} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{v.label}</span>
                      <span className="text-xs text-gray-500 ml-2">£{(v.price / 100).toFixed(2)} · {v.weightG}g</span>
                    </div>
                    <button onClick={() => handleRemoveVariant(v.label)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add variant form */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Add variant</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="col-span-3">
                  <input
                    placeholder="Label (e.g. 500g, 1kg, 6 pack)"
                    value={newVariant.label}
                    onChange={e => {
                      const label = e.target.value;
                      const guessed = guessWeightFromLabel(label);
                      setNewVariant(p => ({ ...p, label, weightG: guessed || p.weightG }));
                    }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">£</span>
                  <input
                    type="number" min={0} step={0.01} placeholder="Price"
                    value={newVariant.price}
                    onChange={e => setNewVariant(p => ({ ...p, price: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg pl-5 pr-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div className="relative col-span-2">
                  <input
                    type="number" min={1} placeholder="Weight (g)"
                    value={newVariant.weightG}
                    onChange={e => setNewVariant(p => ({ ...p, weightG: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>
              <button
                onClick={handleAddVariant}
                disabled={!newVariant.label || !newVariant.price || !newVariant.weightG}
                className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-colors"
              >
                Add variant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
