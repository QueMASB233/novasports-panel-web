import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/ui/Modal';
import { useMeta } from '@/hooks/useMeta';
import { rankingsApi, type CreateRankingBody } from '@/api/endpoints';
import type { RankingType, RankingCreateField } from '@/types';
import { useToast } from '@/ui/Toast';
import { useNavigate } from 'react-router-dom';

type Props = { open: boolean; onClose: () => void };

// Fallback si el backend no manda create_ranking_bodies (highly defensive)
const DEFAULT_FIELDS: Record<string, RankingCreateField[]> = {
  national: ['display_name', 'country', 'age_bracket'],
  country_open: ['display_name', 'country'],
  fip: ['display_name'],
  fip_promises: ['display_name', 'fip_sub_category'],
};

export function CreateRankingModal({ open, onClose }: Props) {
  const meta = useMeta();
  const qc = useQueryClient();
  const nav = useNavigate();
  const toast = useToast();

  const types = meta.data?.ranking_types || [];
  const [type, setType] = useState<RankingType | ''>('');
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('');
  const [ageBracket, setAgeBracket] = useState('');
  const [fipSub, setFipSub] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      setType((types[0]?.id as RankingType | undefined) || '');
      setDisplayName('');
      setCountry('');
      setAgeBracket('');
      setFipSub('');
      setIsActive(true);
    }
  }, [open, types]);

  const requiredFields: RankingCreateField[] = useMemo(() => {
    if (!type) return [];
    const fromMeta = meta.data?.create_ranking_bodies?.[type]?.required_fields;
    return fromMeta || DEFAULT_FIELDS[type] || ['display_name'];
  }, [type, meta.data]);

  const create = useMutation({
    mutationFn: (body: CreateRankingBody) => rankingsApi.create(body),
    onSuccess: ({ ranking }) => {
      toast.success('Ranking creado');
      qc.invalidateQueries({ queryKey: ['rankings'] });
      onClose();
      nav(`/rankings/${ranking.id}`);
    },
    onError: (e) => toast.error(e),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return toast.push('error', 'Selecciona el tipo');
    if (!displayName.trim()) return toast.push('error', 'Falta el nombre');

    const body: CreateRankingBody = {
      ranking_type: type,
      display_name: displayName.trim(),
      is_active: isActive,
    };

    if (requiredFields.includes('country')) {
      if (!country) return toast.push('error', 'Selecciona país');
      body.country = country;
    }
    if (requiredFields.includes('age_bracket')) {
      if (!ageBracket) return toast.push('error', 'Selecciona categoría de edad');
      body.age_bracket = ageBracket;
    }
    if (requiredFields.includes('fip_sub_category')) {
      if (!fipSub) return toast.push('error', 'Selecciona SUB');
      body.fip_sub_category = fipSub;
    }

    create.mutate(body);
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo ranking">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Tipo</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {types.map(t => (
              <button
                key={t.id} type="button"
                onClick={() => setType(t.id as RankingType)}
                className={
                  'rounded-lg border px-3 py-2 text-[13px] transition-colors ' +
                  'duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
                  (type === t.id
                    ? 'border-white/40 bg-white/[.08] text-white'
                    : 'border-line bg-night-800 text-white/70 hover:bg-night-700')
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Nombre visible</label>
          <input
            className="input"
            placeholder="p.ej. Open Ecuador 2026"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {requiredFields.includes('country') && (
          <div>
            <label className="label">País</label>
            <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Selecciona…</option>
              {meta.data?.countries.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {requiredFields.includes('age_bracket') && (
          <div>
            <label className="label">Categoría de edad</label>
            <select className="input" value={ageBracket} onChange={(e) => setAgeBracket(e.target.value)}>
              <option value="">Selecciona…</option>
              {meta.data?.age_brackets.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>
        )}

        {requiredFields.includes('fip_sub_category') && (
          <div>
            <label className="label">Categoría SUB</label>
            <select className="input" value={fipSub} onChange={(e) => setFipSub(e.target.value)}>
              <option value="">Selecciona…</option>
              {meta.data?.fip_sub_categories.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 text-[13px] text-white/80">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Activo al crear
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Creando…' : 'Crear ranking'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
