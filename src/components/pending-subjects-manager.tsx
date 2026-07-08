"use client";

import { useMemo, useState, useTransition } from "react";
import {
    ArrowLeft,
    ArrowRight,
    ArrowUpDown,
    Building2,
    CalendarDays,
    Plus,
    Search,
    Trash2,
    X
} from "lucide-react";
import { requestGroupClassroomAction } from "@/app/actions";

type Career = {
    id: number;
    acronym: string;
    name: string;
};

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type SubjectRequest = {
    id: number;
    dayOfWeek: string;
    status: RequestStatus;
    classroom: {
        building: string;
        floor: number;
        number: string;
    };
    schoolHour: {
        code: string;
        startTime: string;
        endTime: string;
    };
};

type Subject = {
    id: number;
    code: string;
    name: string;
    type: string;
    semester: number;
    careers: Career[];
    groupSubjects: {
        id: number;
        group: {
            id: number;
            code: string;
            semester: number;
            students: number;
            career: Career;
        };
        requests: SubjectRequest[];
    }[];
};

type Group = {
    id: number;
    code: string;
    semester: number;
    students: number;
    career: Career;
};

type Classroom = {
    id: number;
    building: string;
    floor: number;
    number: string;
    capacity: number;
};

type SchoolHour = {
    id: number;
    code: string;
    startTime: string;
    endTime: string;
};

type DayOption = {
    value: string;
    label: string;
};

type ActionResult = {
    ok: boolean;
    error?: string;
    message?: string;
};

type ScheduleItem = {
    dayOfWeek: string;
    schoolHourId: string;
};

type RequestForm = {
    subjectId: number;
    groupId: string;
    classroomId: string;
    building: string;
    floor: string;
    dayOfWeek: string;
    schoolHourId: string;
    schedules: ScheduleItem[];
};
const emptyForm: RequestForm = {
    subjectId: 0,
    groupId: "1",
    classroomId: "",
    building: "",
    floor: "",
    dayOfWeek: "",
    schoolHourId: "",
    schedules: []
};

const dayLabel: Record<string, string> = {
    MONDAY: "Lunes",
    TUESDAY: "Martes",
    WEDNESDAY: "Miércoles",
    THURSDAY: "Jueves",
    FRIDAY: "Viernes",
    SATURDAY: "Sábado"
};

function requestStatusLabel(status: string) {
    if (status === "PENDING") return "En revisión";
    if (status === "APPROVED") return "Aprobada";
    if (status === "REJECTED") return "Rechazada";
    return status;
}

export function PendingSubjectsManager({
    subjects,
    groups,
    classrooms,
    schoolHours,
    days
}: {
    subjects: Subject[];
    groups: Group[];
    classrooms: Classroom[];
    schoolHours: SchoolHour[];
    days: DayOption[];
}) {
    const [search, setSearch] = useState("");
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [form, setForm] = useState<RequestForm>(emptyForm);
    const [notice, setNotice] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [pending, startTransition] = useTransition();

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();

        return subjects.filter((subject) => {
            if (!term) return true;

            const careerText = subject.careers
                .map((career) => `${career.acronym} ${career.name}`)
                .join(" ");

            return [
                subject.code,
                subject.name,
                subject.type,
                careerText,
                `${subject.semester}to`
            ]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [subjects, search]);

    const availableGroups = useMemo(() => {
        if (!selectedSubject) return [];
        return groups.filter((group) => group.semester === selectedSubject.semester);
    }, [groups, selectedSubject]);

    const selectedClassroom = useMemo(() => {
        return classrooms.find((classroom) => String(classroom.id) === form.classroomId);
    }, [classrooms, form.classroomId]);

    const openRequestModal = (subject: Subject) => {
        setNotice(null);
        setSelectedSubject(subject);
        setForm({
            ...emptyForm,
            subjectId: subject.id,
            groupId: "1"
        });
    };

    const closeModal = () => {
        if (pending) return;
        setSelectedSubject(null);
        setForm(emptyForm);
        setNotice(null);
    };

    const addSchedule = () => {
        if (!form.dayOfWeek || !form.schoolHourId) {
            setNotice({
                type: "error",
                text: "Selecciona día y hora escolar antes de agregar el horario."
            });
            return;
        }

        const alreadyExists = form.schedules.some(
            (item) =>
                item.dayOfWeek === form.dayOfWeek &&
                item.schoolHourId === form.schoolHourId
        );

        if (alreadyExists) {
            setNotice({
                type: "error",
                text: "Ese horario ya fue agregado."
            });
            return;
        }

        setNotice(null);

        setForm((current) => ({
            ...current,
            schedules: [
                ...current.schedules,
                {
                    dayOfWeek: current.dayOfWeek,
                    schoolHourId: current.schoolHourId
                }
            ],
            dayOfWeek: "",
            schoolHourId: ""
        }));
    };

    const removeSchedule = (index: number) => {
        setForm((current) => ({
            ...current,
            schedules: current.schedules.filter((_, itemIndex) => itemIndex !== index)
        }));
    };

    const submitRequest = () => {
        setNotice(null);

        if (!form.groupId) {
            setNotice({
                type: "error",
                text: "Selecciona un grupo."
            });
            return;
        }

        if (!form.classroomId) {
            setNotice({
                type: "error",
                text: "Selecciona un salón."
            });
            return;
        }

        const validSchedules = form.schedules.filter(
            (schedule) => schedule.dayOfWeek && schedule.schoolHourId
        );

        if (validSchedules.length === 0) {
            setNotice({
                type: "error",
                text: "Agrega al menos un horario antes de enviar la solicitud."
            });
            return;
        }

        startTransition(async () => {
            const formData = new FormData();

            formData.set("subjectId", String(form.subjectId));
            formData.set("groupId", form.groupId);
            formData.set("classroomId", form.classroomId);
            formData.set("schedules", JSON.stringify(validSchedules));

            const result = (await requestGroupClassroomAction(formData)) as
                | ActionResult
                | undefined;

            if (!result || !result.ok) {
                setNotice({
                    type: "error",
                    text: result?.error || "No se pudo enviar la solicitud."
                });
                return;
            }

            setNotice({
                type: "success",
                text: result.message || "Solicitud enviada correctamente."
            });

            setTimeout(() => {
                closeModal();
            }, 700);
        });
    };

    return (
        <div className="content-wrap">
            {notice && !selectedSubject ? (
                <div className={`action-toast ${notice.type}`}>
                    <span>{notice.text}</span>
                    <button
                        type="button"
                        onClick={() => setNotice(null)}
                        aria-label="Cerrar mensaje"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : null}

            <section className="table-card coordinator-card">
                <div className="table-heading">
                    <div>
                        <h2>Materias por coordinar</h2>
                        <p>Selecciona una materia y solicita salón por día y hora escolar.</p>
                    </div>

                    <label className="search-box">
                        <Search size={15} />
                        <input
                            placeholder="Buscar materia, clave, carrera o tipo..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                </div>

                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    <ArrowUpDown size={12} /> Clave
                                </th>
                                <th>
                                    <ArrowUpDown size={12} /> Materia
                                </th>
                                <th>Tipo</th>
                                <th>Carrera</th>
                                <th>
                                    <ArrowUpDown size={12} /> Semestre
                                </th>
                                <th>Solicitudes</th>
                                <th>Nueva solicitud</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="empty-row">
                                        No se encontraron materias para tu carrera.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((subject) => {
                                    const requests = subject.groupSubjects.flatMap((groupSubject) =>
                                        groupSubject.requests.map((request) => ({
                                            ...request,
                                            groupCode: groupSubject.group.code
                                        }))
                                    );

                                    return (
                                        <tr key={subject.id}>
                                            <td>{subject.code}</td>
                                            <td>{subject.name}</td>
                                            <td>{subject.type}</td>
                                            <td>
                                                <div className="pill-list">
                                                    {subject.careers.map((career) => (
                                                        <span key={career.id} className="career-pill">
                                                            {career.acronym}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td>{subject.semester}to</td>
                                            <td>
                                                <div className="schedule-list">
                                                    {requests.length === 0 ? (
                                                        <span className="muted">Sin horario solicitado</span>
                                                    ) : (
                                                        requests.map((request) => (
                                                            <span key={request.id} className="schedule-chip">
                                                                Grupo {request.groupCode} ·{" "}
                                                                {dayLabel[request.dayOfWeek]} ·{" "}
                                                                {request.schoolHour.code} · Ed.{" "}
                                                                {request.classroom.building} ·{" "}
                                                                {request.classroom.number}
                                                                <b className={`status ${request.status.toLowerCase()}`}>
                                                                    {requestStatusLabel(request.status)}
                                                                </b>
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="request-modal-button"
                                                    onClick={() => openRequestModal(subject)}
                                                >
                                                    <Plus size={15} />
                                                    Solicitar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pagination">
                    <button type="button">
                        <ArrowLeft size={18} />
                    </button>
                    <button type="button">
                        <ArrowRight size={18} />
                    </button>
                </div>
            </section>

            {selectedSubject ? (
                <div
                    className="modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !pending) {
                            closeModal();
                        }
                    }}
                >
                    <div
                        className="modal request-modal"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <button type="button" className="modal-close" onClick={closeModal}>
                            <X size={20} />
                        </button>

                        <div className="request-modal-header">
                            <div className="request-modal-icon">
                                <Building2 size={28} />
                            </div>

                            <div>
                                <h2>Nueva solicitud de salón</h2>
                                <p>Capture la información del salón y sus horarios solicitados</p>
                            </div>
                        </div>

                        {notice?.type === "error" ? (
                            <div className="modal-error">{notice.text}</div>
                        ) : null}

                        {notice?.type === "success" ? (
                            <div className="modal-success">{notice.text}</div>
                        ) : null}

                        <div className="request-subject-summary">
                            <strong>{selectedSubject.code}</strong>
                            <span>{selectedSubject.name}</span>
                            <em>{selectedSubject.type}</em>
                        </div>

                        <div className="request-form-grid request-form-grid-3">
                            <div className="form-field">
                                <label>Grupo</label>
                                <input value="1" disabled />
                                <input type="hidden" value={form.groupId} />
                            </div>

                            <div className="form-field">
                                <label>Salón</label>
                                <select
                                    value={form.classroomId}
                                    onChange={(event) => {
                                        const classroom = classrooms.find(
                                            (item) => String(item.id) === event.target.value
                                        );

                                        setForm({
                                            ...form,
                                            classroomId: event.target.value,
                                            building: classroom?.building || "",
                                            floor: classroom ? String(classroom.floor) : "",
                                        });
                                    }}
                                >
                                    <option value="">Seleccione salón</option>
                                    {classrooms.map((classroom) => (
                                        <option key={classroom.id} value={classroom.id}>
                                            {classroom.number} · Capacidad {classroom.capacity}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field">
                                <label>Edificio</label>
                                <input
                                    value={form.building ? `Edificio ${form.building}` : ""}
                                    placeholder="Automático"
                                    disabled
                                />
                            </div>

                            <div className="form-field">
                                <label>Piso</label>
                                <input value={form.floor || ""} placeholder="Automático" disabled />
                            </div>

                            <div className="form-field">
                                <label>Día</label>
                                <select
                                    value={form.dayOfWeek}
                                    onChange={(event) =>
                                        setForm({ ...form, dayOfWeek: event.target.value })
                                    }
                                >
                                    <option value="">Día</option>
                                    {days.map((day) => (
                                        <option key={day.value} value={day.value}>
                                            {day.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field request-hour-field">
                                <label>Hora escolar</label>
                                <select
                                    value={form.schoolHourId}
                                    onChange={(event) =>
                                        setForm({ ...form, schoolHourId: event.target.value })
                                    }
                                >
                                    <option value="">Hora</option>
                                    {schoolHours.map((hour) => (
                                        <option key={hour.id} value={hour.id}>
                                            {hour.code} · {hour.startTime} - {hour.endTime}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="request-divider" />

                        <div className="added-schedules-header">
                            <h3>Horarios agregados</h3>

                            <button
                                type="button"
                                className="add-schedule-button"
                                onClick={addSchedule}
                            >
                                <Plus size={16} />
                                Agregar otro horario
                            </button>
                        </div>

                        <div className="added-schedules-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Día</th>
                                        <th>Hora inicio</th>
                                        <th>Hora fin</th>
                                        <th>Clave</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {form.schedules.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="empty-row">
                                                Aún no has agregado horarios.
                                            </td>
                                        </tr>
                                    ) : (
                                        form.schedules.map((item, index) => {
                                            const hour = schoolHours.find(
                                                (schoolHour) =>
                                                    String(schoolHour.id) === item.schoolHourId
                                            );

                                            return (
                                                <tr key={`${item.dayOfWeek}-${item.schoolHourId}`}>
                                                    <td>
                                                        <span className="schedule-day-cell">
                                                            <CalendarDays size={16} />
                                                            {dayLabel[item.dayOfWeek]}
                                                        </span>
                                                    </td>
                                                    <td>{hour?.startTime || "—"}</td>
                                                    <td>{hour?.endTime || "—"}</td>
                                                    <td>{hour?.code || "—"}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="schedule-delete"
                                                            onClick={() => removeSchedule(index)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="request-modal-actions">
                            <button
                                type="button"
                                className="request-cancel"
                                disabled={pending}
                                onClick={closeModal}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="request-save"
                                disabled={pending}
                                onClick={submitRequest}
                            >
                                {pending ? "Enviando..." : "Enviar solicitud"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}