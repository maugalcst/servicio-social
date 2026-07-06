"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, ArrowUpDown, CheckCircle2, Pencil, Plus, Trash2, X } from "lucide-react";
import { deletePersonAction, savePersonAction } from "@/app/actions";

type Career = {
    id: number;
    acronym: string;
    name: string;
};

type Person = {
    id: number;
    name: string;
    email: string;
    role: "ADMIN" | "COORDINATOR" | "TEACHER";
    careerId: number | null;
    career: Career | null;
};

type PersonForm = {
    id: number;
    name: string;
    email: string;
    role: Person["role"];
    careerId: number;
    password: string;
};

type ActionResult = {
    ok: boolean;
    error?: string;
    message?: string;
};

type Notice = {
    type: "success" | "error";
    text: string;
};

const roleLabel: Record<Person["role"], string> = {
    ADMIN: "Administrador",
    COORDINATOR: "Coordinador",
    TEACHER: "Ayudante"
};

const emptyForm: PersonForm = {
    id: 0,
    name: "",
    email: "",
    role: "TEACHER",
    careerId: 0,
    password: ""
};

export function PersonnelManager({
    people,
    careers,
    currentUserId
}: {
    people: Person[];
    careers: Career[];
    currentUserId: number;
}) {
    const [mode, setMode] = useState<"add" | "edit" | "delete" | null>(null);
    const [form, setForm] = useState<PersonForm>(emptyForm);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [pending, startTransition] = useTransition();

    const selected = useMemo(
        () => people.find((person) => person.id === form.id),
        [people, form.id]
    );

    const openAdd = () => {
        setNotice(null);
        setForm({ ...emptyForm, careerId: careers[0]?.id || 0 });
        setMode("add");
    };

    const openEdit = (person: Person) => {
        setNotice(null);
        setForm({
            id: person.id,
            name: person.name,
            email: person.email,
            role: person.role,
            careerId: person.careerId || careers[0]?.id || 0,
            password: ""
        });
        setMode("edit");
    };

    const openDelete = (person: Person) => {
        setNotice(null);
        setForm({ ...emptyForm, id: person.id });
        setMode("delete");
    };

    const closeModal = () => {
        if (pending) return;
        setMode(null);
        setNotice(null);
    };

    const showResult = (result: ActionResult | undefined, successFallback: string) => {
        if (!result) {
            setNotice({ type: "error", text: "No se recibió respuesta del servidor." });
            return false;
        }

        if (!result.ok) {
            setNotice({
                type: "error",
                text: result.error || "Ocurrió un error inesperado."
            });
            return false;
        }

        setNotice({
            type: "success",
            text: result.message || successFallback
        });
        return true;
    };

    const submit = () => {
        setNotice(null);

        startTransition(async () => {
            const formData = new FormData();

            if (form.id) formData.set("id", String(form.id));
            formData.set("name", form.name);
            formData.set("email", form.email);
            formData.set("role", form.role);
            formData.set("careerId", String(form.careerId));
            formData.set("password", form.password);

            const result = (await savePersonAction(formData)) as ActionResult;
            const success = showResult(
                result,
                form.id ? "Usuario actualizado correctamente." : "Usuario creado correctamente."
            );

            if (success) {
                setTimeout(() => {
                    setMode(null);
                    setNotice(null);
                }, 700);
            }
        });
    };

    const remove = () => {
        setNotice(null);

        startTransition(async () => {
            const formData = new FormData();
            formData.set("id", String(form.id));

            const result = (await deletePersonAction(formData)) as ActionResult;
            const success = showResult(result, "Usuario eliminado correctamente.");

            if (success) {
                setTimeout(() => {
                    setMode(null);
                    setNotice(null);
                }, 700);
            }
        });
    };

    return (
        <div className="crud-page">
            {notice && !mode ? (
                <FloatingNotice notice={notice} onClose={() => setNotice(null)} />
            ) : null}

            <div className="crud-toolbar">
                <button className="round-add" onClick={openAdd} aria-label="Agregar personal">
                    <Plus />
                </button>
            </div>

            <section className="table-card crud-card">
                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    <ArrowUpDown size={12} /> Nombre
                                </th>
                                <th>
                                    <ArrowUpDown size={12} /> Área
                                </th>
                                <th>
                                    <ArrowUpDown size={12} /> Rol
                                </th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {people.map((person) => (
                                <tr key={person.id}>
                                    <td>{person.name}</td>
                                    <td>
                                        <span className="career-pill wide">
                                            {person.career?.acronym || "—"}
                                        </span>
                                    </td>
                                    <td>{roleLabel[person.role]}</td>
                                    <td>
                                        <div className="crud-actions">
                                            <button
                                                className="edit-btn"
                                                onClick={() => openEdit(person)}
                                                aria-label={`Editar ${person.name}`}
                                            >
                                                <Pencil size={17} />
                                            </button>
                                            <button
                                                className="delete-btn"
                                                disabled={person.id === currentUserId}
                                                onClick={() => openDelete(person)}
                                                aria-label={`Eliminar ${person.name}`}
                                                title={
                                                    person.id === currentUserId
                                                        ? "No puedes eliminar tu propia cuenta"
                                                        : "Eliminar usuario"
                                                }
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {mode ? (
                <div className="modal-backdrop">
                    <div className={`modal crud-modal ${mode === "delete" ? "confirm-modal" : ""}`}>
                        {notice ? <InlineNotice notice={notice} onClose={() => setNotice(null)} /> : null}

                        {mode === "delete" ? (
                            <>
                                <h2>Eliminar personal</h2>
                                <p>¿Estas seguro de eliminar a este usuario?</p>
                                <strong className="confirm-name">Usuario: {selected?.name}</strong>

                                <div className="confirm-actions">
                                    <button className="danger-wide" disabled={pending} onClick={remove}>
                                        {pending ? "Eliminando..." : "Eliminar usuario"}
                                    </button>
                                    <button disabled={pending} onClick={closeModal}>
                                        Cancelar
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2>{mode === "add" ? "Agregar usuario" : "Editar"}</h2>

                                <div className="crud-form">
                                    <input
                                        placeholder="NOMBRE"
                                        value={form.name}
                                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                                    />

                                    <select
                                        value={form.careerId}
                                        onChange={(event) =>
                                            setForm({ ...form, careerId: Number(event.target.value) })
                                        }
                                    >
                                        {careers.length === 0 ? (
                                            <option value={0}>No hay áreas registradas</option>
                                        ) : null}

                                        {careers.map((career) => (
                                            <option key={career.id} value={career.id}>
                                                {career.acronym} — {career.name}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={form.role}
                                        onChange={(event) =>
                                            setForm({ ...form, role: event.target.value as Person["role"] })
                                        }
                                    >
                                        <option value="TEACHER">Ayudante</option>
                                        <option value="COORDINATOR">Coordinador</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>

                                    <input
                                        type="email"
                                        placeholder="CORREO"
                                        value={form.email}
                                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                                    />

                                    <input
                                        type="password"
                                        placeholder={
                                            mode === "edit" ? "NUEVA CONTRASEÑA (OPCIONAL)" : "CONTRASEÑA"
                                        }
                                        value={form.password}
                                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                                    />
                                </div>

                                <div className="form-actions">
                                    <button className="cancel-red" disabled={pending} onClick={closeModal}>
                                        Cancelar
                                    </button>
                                    <button className="accept-green" disabled={pending} onClick={submit}>
                                        {pending ? "Guardando..." : "Aceptar"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function InlineNotice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
    const isError = notice.type === "error";

    return (
        <div
            role="alert"
            style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 16,
                padding: "11px 12px",
                borderRadius: 6,
                border: `1px solid ${isError ? "#f3a1a6" : "#a7dbb4"}`,
                background: isError ? "#fff1f2" : "#effaf1",
                color: isError ? "#9f1d25" : "#145a2d",
                fontSize: 13
            }}
        >
            {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span style={{ flex: 1 }}>{notice.text}</span>
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar mensaje"
                style={{
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    padding: 0
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
}

function FloatingNotice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
    const isError = notice.type === "error";

    return (
        <div
            role="alert"
            style={{
                position: "fixed",
                right: 20,
                top: 20,
                zIndex: 50,
                width: "min(380px, calc(100vw - 40px))",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 8,
                boxShadow: "0 16px 40px rgba(0,0,0,.18)",
                border: `1px solid ${isError ? "#f3a1a6" : "#a7dbb4"}`,
                background: isError ? "#fff1f2" : "#effaf1",
                color: isError ? "#9f1d25" : "#145a2d",
                fontSize: 13
            }}
        >
            {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span style={{ flex: 1 }}>{notice.text}</span>
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar mensaje"
                style={{
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    padding: 0
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
}
