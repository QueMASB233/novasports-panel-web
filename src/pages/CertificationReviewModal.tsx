import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { coachesApi } from '@/api/endpoints';
import { Modal } from '@/ui/Modal';
import { IconCheck, IconX } from '@/ui/Icons';
import { useToast } from '@/ui/Toast';
import type { CoachCertification } from '@/types';
import { CertificationStatusBadge, CoachCell, ModerationBadge, formatDate } from './CoachCell';

const REASON_SUGGESTIONS = [
  'La imagen no se lee bien',
  'No es un certificado de entrenador',
  'El certificado no está a nombre del coach',
  'Contenido no permitido',
  'El nombre no corresponde al certificado',
];

export function CertificationReviewModal({
  certification, onClose,
}: {
  certification: CoachCertification | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setRejecting(false);
    setReason('');
  }, [certification?.id]);

  const review = useMutation({
    mutationFn: (body: { action: 'approve' | 'reject'; reason?: string }) =>
      coachesApi.reviewCertification(certification!.id, body),
    onSuccess: (_d, body) => {
      toast.success(body.action === 'approve' ? 'Certificado aprobado' : 'Certificado rechazado');
      qc.invalidateQueries({ queryKey: ['coach-certifications'] });
      qc.invalidateQueries({ queryKey: ['coaches-pending'] });
      onClose();
    },
    onError: (e) => toast.error(e),
  });

  const c = certification;
  const trimmed = reason.trim();

  return (
    <Modal
      open={!!c}
      onClose={onClose}
      title={c ? `Certificado — ${c.coach?.full_name || 'Usuario'}` : ''}
      width="max-w-4xl"
    >
      {c && (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="rounded-md border border-line bg-black overflow-hidden flex items-center justify-center min-h-[240px]">
            {c.image_url ? (
              <a href={c.image_url} target="_blank" rel="noreferrer" title="Abrir en una pestaña nueva">
                <img
                  src={c.image_url}
                  alt={c.title}
                  className="max-h-[70vh] max-w-full object-contain"
                />
              </a>
            ) : (
              <span className="text-white/50 text-sm">No se pudo cargar la imagen.</span>
            )}
          </div>

          <div className="space-y-4 text-[13px]">
            <CoachCell coach={c.coach} />

            <div className="flex flex-wrap items-center gap-2">
              <CertificationStatusBadge certification={c} />
              <ModerationBadge certification={c} />
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
              <dt className="text-white/45">Nombre</dt>
              <dd className="text-white/90 font-medium break-words">{c.title}</dd>
              <dt className="text-white/45">Archivo</dt>
              <dd className="text-white/60 truncate">{c.file_name || '—'}</dd>
              <dt className="text-white/45">Subido</dt>
              <dd className="text-white/80">{formatDate(c.created_at)}</dd>
              {c.reviewed_at && (
                <>
                  <dt className="text-white/45">Revisado</dt>
                  <dd className="text-white/80">
                    {formatDate(c.reviewed_at)}{c.auto_rejected ? ' (automático)' : ''}
                  </dd>
                </>
              )}
              {c.rejection_reason && (
                <>
                  <dt className="text-white/45">Motivo</dt>
                  <dd className="text-red-200">{c.rejection_reason}</dd>
                </>
              )}
            </dl>

            {c.moderation.flags.length > 0 && (
              <div>
                <div className="label">Alertas de Google Vision</div>
                <ul className="space-y-1">
                  {c.moderation.flags.map((f) => (
                    <li key={f.category} className="flex justify-between gap-2 text-[12px]">
                      <span className="text-white/80">{f.category_label}</span>
                      <span className="text-amber-200">{f.likelihood_label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="label">Texto detectado en la imagen</div>
              {c.moderation_text ? (
                <pre className="whitespace-pre-wrap break-words text-[12px] text-white/75 bg-white/[.03] border border-line rounded-md p-2.5 max-h-48 overflow-auto font-sans">
                  {c.moderation_text}
                </pre>
              ) : (
                <div className="text-[12px] text-white/45">Sin texto detectado.</div>
              )}
            </div>

            {rejecting ? (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (trimmed.length >= 3) review.mutate({ action: 'reject', reason: trimmed });
                }}
              >
                <label className="label" htmlFor="cert-reason">Motivo del rechazo (lo verá el coach)</label>
                <div className="flex flex-wrap gap-1.5">
                  {REASON_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="btn !py-1 !px-2 text-[11px]"
                      onClick={() => setReason(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <textarea
                  id="cert-reason"
                  className="input min-h-[72px] text-sm"
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn" onClick={() => setRejecting(false)}>
                    Volver
                  </button>
                  <button
                    className="btn-danger"
                    disabled={trimmed.length < 3 || review.isPending}
                  >
                    {review.isPending ? 'Guardando…' : 'Rechazar certificado'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end gap-2 pt-1">
                {c.can_reject && (
                  <button
                    className="btn-danger"
                    onClick={() => setRejecting(true)}
                    disabled={review.isPending}
                  >
                    <IconX size={13} /> Rechazar
                  </button>
                )}
                {c.can_approve && (
                  <button
                    className="btn-primary"
                    onClick={() => review.mutate({ action: 'approve' })}
                    disabled={review.isPending}
                  >
                    <IconCheck size={13} /> {review.isPending ? 'Guardando…' : 'Aprobar'}
                  </button>
                )}
              </div>
            )}
            {c.can_approve && !rejecting && (
              <p className="text-[11px] text-white/45 text-right">
                Al aprobarlo suma al perfil del coach, se muestra en su carta con este nombre y le llega un aviso.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
