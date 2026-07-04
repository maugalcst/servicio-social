"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { approveRequestAction, rejectRequestAction } from "@/app/actions";

export function RequestActions({ requestId, coordinator }: { requestId: number; coordinator: string }) {
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);

  return (
    <>
      <div className="row-actions">
        <button className="approve-icon" onClick={() => setDialog("approve")} aria-label="Aprobar"><Check size={16} /></button>
        <button className="reject-icon" onClick={() => setDialog("reject")} aria-label="Rechazar"><X size={16} /></button>
      </div>
      {dialog && (
        <div className="modal-backdrop" onMouseDown={() => setDialog(null)}>
          <div className={`modal ${dialog}`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setDialog(null)}>×</button>
            {dialog === "approve" ? (
              <>
                <h2>Aceptar petición</h2>
                <p>¿Estás seguro de aceptar esta petición?</p>
                <strong className="request-owner">Solicitud de {coordinator}</strong>
                <div className="modal-buttons">
                  <form action={approveRequestAction}><input type="hidden" name="requestId" value={requestId} /><button className="primary" type="submit">Aceptar petición</button></form>
                  <button onClick={() => setDialog(null)}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <h2>Rechazar petición</h2>
                <p>Explica el motivo de rechazo de la petición.</p>
                <form action={rejectRequestAction} className="reject-form">
                  <input type="hidden" name="requestId" value={requestId} />
                  <textarea name="reason" minLength={5} required placeholder="Esta petición fue rechazada porque..." />
                  <button type="submit">Rechazar petición</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
